import { NextRequest, NextResponse } from "next/server";
import { appApiHeaders } from "@/lib/app-api-headers";
import { assertServiceAvailable } from "@/lib/maintenance";
import { getPublicReading } from "@/lib/public-reading";

export const dynamic = "force-dynamic";
export function OPTIONS(request: NextRequest) {
  return new NextResponse(null, { status: 204, headers: appApiHeaders(request.headers.get("origin")) });
}
export async function GET(request: NextRequest) {
  const headers = appApiHeaders(request.headers.get("origin"));
  const id = request.nextUrl.searchParams.get("id") || "";
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(id)) return NextResponse.json({ success: false, error: "Choose a valid item." }, { status: 400, headers });
  try {
    await assertServiceAvailable();
    const reading = await getPublicReading(id);
    return reading ? NextResponse.json({ success: true, data: reading }, { headers })
      : NextResponse.json({ success: false, error: "This item is not available for public reading." }, { status: 404, headers });
  } catch {
    return NextResponse.json({ success: false, error: "The transcript could not load. Please try again." }, { status: 503, headers });
  }
}
