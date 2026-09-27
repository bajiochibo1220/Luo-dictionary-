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
  const { comments, checklist } = body;

  await prisma.$transaction([
    prisma.culturalRecord.update({
      where: { id: params.id },
      data: {
        status: "validated",
        validatorId: (session.user as any).id,
      },
    }),
    prisma.reviewHistory.create({
      data: {
        recordId: params.id,
        reviewerId: (session.user as any).id,
        action: "validated",
        stage: "cultural_validation",
        comments: comments || "",
      },
    }),
  ]);

  return NextResponse.json({ success: true });
}