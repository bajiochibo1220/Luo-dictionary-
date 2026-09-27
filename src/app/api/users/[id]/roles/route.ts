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
  if (!admin.isSuperAdmin) {
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
  if (!admin.isSuperAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const roleId = Number(searchParams.get("roleId") || 0);
  if (!roleId) {
    return NextResponse.json({ error: "roleId required" }, { status: 400 });
  }

  await prisma.userLanguageRole.delete({ where: { id: roleId } });
  return NextResponse.json({ success: true });
}