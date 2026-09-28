import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logAction } from "@/lib/audit";

export const dynamic = "force-dynamic";

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

  if ((session.user as any).id === params.id) {
    return NextResponse.json(
      { error: "Cannot modify your own admin status" },
      { status: 400 }
    );
  }

  const body = await req.json();
  const update: any = {};
  if (body.isSuperAdmin !== undefined) update.isSuperAdmin = body.isSuperAdmin;
  if (body.status !== undefined) update.status = body.status;
  if (body.name !== undefined) update.name = body.name;

  const updated = await prisma.user.update({
    where: { id: params.id },
    data: update,
  });

  await logAction({
    userId: (session.user as any).id,
    action: "admin.updated",
    entityType: "user",
    entityId: params.id,
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

  if ((session.user as any).id === params.id) {
    return NextResponse.json(
      { error: "Cannot delete yourself" },
      { status: 400 }
    );
  }

  await prisma.user.update({
    where: { id: params.id },
    data: { isSuperAdmin: false },
  });

  await prisma.userLanguageRole.deleteMany({
    where: {
      userId: params.id,
      role: {
        in: [
          "language_admin",
          "moderator",
          "content_editor",
          "cultural_expert",
        ],
      },
    },
  });

  await logAction({
    userId: (session.user as any).id,
    action: "admin.revoked",
    entityType: "user",
    entityId: params.id,
  });

  return NextResponse.json({ success: true });
}