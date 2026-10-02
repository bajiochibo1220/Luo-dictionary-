import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canReviewContent, isSuperAdmin } from "@/lib/permissions";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, flagged } = await req.json();
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  const response = await prisma.aIResponse.findUnique({
    where: { id },
    select: { languageId: true },
  });
  if (!response) return NextResponse.json({ error: "Response not found" }, { status: 404 });
  if (response.languageId === null ? !isSuperAdmin(session) : !canReviewContent(session, response.languageId)) {
    return NextResponse.json({ error: "Curator access is required for this language." }, { status: 403 });
  }

  const updated = await prisma.aIResponse.update({
    where: { id },
    data: { flagged: !!flagged },
  });

  return NextResponse.json({ success: true, data: updated });
}
