import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentAccount } from "@/lib/account-data";
import { nativeApiHeaders, nativePreflight, sameOriginBrowserPost } from "@/lib/native-api-headers";
import { appApiHeaders } from "@/lib/app-api-headers";
import { assertServiceAvailable } from "@/lib/maintenance";
import { listResources, saveResource, transitionResource, recordProgress, LearningError } from "@/lib/learning-service";

export const dynamic = "force-dynamic";
export const OPTIONS = nativePreflight;
function failure(error: unknown, request: Request) {
  const status = error instanceof LearningError ? error.status : error instanceof z.ZodError ? 400 : 503;
  return NextResponse.json({ success: false, error: error instanceof z.ZodError ? error.issues[0]?.message : error instanceof LearningError ? error.message : "Learning services are temporarily unavailable. Please retry." }, { status, headers: nativeApiHeaders(request) });
}
export async function GET(request: Request) {
  try {
    await assertServiceAvailable();
    return NextResponse.json({ success: true, data: await listResources(new URL(request.url).searchParams, await getCurrentAccount(request)) }, { headers: { ...appApiHeaders(request.headers.get("Origin")), ...nativeApiHeaders(request) } });
  } catch (error) { return failure(error, request); }
}
export async function POST(request: Request) {
  try {
    await assertServiceAvailable();
    if (!request.headers.has("Authorization") && !sameOriginBrowserPost(request)) throw new LearningError(403, "Use a same-origin request.");
    const account = await getCurrentAccount(request);
    if (!account) throw new LearningError(401, "Sign in to continue.");
    if (Number(request.headers.get("Content-Length") ?? 0) > 250000) throw new LearningError(413, "Request too large.");
    const text = await request.text();
    if (text.length > 250000) throw new LearningError(413, "Request too large.");
    const { action, data } = JSON.parse(text);
    let result;
    if (action === "create") result = await saveResource(account, data);
    else if (action === "edit") {
      const target = z.object({ id: z.string().uuid(), version: z.number().int().positive() }).parse(data);
      result = await saveResource(account, data.resource, target);
    }
    else if (action === "progress") result = await recordProgress(account, data);
    else {
      const transition = z.object({ id: z.string().uuid(), version: z.number().int().positive(), action: z.enum(["submit", "approve", "publish", "withdraw"]) }).parse({ ...data, action });
      result = await transitionResource(account, transition.id, transition.version, transition.action);
    }
    return NextResponse.json({ success: true, data: result }, { headers: nativeApiHeaders(request) });
  } catch (error) { return failure(error, request); }
}
