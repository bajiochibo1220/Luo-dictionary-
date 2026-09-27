import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { embedRecord } from "@/lib/ai/embeddings";
import { hasGemini } from "@/lib/ai/gemini";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!(session.user as any).isSuperAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!hasGemini()) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY not configured. Add to .env" },
      { status: 400 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const languageId = body.languageId as number | undefined;
  const force = !!body.force;

  const records = await prisma.culturalRecord.findMany({
    where: {
      status: "published",
      ...(languageId ? { languageId } : {}),
    },
    select: { id: true },
  });

  let succeeded = 0;
  let skipped = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const r of records) {
    try {
      const result = await embedRecord(r.id, force);
      if (result.skipped) skipped++;
      else succeeded++;
      await new Promise((res) => setTimeout(res, 200));
    } catch (err: any) {
      failed++;
      errors.push(`${r.id}: ${err.message}`);
    }
  }

  return NextResponse.json({
    success: true,
    data: {
      total: records.length,
      succeeded,
      skipped,
      failed,
      errors: errors.slice(0, 5),
    },
  });
}