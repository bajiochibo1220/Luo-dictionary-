import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { hasAnyAdminRole, isSuperAdmin } from "@/lib/permissions";

export async function GET(request: Request) {
  const session = await auth();
  const destination = !session?.user ? "/login"
    : isSuperAdmin(session) ? "/super-admin/dashboard"
    : hasAnyAdminRole(session) ? "/admin/dashboard" : "/dashboard";
  return NextResponse.redirect(new URL(destination, request.url));
}
