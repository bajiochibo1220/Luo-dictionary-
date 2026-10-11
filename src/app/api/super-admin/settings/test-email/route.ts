import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isSuperAdmin } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import { sendSystemEmail } from "@/lib/email";
import { withApiErrors } from "@/lib/content-workflow";

async function handlePOST() {
  const session = await auth();
  if (!session?.user?.id || !isSuperAdmin(session)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!session.user.email) return NextResponse.json({ error: "Your account has no email address." }, { status: 400 });
  const key = `rate-limit:email-test:${session.user.id}`;
  await prisma.$transaction(async tx => {
    await tx.$queryRaw`WITH lock_result AS MATERIALIZED (SELECT pg_advisory_xact_lock(hashtext(${key}))) SELECT 1::int AS locked FROM lock_result`;
    const previous = await tx.systemSetting.findUnique({ where: { key } });
    if (previous && Number(previous.value) > Date.now() - 60_000) throw Object.assign(new Error("Wait one minute before sending another test email."), { status: 429 });
    const value = String(Date.now());
    await tx.systemSetting.upsert({ where: { key }, create: { key, value }, update: { value } });
  });
  await sendSystemEmail(session.user.email, "LuoLinguaAI email configuration test", "Your LuoLinguaAI email provider accepted this configuration test.");
  return NextResponse.json({ success: true });
}

export const POST = withApiErrors(handlePOST);
