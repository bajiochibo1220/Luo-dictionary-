import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

const PUBLIC_PATHS = ["/", "/login", "/register"];

function isPublic(pathname: string): boolean {
  if (PUBLIC_PATHS.includes(pathname)) return true;
  if (pathname.startsWith("/api/auth")) return true;
  if (pathname.startsWith("/api/languages")) return true;
  if (pathname.startsWith("/_next")) return true;
  if (pathname.startsWith("/favicon")) return true;
  if (/\.(svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|css|js)$/i.test(pathname))
    return true;
  return false;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isSecure = req.nextUrl.protocol === "https:";
  const cookieName = isSecure
    ? "__Secure-authjs.session-token"
    : "authjs.session-token";

  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
    cookieName,
    salt: cookieName,
    secureCookie: isSecure,
  });

  const user = token as any;

  const hasRoles = ((user?.languageRoles ?? []) as any[]).length > 0;
  const isSuperAdmin = user?.isSuperAdmin === true;
  const needsOnboarding = !!token && !isSuperAdmin && !hasRoles;

  // Force onboarding for users without a language
  if (needsOnboarding) {
    if (
      pathname === "/onboarding" ||
      pathname.startsWith("/api/onboarding") ||
      isPublic(pathname)
    ) {
      return NextResponse.next();
    }
    return NextResponse.redirect(new URL("/onboarding", req.url));
  }

  // Already onboarded → don't let them revisit /onboarding
  if (token && !needsOnboarding && pathname === "/onboarding") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // Logged-in users on landing/auth pages → dashboard
  if (token && ["/", "/login", "/register"].includes(pathname)) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  if (isPublic(pathname)) {
    return NextResponse.next();
  }

  if (!token) {
    return NextResponse.redirect(
      new URL(`/login?callbackUrl=${encodeURIComponent(pathname)}`, req.url)
    );
  }

  if (pathname.startsWith("/super-admin") && !isSuperAdmin) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  if (pathname.startsWith("/admin")) {
    const isAdmin =
      isSuperAdmin ||
      (user?.languageRoles ?? []).some((lr: any) =>
        [
          "language_admin",
          "moderator",
          "content_editor",
          "cultural_expert",
        ].includes(lr.role)
      );
    if (!isAdmin) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};