import { readBoundedJson } from "@/lib/bounded-json";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentAccount } from "@/lib/account-data";
import { nativeApiHeaders, nativePreflight, sameOriginBrowserPost } from "@/lib/native-api-headers";
import { assertServiceAvailable } from "@/lib/maintenance";
import { readGame, mutateGame } from "@/lib/game-service";
import { LearningError } from "@/lib/learning-service";
export const dynamic = "force-dynamic";
export const OPTIONS = nativePreflight;
async function handle(request: Request) {
  const headers = nativeApiHeaders(request);
  try {
    if (request.method === "POST" && !request.headers.has("Authorization") && !sameOriginBrowserPost(request)) throw new LearningError(403, "Use this app to join a challenge.");
    const account = await getCurrentAccount(request);
    if (!account) throw new LearningError(401, "Sign in to play with others.");
    await assertServiceAvailable();
    let data;
    if (request.method === "GET") data = await readGame(account.id, new URL(request.url).searchParams.get("room") || "");
    else data = await mutateGame(account.id, await readBoundedJson(request, 20000));
    return NextResponse.json({ success: true, data }, { headers });
  } catch (error) {
    const status = (error as { status?: number })?.status === 413 ? 413 : error instanceof LearningError ? error.status : error instanceof z.ZodError || error instanceof SyntaxError ? 400 : (error as {status?: number})?.status === 429 ? 429 : 503;
    return NextResponse.json({ success: false, error: status === 413 ? "Request too large. Use a shorter source or recording." : error instanceof LearningError ? error.message : status === 400 ? "Check the challenge details." : status === 429 ? "Too many attempts. Please wait." : "Challenges are temporarily unavailable. Please retry." }, { status, headers });
  }
}
export const GET = handle;
export const POST = handle;
