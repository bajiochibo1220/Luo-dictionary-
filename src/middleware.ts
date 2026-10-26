import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { nativeApiHeaders } from "@/lib/native-api-headers";

const PUBLIC_PATHS = [
  "/",
  "/chatbot",
  "/mobile-apps",
  "/application",
];

function isPublic(pathname: string): boolean {
  if (PUBLIC_PATHS.includes(pathname)) return true;
  if (pathname === "/api/branding") return true;
  if (pathname === "/api/interface-copy") return true;
  if (pathname === "/api/app-version") return true;
  if (pathname === "/api/v1/bootstrap") return true;
  if (pathname === "/api/v1/library") return true;
  if (pathname === "/api/v1/learning") return true;
  if (pathname === "/api/v1/education") return true;
  if (pathname === "/api/v1/account/settings") return true;
  if (pathname === "/api/v1/saved") return true;
  // These exact endpoints perform their own browser/bearer authentication.
  // Other private APIs still require the existing web session middleware.
  if (["/api/v1/account", "/api/v1/account/conversations", "/api/v1/native/authorize", "/api/v1/native/token", "/api/v1/native/refresh", "/api/v1/native/revoke"].includes(pathname)) return true;
  if (pathname === "/api/v1/chat" || /^\/api\/v1\/account\/conversations\/[A-Za-z0-9_-]{1,128}$/.test(pathname)) return true;
  if (pathname.startsWith("/api/auth")) return true;
  if (pathname.startsWith("/api/languages")) return true;
  // The language library is readable without an account. Contributions and
  // dashboard/admin endpoints still require a session.
  const firstSegment = pathname.split("/")[1];
  const reservedSegments = ["admin", "api", "super-admin", "dashboard", "onboarding", "my-submissions", "contribute", "admin-login", "admin-register"];
  if (!reservedSegments.includes(firstSegment) && /^\/[a-z]{2,8}(?:-[a-z0-9]+)?(?:\/|$)/i.test(pathname)) return true;
  if (["/api/songs", "/api/proverbs", "/api/riddles", "/api/dictionary", "/api/artifacts", "/api/folktales", "/api/oral-histories", "/api/heritage-sites", "/api/media"].some((p) => pathname === p || pathname.startsWith(`${p}/`))) return true;
  if (pathname === "/api/ai/chat" || pathname === "/api/ai/search") return true;
  if (pathname.startsWith("/_next")) return true;
  if (pathname.startsWith("/favicon")) return true;
  if (/\.(svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|css|js|webmanifest)$/i.test(pathname)) {
    return true;
  }
  return false;
}

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;
  if (pathname.startsWith("/api/")) {
    const cors = nativeApiHeaders(req);
    if (req.method === "OPTIONS" && cors["Access-Control-Allow-Origin"]) return new NextResponse(null, { status: 204, headers: cors });
    // Handler authentication validates the token and reloads current roles.
    // This branch is delegation only; it does not itself grant access.
    if (req.headers.has("Authorization")) return NextResponse.next({ headers: cors });
  }
  // Older bookmarks and installed launch URLs must bypass the retired
  // language landing layout. The root selects login or the current dashboard.
  if (pathname === "/luo" || pathname === "/eng") {
    return NextResponse.redirect(new URL("/", req.url));
  }
  const isAuthEntry = pathname === "/login" || pathname === "/register";

  // Login pages verify the current account on the server. A stale JWT must
  // never bounce a suspended account between login and its old dashboard.
  if (isAuthEntry) return NextResponse.next();

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
      secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
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
    if (pathname.startsWith("/api/")) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
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
        lr.role === "content_editor"
      );
    });

  // Super-admin routes
  if (pathname.indexOf("/super-admin") === 0 && !isSuperAdmin) {
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
