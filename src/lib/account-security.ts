import { createHash, randomBytes, randomInt } from "node:crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { sendSystemEmail, getEmailConfiguration } from "@/lib/email";

const digest = (value: string) => createHash("sha256").update(value).digest("hex");
export async function assertAccountRateLimit(identity: string, purpose: string, maximum = 5, windowMs = 900000) {
  const key = `rate-limit:account:${purpose}:${digest(identity.trim().toLowerCase())}`;
  await prisma.$transaction(async tx => {
    await tx.$queryRaw`WITH locked AS MATERIALIZED (SELECT pg_advisory_xact_lock(hashtext(${key}))) SELECT 1::int AS locked FROM locked`;
    const row = await tx.systemSetting.findUnique({ where: { key } });
    const now = Date.now(); let bucket = { count: 0, resetAt: now + windowMs };
    if (row) { try { const stored = JSON.parse(row.value); if (stored.resetAt > now) bucket = stored; } catch { /* replace invalid counter */ } }
    if (bucket.count >= maximum) throw Object.assign(new Error("Too many attempts. Please try again later."), { status: 429 });
    const value = JSON.stringify({ ...bucket, count: bucket.count + 1 });
    await tx.systemSetting.upsert({ where: { key }, create: { key, value }, update: { value } });
  });
}
export function publicAccountOrigin() {
  const value = process.env.APP_PUBLIC_URL || process.env.AUTH_URL || process.env.NEXTAUTH_URL;
  if (!value) throw Object.assign(new Error("Account email service is not configured."), { status: 503 });
  const url = new URL(value);
  if (url.protocol !== "https:" && !(process.env.NODE_ENV !== "production" && ["localhost", "127.0.0.1"].includes(url.hostname))) throw Object.assign(new Error("Configure an HTTPS public application URL."), { status: 503 });
  return url.origin;
}
export async function requestAccountEmail(email: string, purpose: "reset" | "verify" | "delete") {
  await assertAccountRateLimit(email, purpose);
  const origin = publicAccountOrigin();
  // Fail uniformly if delivery configuration is missing, regardless of address.
  await getEmailConfiguration();
  const user = await prisma.user.findFirst({ where: { email: { equals: email, mode: "insensitive" }, status: "active" }, select: { id: true, email: true } });
  if (!user) return;
  const token = randomBytes(32).toString("base64url");
  const key = `${purpose}:${digest(token)}`;
  await prisma.verificationToken.create({ data: { identifier: `account-${purpose}:${user.id}`, token: key, expires: new Date(Date.now() + 30 * 60000) } });
  const url = new URL("/account-recovery", origin); url.searchParams.set("token", token); url.searchParams.set("purpose", purpose);
  try { await sendSystemEmail(user.email, purpose === "reset" ? "Reset your Luo Heritage password" : purpose === "delete" ? "Confirm Luo Heritage account deletion" : "Verify your Luo Heritage email", `Open this link within 30 minutes:\n${url.href}\n\nIf you did not request this, ignore this email.`); }
  catch (error) { await prisma.verificationToken.deleteMany({ where: { token: key } }); throw error; }
}
// Bind short codes to the email address and rate-limit guesses independently
// of delivery requests. Only the digest is stored, never the emailed code.
export async function requestPasswordResetCode(email: string) {
  await assertAccountRateLimit(email, "reset");
  await getEmailConfiguration();
  const user = await prisma.user.findFirst({ where: { email: { equals: email, mode: "insensitive" }, status: "active" }, select: { id: true, email: true } });
  if (!user) return;
  const code = randomInt(100000, 1000000).toString();
  const key = `reset-code:${digest(`${email}:${code}`)}`;
  await prisma.$transaction(async tx => {
    await tx.$queryRaw`WITH locked AS MATERIALIZED (SELECT pg_advisory_xact_lock(hashtext(${`reset-code:${user.id}`}))) SELECT 1::int AS locked FROM locked`;
    await tx.verificationToken.deleteMany({ where: { identifier: `account-reset:${user.id}`, token: { startsWith: "reset-code:" } } });
    await tx.verificationToken.create({ data: { identifier: `account-reset:${user.id}`, token: key, expires: new Date(Date.now() + 10 * 60000) } });
  });
  try {
    await sendSystemEmail(user.email, "Reset your Luo Heritage password", `Your password reset code is: ${code}\n\nEnter this code with your new password on the password reset page. It expires in 10 minutes and can only be used once.\n\nIf you did not request this, ignore this email.`);
  } catch (error) {
    await prisma.verificationToken.deleteMany({ where: { token: key } });
    throw error;
  }
}

