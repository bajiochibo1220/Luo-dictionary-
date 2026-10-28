import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { publishBeforeReview } from "@/lib/early-publication";
import { withApiErrors } from "@/lib/content-workflow";

export const POST = withApiErrors(async (request: NextRequest) => {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ success: false, error: "Sign in first." }, { status: 401 });
  const body = await request.json();
  const ids: unknown = body?.recordIds;
  if (!Array.isArray(ids) || !ids.length || ids.length > 100 || ids.some(id => typeof id !== "string" || !id.trim()) || new Set(ids).size !== ids.length) {
    return NextResponse.json({ success: false, error: "Select between one and one hundred different items." }, { status: 400 });
  }
  const publications = await prisma.$transaction(async tx => {
    const result = [];
    // Consistent row-lock order prevents overlapping batches from deadlocking.
    for (const id of [...ids].sort()) result.push(await publishBeforeReview(tx, id, session));
    return result;
  }, { timeout: 60_000 });
  return NextResponse.json({ success: true, count: publications.length, isProvisional: true });
});
