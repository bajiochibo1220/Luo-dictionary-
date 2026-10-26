import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentAccount } from "@/lib/account-data";
import { nativeApiHeaders, nativePreflight, sameOriginBrowserPost } from "@/lib/native-api-headers";
export const dynamic = "force-dynamic";
export const OPTIONS = nativePreflight;
export async function GET(request: Request) {
  const headers = nativeApiHeaders(request);
  try {
    const account = await getCurrentAccount(request);
    if (!account) return NextResponse.json({ success: false, error: "Sign in to continue." }, { status: 401, headers });
    const [sessions, notifications, saved] = await Promise.all([
      prisma.session.findMany({ where: { userId: account.id, expires: { gt: new Date() } }, select: { id: true, expires: true }, take: 100, orderBy: { expires: "desc" } }),
      prisma.notification.findMany({ where: { userId: account.id }, orderBy: { createdAt: "desc" }, take: 100, select: { id: true, message: true, read: true, createdAt: true } }),
      prisma.savedItem.findMany({ where: { userId: account.id }, select: { id: true, kind: true, resourceId: true }, take: 200 }),
    ]);
    return NextResponse.json({ success: true, data: { account, sessions, notifications, saved } }, { headers });
  } catch { return NextResponse.json({ success: false, error: "Settings temporarily unavailable." }, { status: 503, headers }); }
}
const input = z.discriminatedUnion("action", [
  z.object({ action: z.literal("profile"), name: z.string().trim().min(2).max(100), profileTypes: z.array(z.enum(["community_member", "student", "teacher", "researcher", "contributor"])).max(5) }),
  z.object({ action: z.literal("revoke"), id: z.string().uuid() }),
  z.object({ action: z.literal("revoke-all") }),
  z.object({ action: z.literal("read-notification"), id: z.number().int().positive() }),
]);
export async function POST(request: Request) {
  const headers = nativeApiHeaders(request);
  try {
    if (!request.headers.has("Authorization") && !sameOriginBrowserPost(request)) return NextResponse.json({ success: false, error: "Same-origin request required." }, { status: 403, headers });
    const account = await getCurrentAccount(request);
    if (!account) return NextResponse.json({ success: false, error: "Sign in to continue." }, { status: 401, headers });
    const data = input.parse(await request.json());
    if (data.action === "profile") await prisma.user.update({ where: { id: account.id }, data: { name: data.name, profileTypes: data.profileTypes } });
    else if (data.action === "read-notification") await prisma.notification.updateMany({ where: { id: data.id, userId: account.id }, data: { read: true } });
    else await prisma.$transaction(async tx => {
      if (data.action === "revoke-all") {
        await tx.user.update({ where: { id: account.id }, data: { sessionVersion: { increment: 1 } } });
        await tx.session.deleteMany({ where: { userId: account.id } });
        await tx.verificationToken.deleteMany({ where: { OR: [{ identifier: { contains: `"userId":"${account.id}"` } }, { identifier: { startsWith: `phone-login:${account.id}:` } }, { identifier: { startsWith: `phone-link:${account.id}:` } }] } });
      } else {
        const session = await tx.session.findFirst({ where: { id: data.id, userId: account.id } });
        if (session) {
          await tx.session.deleteMany({ where: { id: session.id, userId: account.id } });
          const family = session.sessionToken.startsWith("native-session:") ? session.sessionToken.split(":")[1] : null;
          if (family) await tx.verificationToken.deleteMany({ where: { identifier: { startsWith: `native-refresh:${family}:` } } });
        }
      }
      await tx.auditLog.create({ data: { userId: account.id, action: `account.${data.action}`, entityType: "user", entityId: account.id } });
    });
    return NextResponse.json({ success: true, data: { updated: true } }, { headers });
  } catch (error) { return NextResponse.json({ success: false, error: error instanceof z.ZodError ? "Check the supplied settings." : "Settings could not be saved." }, { status: error instanceof z.ZodError ? 400 : 503, headers }); }
}
