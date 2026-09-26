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

  const body = await req.json().catch(() => ({}));
  const comments = body.comments || "";

  const record = await prisma.culturalRecord.findUnique({
    where: { id: params.id },
  });
  if (!record) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.$transaction([
    prisma.culturalRecord.update({
      where: { id: params.id },
      data: {
        status: "published",
        publishedAt: new Date(),
        reviewerId: (session.user as any).id,
      },
    }),
    prisma.reviewHistory.create({
      data: {
        recordId: params.id,
        reviewerId: (session.user as any).id,
        action: "approved",
        stage: "moderation",
        comments,
      },
    }),
  ]);

  return NextResponse.json({ success: true });
}