export async function completePasswordResetCode(email: string, code: string, password: string) {
  await assertAccountRateLimit(email, "reset-code-check", 10);
  return completeAccountEmail(`${email}:${code}`, "reset", password, true);
}

export async function completeAccountEmail(token: string, purpose: "reset" | "verify" | "delete", password?: string, resetCode = false) {
  const key = `${resetCode ? "reset-code" : purpose}:${digest(token)}`;
  const passwordHash = purpose === "reset" ? await bcrypt.hash(password!, 12) : null;
  return prisma.$transaction(async tx => {
    const row = await tx.verificationToken.findUnique({ where: { token: key } });
    if (!row || !row.identifier.startsWith(`account-${purpose}:`) || row.expires <= new Date()) throw Object.assign(new Error("This code or link is invalid or expired. Request a new one."), { status: 400 });
    const userId = row.identifier.slice(`account-${purpose}:`.length);
    if (purpose === "delete") {
      const user = await tx.user.findUnique({ where: { id: userId }, select: { isMasterSuperAdmin: true } });
      if (user?.isMasterSuperAdmin) throw Object.assign(new Error("Transfer institutional ownership before deleting the Master Super Admin account."), { status: 409 });
    }
    const consumed = await tx.verificationToken.deleteMany({ where: { token: key, expires: { gt: new Date() } } });
    if (!consumed.count) throw Object.assign(new Error("This link has already been used."), { status: 409 });
    const changed = await tx.user.updateMany({ where: { id: userId, status: "active" }, data: purpose === "reset" ? { passwordHash, sessionVersion: { increment: 1 } } : purpose === "delete" ? {
      status: "deleted", email: `${userId}@deleted.invalid`, name: "Deleted contributor", passwordHash: null, image: null, avatarUrl: null, dateOfBirth: null, age: null, emailVerified: null, phoneNumber: null, phoneVerifiedAt: null, profileTypes: [], isSuperAdmin: false, sessionVersion: { increment: 1 },
    } : { emailVerified: new Date() } });
    if (!changed.count) throw Object.assign(new Error("Account is unavailable."), { status: 400 });
    if (purpose === "delete") {
      // Check after locking/updating the user row. Education membership grants
      // lock that row too, so an account cannot become a class's last teacher
      // between this check and deletion of its personal memberships.
      const teaching = await tx.classMembership.findFirst({ where: { userId, role: "teacher", classroom: { archivedAt: null } }, select: { id: true } });
      if (teaching) throw Object.assign(new Error("Leave or archive your active teaching classes before deleting your account. A class must retain a teacher until it is archived."), { status: 409 });
    }
    if (purpose === "reset" || purpose === "delete") {
      await tx.session.deleteMany({ where: { userId } });
      await tx.verificationToken.deleteMany({ where: { OR: [{ identifier: { contains: `"userId":"${userId}"` } }, { identifier: `account-reset:${userId}` }, { identifier: { startsWith: `phone-login:${userId}:` } }, { identifier: { startsWith: `phone-link:${userId}:` } }] } });
    }
    if (purpose === "delete") {
      await tx.account.deleteMany({ where: { userId } });
      await tx.userLanguageRole.deleteMany({ where: { userId } });
      await tx.conversation.deleteMany({ where: { userId } });
      await tx.aIResponse.deleteMany({ where: { userId } });
      await tx.notification.deleteMany({ where: { userId } });
      await tx.learningState.deleteMany({ where: { userId } });
      await tx.activityReceipt.deleteMany({ where: { userId } });
      await tx.savedItem.deleteMany({ where: { userId } });
      await tx.assignmentSubmission.deleteMany({ where: { userId } });
      await tx.classMembership.deleteMany({ where: { userId } });
      await tx.courseEnrollment.deleteMany({ where: { userId } });
      await tx.analyticsEvent.deleteMany({ where: { userId } });
      await tx.verificationToken.deleteMany({ where: { identifier: { in: [`account-delete:${userId}`, `account-verify:${userId}`, `account-reset:${userId}`] } } });
    }
    await tx.auditLog.create({ data: { userId, action: `account.${purpose}`, entityType: "user", entityId: userId } });
  });
}
