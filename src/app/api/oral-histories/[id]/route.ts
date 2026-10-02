import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { publicGovernanceWhere, publicRecordWhere } from "@/lib/governance";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const record = await prisma.culturalRecord.findUnique({
    where: { id: params.id, ...publicRecordWhere() },
    include: { media: { where: publicGovernanceWhere() }, transcripts: { where: publicGovernanceWhere() } },
  });
  if (!record) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ success: true, data: record });
}
