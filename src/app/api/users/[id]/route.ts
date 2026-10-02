import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logAction } from "@/lib/audit";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      email: true,
      name: true,
      isSuperAdmin: true,
      isMasterSuperAdmin: true,
      status: true,
      emailVerified: true,
      avatarUrl: true,
      createdAt: true,
      updatedAt: true,
      languageRoles: {
        include: { language: true },
        orderBy: { assignedAt: "asc" },
      },
    },
  });

  if (!user) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true, data: user });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = session.user as any;
  if ((user.id === params.id || params.id === "me") && req.headers.get("content-type")?.includes("application/json")) {
    const body = await req.json().catch(() => null);
    if (body && Object.keys(body).length === 1 && Array.isArray(body.profileTypes)) {
      const allowed = new Set(["community_member", "student", "contributor", "researcher", "teacher"]);
      const profileTypes: unknown[] = body.profileTypes;
      if (profileTypes.length > 5 || profileTypes.some((type) => typeof type !== "string" || !allowed.has(type)) || new Set(profileTypes).size !== profileTypes.length) {
        return NextResponse.json({ error: "Choose up to five different profile options." }, { status: 400 });
      }
      const current = await prisma.user.findUnique({ where: { id: user.id }, select: { profileTypes: true } });
      if (!current) return NextResponse.json({ error: "Not found" }, { status: 404 });
      const updated = await prisma.user.update({ where: { id: user.id }, data: { profileTypes: profileTypes as string[] }, select: { id: true, profileTypes: true } });
      await logAction({ userId: user.id, action: "user.profile_types_updated", entityType: "user", entityId: user.id, oldValue: { profileTypes: current.profileTypes }, newValue: { profileTypes: updated.profileTypes } });
      return NextResponse.json({ success: true, data: updated });
    }
  }
  if (!user.isSuperAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const target = await prisma.user.findUnique({ where: { id: params.id }, select: { isMasterSuperAdmin: true } });
  if (!target) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (target.isMasterSuperAdmin) return NextResponse.json({ error: "The Master Super Admin account is protected" }, { status: 403 });
  if (body.isSuperAdmin !== undefined) {
    return NextResponse.json({ error: "Create Super Admin accounts from the administrator management page" }, { status: 403 });
  }
  if (body.status !== undefined && !user.isMasterSuperAdmin) {
    return NextResponse.json({ error: "Only the Master Super Admin can change account status" }, { status: 403 });
  }
  if (user.id === params.id && body.status === "suspended") return NextResponse.json({ error: "You cannot deactivate your own account" }, { status: 400 });
  const update: any = {};
  if (body.name !== undefined) update.name = body.name;
  if (body.status !== undefined) update.status = body.status;
  if (body.status !== undefined && !["active", "suspended"].includes(body.status)) return NextResponse.json({ error: "Invalid status" }, { status: 400 });

  const updated = await prisma.user.update({
    where: { id: params.id },
    data: update,
  });

  return NextResponse.json({
    success: true,
    data: {
      id: updated.id,
      email: updated.email,
      name: updated.name,
      status: updated.status,
      isSuperAdmin: updated.isSuperAdmin,
    },
  });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = session.user as any;
  if (!user.isSuperAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!user.isMasterSuperAdmin) return NextResponse.json({ error: "Only the Master Super Admin can delete accounts" }, { status: 403 });

  // Prevent deleting yourself
  if (user.id === params.id) {
    return NextResponse.json(
      { error: "Cannot delete your own account" },
      { status: 400 }
    );
  }

  const target = await prisma.user.findUnique({ where: { id: params.id }, select: { isMasterSuperAdmin: true } });
  if (!target) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (target.isMasterSuperAdmin) return NextResponse.json({ error: "The Master Super Admin account is protected" }, { status: 403 });
  await prisma.user.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
