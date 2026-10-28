import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { publishBeforeReview } from "@/lib/early-publication";
import { withApiErrors } from "@/lib/content-workflow";

export const POST = withApiErrors(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ success: false, error: "Sign in first." }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  if (body?.confirmPublicSharing !== undefined && typeof body.confirmPublicSharing !== "boolean") return NextResponse.json({ success: false, error: "Public sharing approval must be explicitly confirmed." }, { status: 400 });
  const publication = await prisma.$transaction(tx => publishBeforeReview(tx, id, session, body?.confirmPublicSharing === true), { timeout: 60_000 });
  return NextResponse.json({ success: true, publicationId: publication.id, isProvisional: true });
});
