import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logAction } from "@/lib/audit";
import { isSuperAdmin } from "@/lib/permissions";
import { z } from "zod";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params: promisedParams }: { params: Promise<{ id: string }> }) {
  const params = await promisedParams;
  const session = await auth();
  if (!session?.user || !isSuperAdmin(session)) return NextResponse.json({ error: "Forbidden" }, { status: session?.user ? 403 : 401 });
  if (!session.user.isMasterSuperAdmin) return NextResponse.json({ error: "Only the Master Super Admin can change account status or Super Admin access" }, { status: 403 });
  if (session.user.id === params.id) return NextResponse.json({ error: "The Master account cannot be modified here" }, { status: 400 });
  const target = await prisma.user.findUnique({ where: { id: params.id }, select: { id: true, isMasterSuperAdmin: true } });
  if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (target.isMasterSuperAdmin) return NextResponse.json({ error: "The Master Super Admin account is protected" }, { status: 403 });
  const parsed = z.object({ isSuperAdmin: z.boolean().optional(), status: z.enum(["active", "suspended"]).optional(), name: z.string().trim().min(1).max(100).nullable().optional() }).strict().safeParse(await req.json().catch(() => null));
  if (!parsed.success || !Object.keys(parsed.data).length) return NextResponse.json({ error: "Choose a valid account change." }, { status: 400 });
  const body = parsed.data;
  const update: { isSuperAdmin?: boolean; status?: string; name?: string | null } = {};
  if (body.isSuperAdmin !== undefined) update.isSuperAdmin = Boolean(body.isSuperAdmin);
  if (body.status !== undefined) {
    if (!["active", "suspended"].includes(body.status)) return NextResponse.json({ error: "Invalid account status" }, { status: 400 });
    update.status = body.status;
  }
  if (body.name !== undefined) update.name = body.name;
  const updated = await prisma.user.update({ where: { id: params.id }, data: update });
  await logAction({ userId: session.user.id, action: "admin.updated", entityType: "user", entityId: params.id, newValue: update });
  return NextResponse.json({ success: true, data: { id: updated.id, name: updated.name, isSuperAdmin: updated.isSuperAdmin, status: updated.status } });
}

export async function DELETE(_req: NextRequest, { params: promisedParams }: { params: Promise<{ id: string }> }) {
  const params = await promisedParams;
  const session = await auth();
  if (!session?.user || !isSuperAdmin(session)) return NextResponse.json({ error: "Forbidden" }, { status: session?.user ? 403 : 401 });
  if (!session.user.isMasterSuperAdmin) return NextResponse.json({ error: "Only the Master Super Admin can revoke administrator access" }, { status: 403 });
  if (session.user.id === params.id) return NextResponse.json({ error: "The Master account cannot be revoked" }, { status: 400 });
  const target = await prisma.user.findUnique({ where: { id: params.id }, select: { isMasterSuperAdmin: true } });
  if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (target.isMasterSuperAdmin) return NextResponse.json({ error: "The Master Super Admin account is protected" }, { status: 403 });
  await prisma.$transaction([
    prisma.user.update({ where: { id: params.id }, data: { isSuperAdmin: false } }),
    prisma.userLanguageRole.deleteMany({ where: { userId: params.id, role: { in: ["language_admin", "uploader", "publisher", "content_editor"] } } }),
  ]);
  await logAction({ userId: session.user.id, action: "admin.revoked", entityType: "user", entityId: params.id });
  return NextResponse.json({ success: true });
}
