import { NextResponse } from "next/server";
import { revokeNativeSession } from "@/lib/native-auth";
import { nativeApiHeaders, nativePreflight } from "@/lib/native-api-headers";

export const dynamic = "force-dynamic";
export const OPTIONS = nativePreflight;
export async function POST(request: Request) {
  const headers = nativeApiHeaders(request);
  try {
    await revokeNativeSession(request.headers.get("Authorization"), await request.json().catch(() => undefined));
    return NextResponse.json({ success: true }, { headers });
  } catch {
    return NextResponse.json({ success: false, error: "Server sign-out could not be confirmed. Reconnect to finish signing out." }, { status: 503, headers });
  }
}
