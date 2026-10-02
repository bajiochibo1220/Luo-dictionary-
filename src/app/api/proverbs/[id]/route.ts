import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { publicRecordWhere } from "@/lib/governance";

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

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json();
  const updated = await prisma.culturalRecord.update({
    where: { id: params.id },
    data: body,
  });
  return NextResponse.json({ success: true, data: updated });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await prisma.culturalRecord.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
