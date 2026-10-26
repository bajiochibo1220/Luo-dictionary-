import { NextResponse } from "next/server";
import { nativeApiHeaders, nativePreflight } from "@/lib/native-api-headers";
export const OPTIONS = nativePreflight;
export async function POST(request: Request) {
  return NextResponse.json({ success: false, error: "Phone sign-in is no longer available. Use Google or email and password." }, { status: 410, headers: nativeApiHeaders(request) });
}
