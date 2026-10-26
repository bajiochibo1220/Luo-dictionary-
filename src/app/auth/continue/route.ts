import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { loginDestination } from "@/lib/login-destination";

export async function GET(request: Request) {
  const session = await auth();
  const destination = loginDestination(session, new URL(request.url).searchParams.get("returnTo"));
  return NextResponse.redirect(new URL(destination, request.url));
}
