import { assertServiceAvailable } from "@/lib/maintenance";
import { withApiErrors } from "@/lib/content-workflow";
import { localizeRecord } from "@/lib/content-translations";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { publicGovernanceWhere, publicRecordWhere } from "@/lib/governance";

async function handleGET(
  _req: NextRequest,
  { params: promisedParams }: { params: Promise<{ id: string }> }
) {
  const params = await promisedParams;
  await assertServiceAvailable();
  const record = await prisma.culturalRecord.findFirst({
    where: { id: params.id, module: { code: "oral_histories" }, ...publicRecordWhere() },
    include: { media: { where: publicGovernanceWhere() }, transcripts: { where: publicGovernanceWhere() } },
  });
  if (!record) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ success: true, data: localizeRecord(record, record.languageId) });
}

export const GET = withApiErrors(handleGET);
