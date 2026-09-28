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

  const userId = (session.user as any).id;

  const conversation = await prisma.conversation.findFirst({
    where: { id: params.id, userId },
    include: {
      messages: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!conversation) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    data: {
      id: conversation.id,
      title: conversation.title,
      pinned: conversation.pinned,
      archived: conversation.archived,
      messages: conversation.messages.map((m) => ({
        id: m.id,
        query: m.query,
        response: m.response,
        sources: m.sources,
        createdAt: m.createdAt.toISOString(),
      })),
    },
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

  const userId = (session.user as any).id;
  const body = await req.json().catch(() => ({}));

  const existing = await prisma.conversation.findFirst({
    where: { id: params.id, userId },
  });

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const update: any = {};
  if (typeof body.title === "string" && body.title.trim()) {
    update.title = body.title.trim().slice(0, 120);
  }
  if (typeof body.pinned === "boolean") update.pinned = body.pinned;
  if (typeof body.archived === "boolean") update.archived = body.archived;

  const updated = await prisma.conversation.update({
    where: { id: params.id },
    data: update,
  });

  return NextResponse.json({
    success: true,
    data: {
      id: updated.id,
      title: updated.title,
      pinned: updated.pinned,
      archived: updated.archived,
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

  const userId = (session.user as any).id;
  const existing = await prisma.conversation.findFirst({
    where: { id: params.id, userId },
  });

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.conversation.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}