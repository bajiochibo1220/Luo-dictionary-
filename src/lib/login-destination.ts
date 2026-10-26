import { hasAnyAdminRole, isSuperAdmin } from "@/lib/permissions";

export function publicApplicationReturn(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 4096 || /[\\\u0000-\u001f\u007f]/.test(value)) return null;
  return value === "/application" || value.startsWith("/application#/") && !value.startsWith("/application#//") ? value : null;
}

export function loginDestination(session: Parameters<typeof hasAnyAdminRole>[0], returnTo?: unknown): string {
  if (!session?.user?.id) return "/login";
  // Account roles always win over a remembered public-library location.
  if (isSuperAdmin(session)) return "/super-admin/dashboard";
  if (hasAnyAdminRole(session)) return "/admin/dashboard";
  return publicApplicationReturn(returnTo) || "/dashboard";
}

export function nativeLoginDestination(session: Parameters<typeof hasAnyAdminRole>[0]) {
  return session?.user?.id && hasAnyAdminRole(session) ? "/workspace" : "/account";
}
