import { readBoundedJson } from "@/lib/bounded-json";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentAccount } from "@/lib/account-data";
import { nativeApiHeaders, nativePreflight, sameOriginBrowserPost } from "@/lib/native-api-headers";
import { assertServiceAvailable } from "@/lib/maintenance";
import { assertAiQuota } from "@/lib/ai/quota";
import { AiProviderError } from "@/lib/ai/gemini-text";
import { TutorError } from "@/lib/tutor-service";
import { aiToolSources, runAiTool } from "@/lib/ai-tools-service";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
export const OPTIONS = nativePreflight;
async function handle(request: Request) {
  const headers = nativeApiHeaders(request);
  try {
    if (request.method === "POST" && !request.headers.has("Authorization") && !sameOriginBrowserPost(request)) throw new TutorError(403, "Open these tools from the app.");
    const account = await getCurrentAccount(request);
    if (!account) throw new TutorError(401, "Sign in to use AI media tools.");
    await assertServiceAvailable();
    if (request.method === "GET") return NextResponse.json({ success: true, data: await aiToolSources(Number(new URL(request.url).searchParams.get("languageId"))) }, { headers });
    const input = await readBoundedJson(request, 2000);
    await assertAiQuota(request, account.id);
    return NextResponse.json({ success: true, data: await runAiTool(account.id, input) }, { headers });
  } catch (error) {
    const status = (error as { status?: number })?.status === 413 ? 413 : error instanceof TutorError || error instanceof AiProviderError ? error.status : error instanceof z.ZodError || error instanceof SyntaxError ? 400 : (error as {status?:number})?.status === 429 ? 429 : 503;
    return NextResponse.json({ success: false, error: status === 413 ? "Request too large. Use a shorter source or recording." : error instanceof TutorError || error instanceof AiProviderError ? error.message : status === 429 ? "AI request limit reached. Try again later." : status === 400 ? "Choose a valid tool and allow processing." : "Media tools are temporarily unavailable. Please retry." }, { status, headers });
  }
}
export const GET = handle;
export const POST = handle;
