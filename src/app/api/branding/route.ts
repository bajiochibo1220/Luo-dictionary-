import { NextResponse } from "next/server";
import { nativeApiHeaders, nativePreflight } from "@/lib/native-api-headers";
import { getSystemSettings } from "@/lib/settings";
export const OPTIONS = nativePreflight;
export async function GET(request: Request) {
  const headers = nativeApiHeaders(request);
  try {
    const settings = await getSystemSettings();
    return NextResponse.json({ success: true, data: Object.fromEntries(["jooust_logo_url", "jooust_color"].map(key => [key, settings[key] || ""])) }, { headers });
  } catch { return NextResponse.json({ success: false, error: "Branding unavailable." }, { status: 503, headers }); }
}
