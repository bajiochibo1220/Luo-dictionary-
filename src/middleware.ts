import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

const PUBLIC_PATHS = [
  "/",
  "/login",
  "/register",
  "/admin-login",
  "/admin-register",
];

function isPublic(pathname: string): boolean {
  if (PUBLIC_PATHS.includes(pathname)) return true;
  if (pathname.startsWith("/api/auth")) return true;
  if (pathname.startsWith("/api/languages")) return true;
  // The language library is readable without an account. Contributions and
  // dashboard/admin endpoints still require a session.
  const firstSegment = pathname.split("/")[1];
  const reservedSegments = ["admin", "api", "super-admin", "dashboard", "onboarding", "chatbot", "my-submissions", "contribute", "admin-login", "admin-register"];
  if (!reservedSegments.includes(firstSegment) && /^\/[a-z]{2,8}(?:-[a-z0-9]+)?(?:\/|$)/i.test(pathname)) return true;
  if (["/api/songs", "/api/proverbs", "/api/riddles", "/api/dictionary", "/api/artifacts", "/api/folktales", "/api/oral-histories", "/api/heritage-sites"].some((p) => pathname === p || pathname.startsWith(`${p}/`))) return true;
  if (pathname.startsWith("/_next")) return true;
  if (pathname.startsWith("/favicon")) return true;
  if (/\.(svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|css|js)$/i.test(pathname)) {
    return true;
  }
  return false;
}

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  // Public routes always allowed
  if (isPublic(pathname)) {
    return NextResponse.next();
  }

  const isSecure = req.nextUrl.protocol === "https:";
  const cookieName = isSecure
    ? "__Secure-authjs.session-token"
    : "authjs.session-token";

  let token = null;
  try {
    token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
      cookieName: cookieName,
      salt: cookieName,
      secureCookie: isSecure,
    });
  } catch (err) {
    console.error("[middleware] getToken failed:", err);
    token = null;
  }

  // Not logged in
  if (!token) {
    if (
      pathname === "/" ||
      pathname === "/login" ||
      pathname === "/register"
    ) {
      return NextResponse.next();
    }
    return NextResponse.redirect(
      new URL("/login?callbackUrl=" + encodeURIComponent(pathname), req.url)
    );
  }

  // Logged in
  const user = token as any;
  const isSuperAdmin = user && user.isSuperAdmin === true;
  const roles = (user && user.languageRoles) || [];
  const isAdmin =
    isSuperAdmin ||
    roles.some(function (lr: any) {
      return (
        lr.role === "language_admin" ||
        lr.role === "moderator" ||
        lr.role === "content_editor" ||
        lr.role === "cultural_expert"
      );
    });

  // Logged-in user on public home → dashboard
  if (
    pathname === "/" ||
    pathname === "/login" ||
    pathname === "/register"
  ) {
    return NextResponse.redirect(
      new URL(isAdmin ? "/admin/dashboard" : "/dashboard", req.url)
    );
  }

  // Force onboarding for users without a language role
  const needsOnboarding = !isSuperAdmin && roles.length === 0;
  if (
    needsOnboarding &&
    pathname !== "/onboarding" &&
    !pathname.startsWith("/api/onboarding") &&
    !pathname.startsWith("/api/auth") &&
    !pathname.startsWith("/api/languages")
  ) {
    return NextResponse.redirect(new URL("/onboarding", req.url));
  }

  // Super-admin routes
  if (pathname.indexOf("/super-admin") === 0 && !isSuperAdmin) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // Admin routes (use exact match to avoid /admin-login clash)
  const isAdminRoute =
    pathname === "/admin" || pathname.indexOf("/admin/") === 0;
  if (isAdminRoute && !isAdmin) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
