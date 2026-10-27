import { NextResponse } from "next/server";
import { z } from "zod";
import { sameOriginBrowserPost } from "@/lib/native-api-headers";
import { requestPasswordResetCode, completePasswordResetCode } from "@/lib/account-security";

const email = z.string().trim().toLowerCase().email().max(254);
const input = z.discriminatedUnion("action", [
  z.object({ action: z.literal("request"), email }).strict(),
  z.object({ action: z.literal("complete"), email, code: z.string().regex(/^\d{6}$/), password: z.string().min(12).max(128) }).strict(),
]);

export async function POST(request: Request) {
  const headers = { "Cache-Control": "no-store" };
  if (!sameOriginBrowserPost(request)) return NextResponse.json({ error: "Same-origin request required." }, { status: 403, headers });
  try {
    const data = input.parse(await request.json());
    if (data.action === "request") await requestPasswordResetCode(data.email);
    else await completePasswordResetCode(data.email, data.code, data.password);
    return NextResponse.json({ success: true, message: data.action === "request" ? "If an active account matches, a reset code will arrive by email. Check your inbox and spam folder. The code expires in 10 minutes." : "Your password has been reset. You can sign in with your new password." }, { headers });
  } catch (error: unknown) {
    const serviceError = error as { status?: number; message?: string };
    const status = error instanceof z.ZodError || error instanceof SyntaxError ? 400 : [400, 409, 429, 503].includes(serviceError.status ?? 0) ? serviceError.status! : 503;
    return NextResponse.json({ error: error instanceof z.ZodError || error instanceof SyntaxError ? "Enter a valid email, six-digit code and a password of 12–128 characters." : status === 503 ? "Password reset is temporarily unavailable. Please try again later." : serviceError.message }, { status, headers });
  }
}
