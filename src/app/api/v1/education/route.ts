import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentAccount } from "@/lib/account-data";
import { nativeApiHeaders, nativePreflight, sameOriginBrowserPost } from "@/lib/native-api-headers";
import { appApiHeaders } from "@/lib/app-api-headers";
import { assertServiceAvailable } from "@/lib/maintenance";
import { EducationError, educationAction, educationRead } from "@/lib/education-service";

export const dynamic = "force-dynamic";
export const OPTIONS = nativePreflight;
function failure(request: Request, error: unknown) {
  const status = error instanceof EducationError ? error.status : error instanceof z.ZodError || error instanceof SyntaxError ? 400 : 503;
  const message = error instanceof EducationError ? error.message : error instanceof z.ZodError ? error.issues[0]?.message : status === 400 ? "Invalid request." : "Education services are temporarily unavailable. Please retry.";
  return NextResponse.json({ success: false, error: message }, { status, headers: nativeApiHeaders(request) });
}
export async function GET(request: Request) {
  try {
    await assertServiceAvailable();
    const data = await educationRead(new URL(request.url).searchParams, await getCurrentAccount(request));
    return NextResponse.json({ success: true, data }, { headers: { ...appApiHeaders(request.headers.get("Origin")), ...nativeApiHeaders(request) } });
  } catch (error) { return failure(request, error); }
}
export async function POST(request: Request) {
  try {
    await assertServiceAvailable();
    if (!request.headers.has("Authorization") && !sameOriginBrowserPost(request)) throw new EducationError(403, "Use a same-origin request.");
    const account = await getCurrentAccount(request);
    if (!account) throw new EducationError(401, "Sign in to continue.");
    if (Number(request.headers.get("Content-Length") || 0) > 250000) throw new EducationError(413, "Request too large.");
    const text = await request.text();
    if (text.length > 250000) throw new EducationError(413, "Request too large.");
    return NextResponse.json({ success: true, data: await educationAction(account, JSON.parse(text)) }, { headers: nativeApiHeaders(request) });
  } catch (error) { return failure(request, error); }
}
