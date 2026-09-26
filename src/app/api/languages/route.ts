import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const languages = await prisma.language.findMany({
    where: { isActive: true },
    orderBy: { displayOrder: "asc" },
    select: { id: true, code: true, name: true, nativeName: true },
  });
  return NextResponse.json({ success: true, data: languages });
}
