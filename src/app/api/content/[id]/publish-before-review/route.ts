import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { publishBeforeReview } from "@/lib/early-publication";
import { withApiErrors } from "@/lib/content-workflow";

export const POST = withApiErrors(async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ success: false, error: "Sign in first." }, { status: 401 });
  const { id } = await params;
  const publication = await prisma.$transaction(tx => publishBeforeReview(tx, id, session), { timeout: 60_000 });
  return NextResponse.json({ success: true, publicationId: publication.id, isProvisional: true });
});
