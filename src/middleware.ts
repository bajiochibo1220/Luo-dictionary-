import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

const PUBLIC_PATHS = [
  "/",
  "/mobile-apps",
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
  if (["/api/songs", "/api/proverbs", "/api/riddles", "/api/dictionary", "/api/artifacts", "/api/folktales", "/api/oral-histories", "/api/heritage-sites", "/api/media"].some((p) => pathname === p || pathname.startsWith(`${p}/`))) return true;
  if (pathname.startsWith("/_next")) return true;
  if (pathname.startsWith("/favicon")) return true;
  if (/\.(svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|css|js|webmanifest)$/i.test(pathname)) {
    return true;
  }
  return false;
}

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;
  const isAuthEntry = pathname === "/" || pathname === "/login" || pathname === "/register";

  // Public routes always allowed
  if (isPublic(pathname) && !isAuthEntry) {
    const culture = req.nextUrl.searchParams.get("culture");
    if (culture && /^[a-z]{2,8}(?:-[a-z0-9]+)?$/i.test(culture)) {
      req.cookies.set("content-culture", culture.toLowerCase());
      const response = NextResponse.next({ request: { headers: req.headers } });
      response.cookies.set("content-culture", culture.toLowerCase(), {
        httpOnly: true,
        sameSite: "lax",
        secure: req.nextUrl.protocol === "https:",
        path: "/",
        maxAge: 60 * 60 * 24 * 365,
      });
      return response;
    }
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
    if (isAuthEntry) {
      return NextResponse.next();
    }
    return NextResponse.redirect(
      new URL("/login?callbackUrl=" + encodeURIComponent(pathname), req.url)
    );
  }

  // Logged in
  const user = token as any;
  const isSuperAdmin = user && (user.isSuperAdmin === true || user.isMasterSuperAdmin === true);
  const roles = (user && user.languageRoles) || [];
  const isAdmin =
    isSuperAdmin ||
    roles.some(function (lr: any) {
      return (
        lr.role === "language_admin" ||
        lr.role === "uploader" ||
        lr.role === "publisher" ||
        lr.role === "content_editor" ||
        lr.role === "cultural_expert"
      );
    });

  // Logged-in user on public home → dashboard
  if (isAuthEntry) {
    const landingPath = user.isMasterSuperAdmin === true
      ? "/super-admin/dashboard"
      : isAdmin
      ? "/admin/dashboard"
      : "/dashboard";
    return NextResponse.redirect(
      new URL(landingPath, req.url)
    );
  }

  // OAuth sign-in returns to the shared dashboard URL; route staff accounts
  // to their admin area based on the authenticated account's permissions.
  if (pathname === "/dashboard" && user.isMasterSuperAdmin === true) {
    return NextResponse.redirect(new URL("/super-admin/dashboard", req.url));
  }
  if (pathname === "/dashboard" && isAdmin) {
    return NextResponse.redirect(new URL("/admin/dashboard", req.url));
  }

  // Super-admin routes
  if (pathname.indexOf("/super-admin") === 0 && user.isMasterSuperAdmin !== true) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // Administrative routes are protected by account permissions.
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
