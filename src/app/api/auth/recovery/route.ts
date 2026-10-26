import { NextResponse } from "next/server";
import { z } from "zod";
import { sameOriginBrowserPost } from "@/lib/native-api-headers";
import { requestAccountEmail, completeAccountEmail } from "@/lib/account-security";
const input = z.union([
  z.object({ action: z.literal("request"), email: z.string().email().max(254), purpose: z.enum(["reset", "verify", "delete"]) }),
  z.object({ action: z.literal("complete"), token: z.string().regex(/^[A-Za-z0-9_-]{43}$/), purpose: z.enum(["reset", "verify", "delete"]), password: z.string().min(12).max(128).optional() }).refine(value => value.purpose !== "reset" || !!value.password),
]);
export async function POST(request: Request) {
  if (!sameOriginBrowserPost(request)) return NextResponse.json({ success: false, error: "Same-origin request required." }, { status: 403 });
  try {
    const data = input.parse(await request.json());
    if (data.action === "request") await requestAccountEmail(data.email.trim().toLowerCase(), data.purpose);
    else await completeAccountEmail(data.token, data.purpose, data.password);
    return NextResponse.json({ success: true, message: data.action === "request" ? "If an active account matches, an email will arrive shortly." : data.purpose === "delete" ? "Your account has been deleted. Required cultural-source, consent and audit evidence is retained under institutional policy." : "Account updated. You can sign in now." }, { headers: { "Cache-Control": "no-store" } });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error instanceof z.ZodError ? "Check the email, link and password (at least 12 characters)." : [400, 409, 429, 503].includes(error.status) ? error.message : "Account service is temporarily unavailable." }, { status: error instanceof z.ZodError ? 400 : [400, 409, 429, 503].includes(error.status) ? error.status : 503 });
  }
}
