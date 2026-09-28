import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id;
  const { searchParams } = new URL(req.url);
  const showArchived = searchParams.get("archived") === "true";

  const conversations = await prisma.conversation.findMany({
    where: { userId, archived: showArchived },
    orderBy: [{ pinned: "desc" }, { updatedAt: "desc" }],
    take: 100,
    select: {
      id: true,
      title: true,
      pinned: true,
      archived: true,
      updatedAt: true,
      _count: { select: { messages: true } },
    },
  });

  return NextResponse.json({
    success: true,
    data: conversations.map((c) => ({
      id: c.id,
      title: c.title,
      pinned: c.pinned,
      archived: c.archived,
      messageCount: c._count.messages,
      updatedAt: c.updatedAt.toISOString(),
    })),
  });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const title = body.title || "New chat";

  const conversation = await prisma.conversation.create({
    data: { userId: (session.user as any).id, title },
  });

  return NextResponse.json({ success: true, data: conversation });
}