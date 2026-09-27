import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });

  const user = token as any;

  // Protect /super-admin/*
  if (pathname.startsWith("/super-admin")) {
    if (!token) {
      return NextResponse.redirect(
        new URL(`/login?callbackUrl=${encodeURIComponent(pathname)}`, req.url)
      );
    }
    if (!user?.isSuperAdmin) {
      return NextResponse.redirect(new URL("/", req.url));
    }
    return NextResponse.next();
  }

  // Protect /admin/*
  if (pathname.startsWith("/admin")) {
    if (!token) {
      return NextResponse.redirect(
        new URL(`/login?callbackUrl=${encodeURIComponent(pathname)}`, req.url)
      );
    }
    const isAdmin =
      user?.isSuperAdmin ||
      (user?.languageRoles ?? []).some((lr: any) =>
        ["language_admin", "moderator", "content_editor", "cultural_expert"].includes(
          lr.role
        )
      );
    if (!isAdmin) {
      return NextResponse.redirect(new URL("/", req.url));
    }
    return NextResponse.next();
  }

  // Protect /dashboard/*
  if (pathname.startsWith("/dashboard")) {
    if (!token) {
      return NextResponse.redirect(
        new URL(`/login?callbackUrl=${encodeURIComponent(pathname)}`, req.url)
      );
    }
    return NextResponse.next();
  }

  // Redirect logged-in users away from /login and /register
  if (token && (pathname === "/login" || pathname === "/register")) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/super-admin/:path*",
    "/dashboard/:path*",
    "/login",
    "/register",
  ],
};