import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isLanguageAdmin } from "@/lib/permissions";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const rawIds: unknown[] = Array.isArray(body.ids) ? body.ids : [];
  const ids = Array.from(new Set<string>(rawIds.filter((id): id is string => typeof id === "string")));
  if (!ids.length || ids.length > 100) return NextResponse.json({ error: "Select between 1 and 100 records" }, { status: 400 });

  if (!(session.user as any).isSuperAdmin && !(session.user as any).isMasterSuperAdmin) {
    const records = await prisma.culturalRecord.findMany({ where: { id: { in: ids } }, select: { id: true, languageId: true } });
    if (records.length !== ids.length || records.some((record) => !isLanguageAdmin(session, record.languageId))) {
      return NextResponse.json({ error: "You can only delete records in languages you administer" }, { status: 403 });
    }
  }

  const result = await prisma.culturalRecord.deleteMany({ where: { id: { in: ids } } });
  return NextResponse.json({ success: true, deleted: result.count });
}
