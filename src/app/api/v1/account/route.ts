import { NextResponse } from "next/server";
import { getCurrentAccount } from "@/lib/account-data";
import { nativeApiHeaders, nativePreflight } from "@/lib/native-api-headers";

export const dynamic = "force-dynamic";
export const OPTIONS = nativePreflight;

export async function GET(request: Request) {
  const headers = nativeApiHeaders(request);
  try {
    const account = await getCurrentAccount(request);
    if (!account) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401, headers });
    return NextResponse.json({ success: true, data: account }, { headers });
  } catch {
    return NextResponse.json({ success: false, error: "Account information is temporarily unavailable." }, { status: 503, headers });
  }
}
