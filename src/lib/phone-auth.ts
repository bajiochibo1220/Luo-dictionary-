import { createHmac, randomInt } from "node:crypto";
import { prisma } from "@/lib/db";
import { assertAccountRateLimit } from "@/lib/account-security";
const phoneFormat = /^\+[1-9]\d{7,14}$/;
function tokenFor(phone: string, code: string, purpose: string) {
  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret) throw Object.assign(new Error("Authentication service is not configured."), { status: 503 });
  return `phone-${purpose}:${createHmac("sha256", secret).update(`${phone}:${code}`).digest("hex")}`;
}
export async function sendPhoneCode(phone: string, purpose: "link" | "login", userId?: string) {
  if (!phoneFormat.test(phone)) throw Object.assign(new Error("Use international phone format, for example +254…"), { status: 400 });
  await assertAccountRateLimit(phone, "sms-send", 3);
  const { AT_USERNAME: username, AT_API_KEY: apiKey, AT_SENDER_ID: sender } = process.env;
  if (!username || !apiKey) throw Object.assign(new Error("SMS verification is not configured yet."), { status: 503 });
  if (purpose === "link" && !userId) throw Object.assign(new Error("Sign in before linking a phone."), { status: 401 });
  const user = purpose === "link" ? await prisma.user.findFirst({ where: { id: userId, status: "active" }, select: { id: true } })
    : await prisma.user.findFirst({ where: { phoneNumber: phone, phoneVerifiedAt: { not: null }, status: "active" }, select: { id: true } });
  if (!user) return;
  const code = String(randomInt(100000, 1000000)); const token = tokenFor(phone, code, purpose);
  const identifier = `phone-${purpose}:${user.id}:${phone}`;
  await prisma.verificationToken.deleteMany({ where: { identifier } });
  await prisma.verificationToken.create({ data: { identifier, token, expires: new Date(Date.now() + 5 * 60000) } });
  const body = new URLSearchParams({ username, to: phone, message: `Your Luo Heritage ${purpose === "link" ? "phone verification" : "sign-in"} code is ${code}. Expires in 5 minutes. Never share it.`, ...(sender ? { from: sender } : {}) });
  try {
    const response = await fetch(username === "sandbox" ? "https://api.sandbox.africastalking.com/version1/messaging" : "https://api.africastalking.com/version1/messaging", { method: "POST", headers: { apiKey, Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" }, body, signal: AbortSignal.timeout(15000) });
    const result = await response.json();
    if (!response.ok || !result.SMSMessageData?.Recipients?.some((recipient: { statusCode: number }) => recipient.statusCode === 101)) throw new Error("SMS provider did not accept delivery.");
  } catch { await prisma.verificationToken.deleteMany({ where: { token } }); throw Object.assign(new Error("SMS could not be delivered. Retry later."), { status: 503 }); }
}
export async function consumePhoneCode(phone: string, code: string, purpose: "login" | "link", expectedUserId?: string) {
  if (!phoneFormat.test(phone) || !/^\d{6}$/.test(code)) return null;
  await assertAccountRateLimit(phone, "sms-check", 10);
  return prisma.$transaction(async tx => {
    const token = tokenFor(phone, code, purpose);
    const row = await tx.verificationToken.findUnique({ where: { token } });
    if (!row || row.expires <= new Date()) return null;
    const userId = row.identifier.split(":")[1];
    if (row.identifier !== `phone-${purpose}:${userId}:${phone}` || purpose === "link" && userId !== expectedUserId) return null;
    const user = await tx.user.findFirst({ where: { id: userId, status: "active", ...(purpose === "login" ? { phoneNumber: phone, phoneVerifiedAt: { not: null } } : {}) }, select: { id: true, email: true, name: true } });
    if (!user) return null;
    const consumed = await tx.verificationToken.deleteMany({ where: { token, expires: { gt: new Date() } } });
    if (!consumed.count) return null;
    if (purpose === "link") await tx.user.update({ where: { id: userId }, data: { phoneNumber: phone, phoneVerifiedAt: new Date() } });
    await tx.auditLog.create({ data: { userId, action: `account.phone-${purpose}`, entityType: "user", entityId: userId } });
    return user;
  });
}
