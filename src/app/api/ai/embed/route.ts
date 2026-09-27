import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { embedRecord } from "@/lib/ai/embeddings";
import { hasGemini } from "@/lib/ai/gemini";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!hasGemini()) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY not configured. Add to .env" },
      { status: 400 }
    );
  }

  const { recordId, force } = await req.json();
  if (!recordId) {
    return NextResponse.json(
      { error: "recordId required" },
      { status: 400 }
    );
  }

  try {
    const result = await embedRecord(recordId, !!force);
    return NextResponse.json({ success: true, data: result });
  } catch (err: any) {
    console.error("[ai/embed]", err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}