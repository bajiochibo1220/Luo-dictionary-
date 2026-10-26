import { NextResponse } from "next/server";
import { exchangeNativeAuthorization } from "@/lib/native-auth";
import { NativeExchangeSchema } from "@/lib/native-auth-contract";
import { nativeApiHeaders, nativePreflight } from "@/lib/native-api-headers";
import { assertServiceAvailable } from "@/lib/maintenance";

export const dynamic = "force-dynamic";
export const OPTIONS = nativePreflight;
export async function POST(request: Request) {
  const headers = nativeApiHeaders(request);
  try {
    const input = NativeExchangeSchema.safeParse(await request.json().catch(() => null));
    if (!input.success) return NextResponse.json({ success: false, error: "Invalid sign-in request." }, { status: 400, headers });
    await assertServiceAvailable();
    const session = await exchangeNativeAuthorization(input.data);
    if (!session) return NextResponse.json({ success: false, error: "Sign-in expired or could not be verified. Please sign in again." }, { status: 401, headers });
    return NextResponse.json({ success: true, data: session }, { headers });
  } catch {
    return NextResponse.json({ success: false, error: "Sign-in is temporarily unavailable." }, { status: 503, headers });
  }
}
