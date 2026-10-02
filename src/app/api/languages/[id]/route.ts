import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logAction } from "@/lib/audit";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = Number(params.id);
  if (!Number.isSafeInteger(id) || id < 1) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const language = await prisma.language.findUnique({
    where: { id },
    include: {
      userRoles: {
        include: { user: { select: { id: true, email: true, name: true } } },
      },
    },
  });
  if (!language) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const [recordCount, mediaCount, userCount] = await Promise.all([
    prisma.culturalRecord.count({ where: { languageId: id } }),
    prisma.mediaAsset.count({ where: { languageId: id } }),
    prisma.userLanguageRole.count({ where: { languageId: id } }),
  ]);

  return NextResponse.json({
    success: true,
    data: { ...language, recordCount, mediaCount, userCount },
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!(session.user as any).isSuperAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const id = Number(params.id);
  if (!Number.isSafeInteger(id) || id < 1) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const body = await req.json();
  const update: any = {};
  if (body.name !== undefined) update.name = body.name;
  if (body.nativeName !== undefined) update.nativeName = body.nativeName;
  if (body.flagIcon !== undefined) update.flagIcon = body.flagIcon;
  if (body.displayOrder !== undefined) update.displayOrder = body.displayOrder;
  if (body.isActive !== undefined) update.isActive = body.isActive;
  if (body.isDefault !== undefined) update.isDefault = body.isDefault;

  const updated = await prisma.language.update({ where: { id }, data: update });

  await logAction({
    userId: (session.user as any).id,
    action: "language.updated",
    entityType: "language",
    entityId: String(id),
    newValue: update,
  });

  return NextResponse.json({ success: true, data: updated });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!(session.user as any).isSuperAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const id = Number(params.id);
  if (!Number.isSafeInteger(id) || id < 1) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const count = await prisma.culturalRecord.count({ where: { languageId: id } });
  if (count > 0) {
    return NextResponse.json(
      { error: `Cannot delete: ${count} records exist for this language` },
      { status: 400 }
    );
  }

  await prisma.language.delete({ where: { id } });

  await logAction({
    userId: (session.user as any).id,
    action: "language.deleted",
    entityType: "language",
    entityId: String(id),
  });

  return NextResponse.json({ success: true });
}
