import { NextRequest, NextResponse } from "next/server";
import { getCurrentAccount, getConversationHistory } from "@/lib/account-data";
import { assertServiceAvailable } from "@/lib/maintenance";
import { nativeApiHeaders, nativePreflight } from "@/lib/native-api-headers";

export const dynamic = "force-dynamic";
export const OPTIONS = nativePreflight;
export { createConversation as POST } from "@/lib/chat-handlers";

export async function GET(request: NextRequest) {
  const headers = nativeApiHeaders(request);
  try {
    const account = await getCurrentAccount(request);
    if (!account) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401, headers });
    await assertServiceAvailable();
    const data = await getConversationHistory(account.id, request.nextUrl.searchParams.get("archived") === "true");
    return NextResponse.json({ success: true, data }, { headers });
  } catch {
    return NextResponse.json({ success: false, error: "Chat history is temporarily unavailable." }, { status: 503, headers });
  }
}
