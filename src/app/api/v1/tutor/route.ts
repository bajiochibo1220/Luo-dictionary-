import { TutorRequest } from "@/lib/tutor-contract";
import { readBoundedJson } from "@/lib/bounded-json";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentAccount } from "@/lib/account-data";
import { nativeApiHeaders, nativePreflight, sameOriginBrowserPost } from "@/lib/native-api-headers";
import { assertServiceAvailable } from "@/lib/maintenance";
import { assertAiQuota } from "@/lib/ai/quota";
import { assertAccountRateLimit } from "@/lib/account-security";
import { AiProviderError } from "@/lib/ai/gemini-text";
import { tutor, TutorError } from "@/lib/tutor-service";
export const dynamic = "force-dynamic";
export const OPTIONS = nativePreflight;
export async function POST(request: Request) {
  const headers = nativeApiHeaders(request);
  try {
    if (!request.headers.has("Authorization") && !sameOriginBrowserPost(request)) throw new TutorError(403, "Open the tutor from this app.");
    const account = await getCurrentAccount(request);
    if (!account) throw new TutorError(401, "Sign in to use your language tutor.");
    await assertServiceAvailable();
    const input = TutorRequest.parse(await readBoundedJson(request, 2900000));
    if (input.mode === "vocabulary" || input.mode === "grade") await assertAccountRateLimit(account.id, "tutor-practice", 30, 60000);
    else await assertAiQuota(request, account.id);
    return NextResponse.json({ success: true, data: await tutor(input, account.id) }, { headers });
  } catch (error) {
    const status = (error as { status?: number })?.status === 413 ? 413 : error instanceof TutorError || error instanceof AiProviderError ? error.status : error instanceof z.ZodError ? 400 : (error as { status?: number })?.status === 429 ? 429 : 503;
    return NextResponse.json({ success: false, error: status === 413 ? "Request too large. Use a shorter source or recording." : error instanceof TutorError || error instanceof AiProviderError ? error.message : status === 400 ? "Choose a valid practice mode and allow AI processing." : status === 429 ? "Practice limit reached. Try again later." : "The tutor is temporarily unavailable. Please retry." }, { status, headers });
  }
}
