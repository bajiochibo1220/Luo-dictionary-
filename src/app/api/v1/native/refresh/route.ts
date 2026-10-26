import { NextResponse } from "next/server";
import { refreshNativeSession } from "@/lib/native-auth";
import { NativeRefreshSchema } from "@/lib/native-auth-contract";
import { nativeApiHeaders, nativePreflight } from "@/lib/native-api-headers";
import { assertServiceAvailable } from "@/lib/maintenance";

export const dynamic = "force-dynamic";
export const OPTIONS = nativePreflight;
export async function POST(request: Request) {
  const headers = nativeApiHeaders(request);
  try {
    const input = NativeRefreshSchema.safeParse(await request.json().catch(() => null));
    if (!input.success) return NextResponse.json({ success: false, error: "Invalid session renewal." }, { status: 400, headers });
    await assertServiceAvailable();
    const session = await refreshNativeSession(input.data);
    if (!session) return NextResponse.json({ success: false, error: "Your session ended. Please sign in again." }, { status: 401, headers });
    return NextResponse.json({ success: true, data: session }, { headers });
  } catch {
    return NextResponse.json({ success: false, error: "Session renewal cannot connect right now. Try again when online." }, { status: 503, headers });
  }
}
