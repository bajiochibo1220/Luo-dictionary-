import { NextRequest, NextResponse } from "next/server";
import { publicRecordWhere } from "@/lib/governance";
import { prisma } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const record = await prisma.culturalRecord.findUnique({
    where: { id: params.id, ...publicRecordWhere() },
  });
  if (!record) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ success: true, data: record });
}