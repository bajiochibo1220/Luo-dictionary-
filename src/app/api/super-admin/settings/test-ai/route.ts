import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { sameOriginBrowserPost } from "@/lib/native-api-headers";
import { getTextAiProvider } from "@/lib/ai/provider-config";
import { generateText } from "@/lib/ai/text-generation";
import { AiProviderError } from "@/lib/ai/gemini-errors";
import { assertAiQuota } from "@/lib/ai/quota";
import { getSystemSettings } from "@/lib/settings";

export const maxDuration = 60;
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user || !(session.user.isSuperAdmin || session.user.isMasterSuperAdmin)) return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  if (!sameOriginBrowserPost(request)) return NextResponse.json({ success: false, error: "Open this action from System settings." }, { status: 403 });
  try {
    await getSystemSettings({ fresh: true });
    await assertAiQuota(request, session.user.id);
    const provider = await getTextAiProvider();
    const result = await generateText("Reply with READY.", "This is an administrator's connectivity test. Return a brief response.");
    return NextResponse.json({ success: true, data: { provider, model: result.model } }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    const status = error instanceof AiProviderError || (error as { status?: number })?.status === 429 ? (error as { status: number }).status : 503;
    return NextResponse.json({ success: false, error: error instanceof AiProviderError ? error.message : status === 429 ? "AI request limit reached. Please try again later." : "Unable to test the AI connection right now." }, { status, headers: { "Cache-Control": "private, no-store" } });
  }
}
