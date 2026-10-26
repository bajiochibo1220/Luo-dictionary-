import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createNativeAuthorization } from "@/lib/native-auth";
import { NativeAuthorizationSchema } from "@/lib/native-auth-contract";
import { nativeApiHeaders, sameOriginBrowserPost } from "@/lib/native-api-headers";
import { assertServiceAvailable } from "@/lib/maintenance";

export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  const headers = nativeApiHeaders();
  if (!sameOriginBrowserPost(request)) return NextResponse.json({ success: false, error: "Invalid browser request." }, { status: 403, headers });
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401, headers });
    const input = NativeAuthorizationSchema.safeParse(await request.json().catch(() => null));
    if (!input.success) return NextResponse.json({ success: false, error: "Invalid sign-in request." }, { status: 400, headers });
    await assertServiceAvailable();
    const callback = await createNativeAuthorization(session.user.id, input.data);
    if (!callback) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401, headers });
    return NextResponse.json({ success: true, data: { callback } }, { headers });
  } catch {
    return NextResponse.json({ success: false, error: "Sign-in is temporarily unavailable." }, { status: 503, headers });
  }
}
