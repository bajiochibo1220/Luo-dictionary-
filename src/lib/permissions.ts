import type { Session } from "next-auth";

export type LanguageRole = {
  languageId: number;
  languageCode: string;
  languageName: string;
  role: string;
};

function getRoles(session: Session | null): LanguageRole[] {
  if (!session?.user) return [];
  return (session.user as any).languageRoles ?? [];
}

export function isAuthenticated(session: Session | null): boolean {
  return !!session?.user;
}

export function isSuperAdmin(session: Session | null): boolean {
  return !!(session?.user as any)?.isSuperAdmin;
}

export function hasRole(
  session: Session | null,
  languageId: number,
  role: string
): boolean {
  return getRoles(session).some(
    (lr) => lr.languageId === languageId && lr.role === role
  );
}

export function isLanguageAdmin(
  session: Session | null,
  languageId: number
): boolean {
  return isSuperAdmin(session) || hasRole(session, languageId, "language_admin");
}

export function isModerator(
  session: Session | null,
  languageId: number
): boolean {
  return (
    isSuperAdmin(session) ||
    hasRole(session, languageId, "moderator") ||
    hasRole(session, languageId, "language_admin")
  );
}

export function canManageLanguage(
  session: Session | null,
  languageId: number
): boolean {
  return isLanguageAdmin(session, languageId);
}

export function canReviewContent(
  session: Session | null,
  languageId: number
): boolean {
  return (
    isSuperAdmin(session) ||
    hasRole(session, languageId, "moderator") ||
    hasRole(session, languageId, "language_admin") ||
    hasRole(session, languageId, "content_editor")
  );
}

export function canValidateCulture(
  session: Session | null,
  languageId: number
): boolean {
  return (
    isSuperAdmin(session) ||
    hasRole(session, languageId, "cultural_expert") ||
    hasRole(session, languageId, "language_admin")
  );
}

export function canContribute(
  session: Session | null,
  languageId: number
): boolean {
  return (
    isSuperAdmin(session) ||
    hasRole(session, languageId, "contributor") ||
    hasRole(session, languageId, "elder") ||
    hasRole(session, languageId, "moderator") ||
    hasRole(session, languageId, "content_editor") ||
    hasRole(session, languageId, "language_admin")
  );
}

export function getManagedLanguageIds(session: Session | null): number[] {
  if (isSuperAdmin(session)) return [];
  return getRoles(session)
    .filter((lr) => lr.role === "language_admin")
    .map((lr) => lr.languageId);
}

export function hasAnyAdminRole(session: Session | null): boolean {
  if (isSuperAdmin(session)) return true;
  return getRoles(session).some((lr) =>
    ["language_admin", "moderator", "content_editor", "cultural_expert"].includes(
      lr.role
    )
  );
}