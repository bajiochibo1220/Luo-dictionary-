import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { deleteUnpublishedContent } from "@/lib/content-deletion";
import { withApiErrors } from "@/lib/content-workflow";
export const POST = withApiErrors(async (req: NextRequest) => {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const ids = [...new Set<string>(Array.isArray(body.ids) ? body.ids.filter((id: unknown): id is string => typeof id === "string") : [])];
  if (!ids.length || ids.length > 100) return NextResponse.json({ error: "Select between 1 and 100 records." }, { status: 400 });
  const deleted = await deleteUnpublishedContent(session, ids, { deletePublicVersions: body.deletePublicVersions === true });
  return NextResponse.json({ success: true, deleted });
});
