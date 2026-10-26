import { handleConversation } from "@/lib/chat-handlers";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ id: string }> };
export async function GET(request: Request, context: Context) { return handleConversation(request, (await context.params).id); }
export const PATCH = GET;
export const DELETE = GET;
