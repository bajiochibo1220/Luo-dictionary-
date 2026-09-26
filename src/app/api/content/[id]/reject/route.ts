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

  await prisma.$transaction([
    prisma.culturalRecord.update({
      where: { id: params.id },
      data: { status: "rejected" },
    }),
    prisma.reviewHistory.create({
      data: {
        recordId: params.id,
        reviewerId: (session.user as any).id,
        action: "rejected",
        stage: "moderation",
        comments,
      },
    }),
  ]);

  return NextResponse.json({ success: true });
}