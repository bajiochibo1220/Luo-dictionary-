import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { AdminPasswordSchema, changeAdminPassword } from "@/lib/admin-password";
import { assertAccountRateLimit } from "@/lib/account-security";
import { sameOriginBrowserPost } from "@/lib/native-api-headers";
import { withApiErrors } from "@/lib/content-workflow";

export const POST = withApiErrors(async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  if (!request.headers.has("Authorization") && !sameOriginBrowserPost(request)) return NextResponse.json({ error: "Open password management from this system." }, { status: 403 });
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  if (!session.user.isMasterSuperAdmin) return NextResponse.json({ error: "Only the Master Super Admin can change administrator passwords." }, { status: 403 });
  const input = AdminPasswordSchema.safeParse(await request.json().catch(() => null));
  if (!input.success) return NextResponse.json({ error: "Use a password of 12–128 characters." }, { status: 400 });
  await assertAccountRateLimit(session.user.id, "admin-password", 20);
  const { id } = await params;
  const result = await changeAdminPassword(session.user.id, id === "me" ? session.user.id : id, input.data);
  return NextResponse.json({ success: true, ...result }, { headers: { "Cache-Control": "no-store" } });
});
