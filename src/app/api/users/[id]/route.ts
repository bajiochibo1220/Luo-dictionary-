import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

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
  if (!user.isSuperAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const update: any = {};
  if (body.name !== undefined) update.name = body.name;
  if (body.status !== undefined) update.status = body.status;
  if (body.isSuperAdmin !== undefined) update.isSuperAdmin = body.isSuperAdmin;

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

  // Prevent deleting yourself
  if (user.id === params.id) {
    return NextResponse.json(
      { error: "Cannot delete your own account" },
      { status: 400 }
    );
  }

  await prisma.user.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}