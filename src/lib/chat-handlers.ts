import { NextResponse } from "next/server";
import { getCurrentAccount } from "@/lib/account-data";
import { nativeApiHeaders, sameOriginBrowserPost } from "@/lib/native-api-headers";
import { assertServiceAvailable } from "@/lib/maintenance";
import { ChatRequestSchema, ConversationIdSchema, ConversationUpdateSchema, ConversationCreateSchema } from "@/lib/chat-contract";
import { prisma } from "@/lib/db";
import { appApiHeaders } from "@/lib/app-api-headers";
import { answerChat, ChatRequestError } from "@/lib/chat-service";
import { getConversation, updateConversation, deleteConversation } from "@/lib/conversation-data";
import { AiProviderError } from "@/lib/ai/gemini-errors";

function failure(request: Request, status: number, error: string, extra: Record<string, string> = {}) {
  return NextResponse.json({ success: false, error }, { status, headers: { ...nativeApiHeaders(request), ...extra } });
}
export function guestChatHeaders(request: Request) {
  const headers = nativeApiHeaders(request);
  if (!request.headers.has("Authorization") && !request.headers.has("Cookie")) {
    const origin = appApiHeaders(request.headers.get("Origin"))["Access-Control-Allow-Origin"];
    if (origin) {
      headers["Access-Control-Allow-Origin"] = origin;
      headers["Access-Control-Allow-Methods"] = "POST, OPTIONS";
      headers["Access-Control-Allow-Headers"] = "Content-Type";
    }
  }
  return headers;
}
export function chatPreflight(request: Request) {
  const requested = (request.headers.get("Access-Control-Request-Headers") ?? "").toLowerCase().split(",").map(value => value.trim());
  const headers = requested.includes("authorization") ? nativeApiHeaders(request) : guestChatHeaders(request);
  return new NextResponse(null, { status: headers["Access-Control-Allow-Origin"] ? 204 : 403, headers });
}
export function trustedChatMutation(request: Request) {
  // Bearer requests do not use browser cookies. Cross-origin cookies cannot
  // authorize a write; a web write must carry its own origin and JSON type.
  return request.headers.has("Authorization") || sameOriginBrowserPost(request)
    || (!!nativeApiHeaders(request)["Access-Control-Allow-Origin"] && !request.headers.has("Cookie")
      && request.headers.get("Content-Type")?.split(";")[0].trim() === "application/json");
}

export async function createConversation(request: Request) {
  try {
    if (!trustedChatMutation(request)) return failure(request, 403, "Open this action from your account.");
    const account = await getCurrentAccount(request);
    if (!account) return failure(request, 401, "Your session expired. Please sign in again.");
    const input = ConversationCreateSchema.safeParse(await request.json().catch(() => null));
    if (!input.success) return failure(request, 400, "Enter a chat title of 1–120 characters.");
    await assertServiceAvailable();
    const data = await prisma.conversation.create({ data: { userId: account.id, title: input.data.title },
      select: { id: true, title: true, pinned: true, archived: true } });
    return NextResponse.json({ success: true, data }, { headers: nativeApiHeaders(request) });
  } catch { return failure(request, 503, "Unable to create a chat right now."); }
}

export async function postChat(request: Request) {
  const headers = guestChatHeaders(request);
  const fail = (status: number, message: string, extra: Record<string, string> = {}) => NextResponse.json({ success: false, error: message }, { status, headers: { ...headers, ...extra } });
  try {
    const anonymousOrigin = !request.headers.has("Authorization") && !request.headers.has("Cookie")
      && !!headers["Access-Control-Allow-Origin"] && request.headers.get("Content-Type")?.split(";")[0].trim() === "application/json";
    if (!trustedChatMutation(request) && !anonymousOrigin) return fail(403, "Open the chat from this app to send a message.");
    const input = ChatRequestSchema.safeParse(await request.json().catch(() => null));
    if (!input.success) return fail(400, "Enter a question of 2–2000 characters, choose valid settings and allow AI processing.");
    const account = await getCurrentAccount(request);
    const hasSessionCookie = /(?:^|;\s*)(?:__Secure-)?(?:authjs|next-auth)\.session-token(?:\.\d+)?=/.test(request.headers.get("Cookie") ?? "");
    if (!account && (request.headers.has("Authorization") || hasSessionCookie)) return fail(401, "Your session expired. Please sign in again.");
    await assertServiceAvailable();
    return NextResponse.json({ success: true, data: await answerChat(request, account, input.data) }, { headers });
  } catch (error) {
    if (error instanceof ChatRequestError) return fail(error.status, error.message);
    if (error instanceof AiProviderError) return fail(error.status, error.message);
    const controlled = error as { status?: number; retryAfter?: number };
    if (controlled?.status === 429) return fail(429, "AI request limit reached. Please try again later.",
      Number.isFinite(controlled.retryAfter) ? { "Retry-After": String(Math.max(1, Math.ceil(controlled.retryAfter!))) } : {});
    return fail(503, "Chat is temporarily unavailable. Please try again shortly.");
  }
}

export async function handleConversation(request: Request, id: string) {
  try {
    if (request.method !== "GET" && !trustedChatMutation(request)) return failure(request, 403, "Open this action from your account.");
    const account = await getCurrentAccount(request);
    if (!account) return failure(request, 401, "Your session expired. Please sign in again.");
    if (!ConversationIdSchema.safeParse(id).success) return failure(request, 404, "Chat not found.");
    await assertServiceAvailable();
    let data;
    if (request.method === "GET") {
      const before = new URL(request.url).searchParams.get("before") ?? undefined;
      if (before && !ConversationIdSchema.safeParse(before).success) return failure(request, 400, "Invalid message cursor.");
      data = await getConversation(account.id, id, before);
    } else if (request.method === "PATCH") {
      const input = ConversationUpdateSchema.safeParse(await request.json().catch(() => null));
      if (!input.success) return failure(request, 400, "Provide a valid chat title, pin or archive setting.");
      data = await updateConversation(account.id, id, input.data);
    } else if (request.method === "DELETE") {
      data = await deleteConversation(account.id, id) ? { id } : null;
    } else return failure(request, 405, "Unsupported action.");
    return data ? NextResponse.json({ success: true, data }, { headers: nativeApiHeaders(request) }) : failure(request, 404, "Chat not found.");
  } catch { return failure(request, 503, "This chat action is temporarily unavailable."); }
}
