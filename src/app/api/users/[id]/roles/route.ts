import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { logAction } from "@/lib/audit";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(
  req: NextRequest,
  { params: promisedParams }: { params: Promise<{ id: string }> }
) {
  const params = await promisedParams;
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = session.user as any;
  if (!admin.isSuperAdmin && !admin.isMasterSuperAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = z.object({languageId: z.number().int().positive(), role: z.enum(["language_admin", "uploader", "publisher", "content_editor", "teacher", "researcher"])}).strict().safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({error: "Choose a valid language and duty."},{status: 400});
  const { languageId, role } = parsed.data;

  if (!languageId || !role) {
    return NextResponse.json(
      { error: "languageId and role required" },
      { status: 400 }
    );
  }

  const master = admin.isMasterSuperAdmin === true;
  if (!["language_admin", "uploader", "publisher", "content_editor", "teacher", "researcher"].includes(role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }
  if (!master && !(admin.languageRoles ?? []).some((item: any) => item.languageId === Number(languageId))) {
    return NextResponse.json({ error: "You can only manage roles for your assigned languages" }, { status: 403 });
  }
  const targetUser = await prisma.user.findUnique({ where: { id: params.id }, select: { isSuperAdmin: true, isMasterSuperAdmin: true, languageRoles: { select: { id: true, role: true } } } });
  if (!targetUser) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (targetUser.isMasterSuperAdmin || (targetUser.isSuperAdmin && !master)) {
    return NextResponse.json({ error: "You cannot change roles for this account" }, { status: 403 });
  }
  const administrative = !["teacher", "researcher"].includes(role);
  const existingStaff = targetUser.isSuperAdmin || targetUser.languageRoles.some(item => ["language_admin", "uploader", "publisher", "content_editor"].includes(item.role));
  if (administrative && !existingStaff) {
    return NextResponse.json({ error: "Public profiles cannot be assigned admin roles. Create a staff account from Admin Management instead." }, { status: 403 });
  }

  if (!await prisma.language.findFirst({where: {id: languageId, isActive: true}, select: {id: true}})) return NextResponse.json({error: "Choose an active language."},{status: 400});
  const created = await prisma.userLanguageRole.upsert({
    where: {
      userId_languageId_role: {
        userId: params.id,
        languageId,
        role,
      },
    },
    update: {},
    create: {
      userId: params.id,
      languageId,
      role,
      assignedBy: admin.id,
    },
  });

  await logAction({userId: admin.id, action: "user.role_granted", entityType: "user", entityId: params.id, newValue: {role, languageId}});
  return NextResponse.json({ success: true, data: {id: created.id, role: created.role, languageId: created.languageId} });
}

export async function DELETE(
  req: NextRequest,
  { params: promisedParams }: { params: Promise<{ id: string }> }
) {
  const params = await promisedParams;
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = session.user as any;
  if (!admin.isSuperAdmin && !admin.isMasterSuperAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const roleId = Number(searchParams.get("roleId") || 0);
  if (!Number.isSafeInteger(roleId) || roleId < 1) {
    return NextResponse.json({ error: "roleId required" }, { status: 400 });
  }

  const targetRole = await prisma.userLanguageRole.findUnique({ where: { id: roleId }, include: { user: { select: { isSuperAdmin: true, isMasterSuperAdmin: true } } } });
  if (!targetRole || targetRole.userId !== params.id) return NextResponse.json({ error: "Role not found" }, { status: 404 });
  if (targetRole.user.isMasterSuperAdmin || (targetRole.user.isSuperAdmin && !admin.isMasterSuperAdmin)) return NextResponse.json({ error: "You cannot change roles for this account" }, { status: 403 });
  if (!admin.isMasterSuperAdmin && !(admin.languageRoles ?? []).some((item: any) => item.languageId === targetRole.languageId)) return NextResponse.json({ error: "You can only manage roles for your assigned languages" }, { status: 403 });

  await prisma.userLanguageRole.delete({ where: { id: roleId } });
  await logAction({userId: admin.id, action: "user.role_revoked", entityType: "user", entityId: params.id, oldValue: {role: targetRole.role, languageId: targetRole.languageId}});
  return NextResponse.json({ success: true });
}
