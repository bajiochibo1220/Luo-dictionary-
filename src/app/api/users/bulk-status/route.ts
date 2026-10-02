import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logAction } from "@/lib/audit";

export async function POST(request: NextRequest) {
  const session = await auth();
  const actor = session?.user as any;
  if (!actor?.isSuperAdmin && !actor?.isMasterSuperAdmin) return NextResponse.json({ success: false, error: "Only a super admin can manage accounts in bulk." }, { status: 403 });
  const body = await request.json().catch(() => ({}));
  const ids: unknown[] = Array.isArray(body.userIds) ? body.userIds : [];
  const status = body.status;
  if (!ids.length || ids.length > 100 || ids.some((id) => typeof id !== "string") || new Set(ids).size !== ids.length || !["active", "suspended"].includes(status)) {
    return NextResponse.json({ success: false, error: "Select up to 100 users and choose active or suspended." }, { status: 400 });
  }
  const users = await prisma.user.findMany({ where: { id: { in: ids as string[] } }, select: { id: true, status: true, isSuperAdmin: true, isMasterSuperAdmin: true } });
  if (users.length !== ids.length) return NextResponse.json({ success: false, error: "One or more accounts could not be found." }, { status: 404 });
  if (users.some((user) => user.isMasterSuperAdmin || user.id === actor.id || (user.isSuperAdmin && !actor.isMasterSuperAdmin))) return NextResponse.json({ success: false, error: "You cannot change your own account or an account with equal or higher privileges." }, { status: 400 });
  await prisma.user.updateMany({ where: { id: { in: ids as string[] } }, data: { status } });
  await logAction({ userId: actor.id, action: status === "suspended" ? "users.bulk_suspended" : "users.bulk_activated", entityType: "user", entityId: (ids as string[]).join(","), newValue: { status, count: ids.length } });
  return NextResponse.json({ success: true, count: ids.length });
}
