import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = session.user as any;
  if (!admin.isSuperAdmin && !admin.isMasterSuperAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { languageId, role } = body;

  if (!languageId || !role) {
    return NextResponse.json(
      { error: "languageId and role required" },
      { status: 400 }
    );
  }

  const master = admin.isMasterSuperAdmin === true;
  if (!["language_admin", "uploader", "publisher", "content_editor", "cultural_expert"].includes(role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }
  if (!master && !(admin.languageRoles ?? []).some((item: any) => item.languageId === Number(languageId))) {
    return NextResponse.json({ error: "You can only manage roles for your assigned languages" }, { status: 403 });
  }
  const targetUser = await prisma.user.findUnique({ where: { id: params.id }, select: { isSuperAdmin: true, isMasterSuperAdmin: true, languageRoles: { select: { id: true }, take: 1 } } });
  if (!targetUser) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (targetUser.isMasterSuperAdmin || (targetUser.isSuperAdmin && !master)) {
    return NextResponse.json({ error: "You cannot change roles for this account" }, { status: 403 });
  }
  if (!targetUser.isSuperAdmin && targetUser.languageRoles.length === 0) {
    return NextResponse.json({ error: "Public profiles cannot be assigned admin roles. Create a staff account from Admin Management instead." }, { status: 403 });
  }

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

  return NextResponse.json({ success: true, data: created });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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
  if (!roleId) {
    return NextResponse.json({ error: "roleId required" }, { status: 400 });
  }

  const targetRole = await prisma.userLanguageRole.findUnique({ where: { id: roleId }, include: { user: { select: { isSuperAdmin: true, isMasterSuperAdmin: true } } } });
  if (!targetRole) return NextResponse.json({ error: "Role not found" }, { status: 404 });
  if (targetRole.user.isMasterSuperAdmin || (targetRole.user.isSuperAdmin && !admin.isMasterSuperAdmin)) return NextResponse.json({ error: "You cannot change roles for this account" }, { status: 403 });
  if (!admin.isMasterSuperAdmin && !(admin.languageRoles ?? []).some((item: any) => item.languageId === targetRole.languageId)) return NextResponse.json({ error: "You can only manage roles for your assigned languages" }, { status: 403 });

  await prisma.userLanguageRole.delete({ where: { id: roleId } });
  return NextResponse.json({ success: true });
}
