import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/db";
import { NativeAuthorizationSchema, NativeExchangeSchema, NativeRefreshSchema, NATIVE_AUTH_CALLBACK } from "@/lib/native-auth-contract";
import type { Prisma } from "@prisma/client";
import { z } from "zod";

const GRANT_LIFETIME = 2 * 60 * 1000;
const SESSION_LIFETIME = 10 * 60 * 1000;
const REFRESH_LIFETIME = 30 * 24 * 60 * 60 * 1000;
const GrantPayload = z.object({ userId: z.string().min(1), challenge: z.string().regex(/^[A-Za-z0-9_-]{43}$/) });
const digest = (value: string) => createHash("sha256").update(value).digest("hex");
export const pkceChallenge = (verifier: string) => createHash("sha256").update(verifier).digest("base64url");

function sessionKey(authorization: string | null) {
  const match = /^Bearer (lh_native_(?:([A-Za-z0-9_-]{22})\.)?[A-Za-z0-9_-]{43})$/.exec(authorization ?? "");
  return match ? `native-session:${match[2] ? match[2] + ":" : ""}${digest(match[1])}` : null;
}

const RefreshPayload = z.object({ userId: z.string().min(1), used: z.boolean() }).strict();
const familyFromRefresh = (token: string) => token.slice("lh_refresh_".length).split(".")[0];
async function revokeFamily(transaction: Prisma.TransactionClient, family: string) {
  await transaction.session.deleteMany({ where: { sessionToken: { startsWith: `native-session:${family}:` } } });
  await transaction.verificationToken.deleteMany({ where: { identifier: { startsWith: `native-refresh:${family}:` } } });
}
async function issueSession(transaction: Prisma.TransactionClient, userId: string, family: string, refreshExpires: Date) {
  const accessToken = `lh_native_${family}.${randomBytes(32).toString("base64url")}`;
  const refreshToken = `lh_refresh_${family}.${randomBytes(32).toString("base64url")}`;
  const expires = new Date(Math.min(Date.now() + SESSION_LIFETIME, refreshExpires.getTime()));
  await transaction.session.create({ data: { userId, sessionToken: sessionKey(`Bearer ${accessToken}`)!, expires } });
  await transaction.verificationToken.create({ data: {
    token: `native-refresh:${digest(refreshToken)}`,
    identifier: `native-refresh:${family}:${JSON.stringify({ userId, used: false })}`,
    expires: refreshExpires,
  } });
  return { accountId: userId, accessToken, expiresAt: expires.toISOString(), refreshToken, refreshExpiresAt: refreshExpires.toISOString() };
}

// Only the signed-in browser supplies userId. No mobile payload supplies an
// account, role, redirect URL or provider secret. Existing tables are reused;
// raw grants and bearer tokens are never persisted or logged.
export async function createNativeAuthorization(userId: string, input: unknown) {
  const { challenge, state } = NativeAuthorizationSchema.parse(input);
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { status: true } });
  if (user?.status !== "active") return null;
  const code = randomBytes(32).toString("base64url");
  await prisma.verificationToken.create({ data: {
    identifier: `native-grant:${JSON.stringify({ userId, challenge })}`,
    token: `native-grant:${digest(code)}`,
    expires: new Date(Date.now() + GRANT_LIFETIME),
  } });
  const callback = new URL(NATIVE_AUTH_CALLBACK);
  callback.searchParams.set("code", code);
  callback.searchParams.set("state", state);
  return callback.href;
}

export async function exchangeNativeAuthorization(input: unknown) {
  const { code, verifier } = NativeExchangeSchema.parse(input);
  const key = `native-grant:${digest(code)}`;
  return prisma.$transaction(async transaction => {
    const grant = await transaction.verificationToken.findUnique({ where: { token: key } });
    if (!grant || grant.expires.getTime() <= Date.now() || !grant.identifier.startsWith("native-grant:")) return null;
    let payload;
    try { payload = GrantPayload.parse(JSON.parse(grant.identifier.slice("native-grant:".length))); } catch { return null; }
    const actual = Buffer.from(pkceChallenge(verifier));
    const expected = Buffer.from(payload.challenge);
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
    const user = await transaction.user.findUnique({ where: { id: payload.userId }, select: { status: true } });
    if (user?.status !== "active") return null;
    // Conditional consumption prevents concurrent replay. A subsequent failure
    // rolls back the transaction so no code is consumed without a session.
    const consumed = await transaction.verificationToken.deleteMany({ where: { token: key, expires: { gt: new Date() } } });
    if (consumed.count !== 1) return null;
    return issueSession(transaction, payload.userId, randomBytes(16).toString("base64url"), new Date(Date.now() + REFRESH_LIFETIME));
  });
}

// Retain used refresh hashes until absolute expiry. Replaying one invalidates
// the whole device family, including its newest access token.
export async function refreshNativeSession(input: unknown) {
  const { refreshToken } = NativeRefreshSchema.parse(input);
  const family = familyFromRefresh(refreshToken);
  const key = `native-refresh:${digest(refreshToken)}`;
  return prisma.$transaction(async transaction => {
    const row = await transaction.verificationToken.findUnique({ where: { token: key } });
    const prefix = `native-refresh:${family}:`;
    if (!row || !row.identifier.startsWith(prefix)) return null;
    let payload;
    try { payload = RefreshPayload.parse(JSON.parse(row.identifier.slice(prefix.length))); } catch { return null; }
    const user = await transaction.user.findUnique({ where: { id: payload.userId }, select: { status: true } });
    if (payload.used || row.expires.getTime() <= Date.now() || user?.status !== "active") {
      await revokeFamily(transaction, family); return null;
    }
    const consumed = await transaction.verificationToken.updateMany({
      where: { token: key, identifier: row.identifier, expires: { gt: new Date() } },
      data: { identifier: prefix + JSON.stringify({ ...payload, used: true }) },
    });
    if (consumed.count !== 1) { await revokeFamily(transaction, family); return null; }
    await transaction.session.deleteMany({ where: { sessionToken: { startsWith: `native-session:${family}:` } } });
    return issueSession(transaction, payload.userId, family, row.expires);
  });
}

export async function getNativeSessionUserId(authorization: string | null) {
  const key = sessionKey(authorization);
  if (!key) return null;
  const session = await prisma.session.findUnique({ where: { sessionToken: key }, select: { userId: true, expires: true } });
  return session && session.expires.getTime() > Date.now() ? session.userId : null;
}

export async function revokeNativeSession(authorization: string | null, input?: unknown) {
  const refresh = NativeRefreshSchema.safeParse(input);
  if (refresh.success) {
    const token = refresh.data.refreshToken;
    const family = familyFromRefresh(token);
    const row = await prisma.verificationToken.findUnique({ where: { token: `native-refresh:${digest(token)}` } });
    if (row?.identifier.startsWith(`native-refresh:${family}:`)) {
      await prisma.$transaction(transaction => revokeFamily(transaction, family)); return;
    }
  }
  const key = sessionKey(authorization);
  if (!key) return;
  const family = /^Bearer lh_native_([A-Za-z0-9_-]{22})\./.exec(authorization ?? "")?.[1];
  // A family ID is public context, never a revocation credential. Check the
  // hashed access credential, even when expired, before removing its family.
  if (family && await prisma.session.findUnique({ where: { sessionToken: key } })) {
    await prisma.$transaction(transaction => revokeFamily(transaction, family)); return;
  }
  await prisma.session.deleteMany({ where: { sessionToken: key } });
}
