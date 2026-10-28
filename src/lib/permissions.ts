// Structural session contract keeps authorization usable in bundled clients
// without pulling Next.js server/experimental React types into native builds.
type Session = {
  expires?: string;
  user?: { id?: string; email?: string | null; name?: string | null; isSuperAdmin?: boolean; isMasterSuperAdmin?: boolean; languageRoles?: LanguageRole[] };
};

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
  return !!session?.user?.id;
}

export function isSuperAdmin(session: Session | null): boolean {
  return !!((session?.user as any)?.isSuperAdmin || (session?.user as any)?.isMasterSuperAdmin);
}

export function isMasterSuperAdmin(session: Session | null): boolean {
  return !!(session?.user as any)?.isMasterSuperAdmin;
}

export function hasRole(
  session: Session | null,
  languageId: number,
  role: string
): boolean {
  return getRoles(session).some(
    (lr) => lr.languageId === languageId && (lr.role === role || role === "content_editor" && lr.role === "cultural_expert")
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
    isSuperAdmin(session) || hasRole(session, languageId, "language_admin")
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
    isMasterSuperAdmin(session) ||
    hasRole(session, languageId, "language_admin") ||
    hasRole(session, languageId, "content_editor")
  );
}

export function canValidateCulture(
  session: Session | null,
  languageId: number
): boolean {
  // Editors review cultural accuracy and both language versions before publishing.
  return isMasterSuperAdmin(session) || hasRole(session, languageId, "language_admin") || hasRole(session, languageId, "content_editor");
}

export function canSendToFinalReview(session: Session | null, languageId: number): boolean {
  return isMasterSuperAdmin(session) || hasRole(session, languageId, "language_admin") || hasRole(session, languageId, "content_editor");
}

export function canEditContent(session: Session | null, languageId: number): boolean {
  // A Super Admin can edit in a language only when explicitly assigned the
  // editor role there; system-wide visibility does not grant editorial duties.
  return isMasterSuperAdmin(session) || hasRole(session, languageId, "language_admin") || hasRole(session, languageId, "content_editor");
}

export function canFinalizeContent(session: Session | null, languageId: number): boolean {
  return isMasterSuperAdmin(session) || hasRole(session, languageId, "language_admin") || hasRole(session, languageId, "publisher");
}

export function canPublishBeforeReview(session: Session | null, languageId: number): boolean {
  return isSuperAdmin(session) || hasRole(session, languageId, "language_admin") ||
    hasRole(session, languageId, "content_editor") || hasRole(session, languageId, "publisher");
}

export function canUploadContent(session: Session | null, languageId: number): boolean {
  return isMasterSuperAdmin(session) || hasRole(session, languageId, "language_admin") || hasRole(session, languageId, "uploader");
}

export function canContribute(
  session: Session | null,
  languageId: number
): boolean {
  // Public account profile types describe interests, not authorization roles.
  // Authenticated contributors can submit their own work; uploader privileges
  // are checked separately for language-scoped administrative uploads.
  return isAuthenticated(session);
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
    ["language_admin", "uploader", "publisher", "content_editor"].includes(
      lr.role
    )
  );
}

export function canManageUsers(session: Session | null): boolean {
  return isSuperAdmin(session) || getRoles(session).some((role) => role.role === "language_admin");
}

export function userManagementWhere(session: Session | null) {
  if (isMasterSuperAdmin(session)) return {};
  const languageIds = getRoles(session)
    .filter((role) => isSuperAdmin(session) || role.role === "language_admin")
    .map((role) => role.languageId);
  return { languageRoles: { some: { languageId: { in: languageIds } } } };
}

export function canViewAnalytics(session: Session | null): boolean {
  return isSuperAdmin(session) || getRoles(session).some((role) => role.role === "language_admin");
}
