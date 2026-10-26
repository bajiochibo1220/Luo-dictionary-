import { prisma } from "@/lib/db";
import { canAccessGovernedItem } from "@/lib/governance";
import { publicCulturalText } from "@/lib/public-cultural-text";
import { repositoryExportFields } from "@/lib/repository-export";
import { logAction } from "@/lib/audit";
import type { AppAccount } from "@/lib/account-contract";
export class ResearchError extends Error { constructor(public status: number, message: string) { super(message); } }
const roles = ["researcher", "language_admin", "content_editor", "uploader", "publisher"];
export function mayUseResearch(account: AppAccount | null, languageId: number) {
  return !!account && (!!account.isSuperAdmin || !!account.isMasterSuperAdmin || account.languageRoles.some(role => role.languageId === languageId && roles.includes(role.role)));
}
export async function researchLibrary(account: AppAccount | null, search: URLSearchParams) {
  if (!account) throw new ResearchError(401, "Sign in with assigned research or curation access.");
  const languageId = Number(search.get("languageId"));
  if (!Number.isSafeInteger(languageId) || languageId < 1) throw new ResearchError(400, "Choose an active language.");
  if (!mayUseResearch(account, languageId)) throw new ResearchError(403, "Your account does not have research access for this language.");
  const kind = search.get("kind") || "records", after = search.get("after") || "", query = (search.get("query") || "").trim();
  if (!["records", "transcripts"].includes(kind) || query.length > 200 || after && !/^[A-Za-z0-9_-]{1,128}$/.test(after)) throw new ResearchError(400, "Check the search and page selection.");
  const language = await prisma.language.findFirst({where: {id: languageId, isActive: true}, select: {id: true}});
  if (!language) throw new ResearchError(404, "This language is unavailable.");
  const where = {languageId, ...(after ? {id: {gt: after}} : {})};
  // Read bounded candidate pages, then check both object and parent permissions.
  // A sparse/empty page can still have a continuation; it is never an access bypass.
  const candidates = kind === "records"
    ? await prisma.culturalRecord.findMany({where: {...where, status: {in: ["curated", "validated", "published"]}, ...(query ? {title: {contains: query, mode: "insensitive"}} : {})}, orderBy: {id: "asc"}, take: 51, select: {id: true, title: true, summary: true, data: true, languageId: true, consentScope: true, restrictionLevel: true, embargoUntil: true, module: {select: {baseName: true}}}})
    : await prisma.transcript.findMany({where: {...where, record: {status: {in: ["curated", "validated", "published"]}}, ...(query ? {text: {contains: query, mode: "insensitive"}} : {})}, orderBy: {id: "asc"}, take: 51, select: {id: true, text: true, languageId: true, languageCode: true, domain: true, genre: true, versionNo: true, consentScope: true, restrictionLevel: true, embargoUntil: true, record: {select: {id: true, title: true, status: true, languageId: true, consentScope: true, restrictionLevel: true, embargoUntil: true}}}});
  const page = candidates.slice(0,50);
  const items = page.flatMap((item: any) => {
    if (!canAccessGovernedItem(account, item, languageId) || kind === "transcripts" && (!item.record || !canAccessGovernedItem(account, item.record, item.record.languageId))) return [];
    return [{id: item.id, title: item.title || item.record?.title || "Reviewed transcript", text: kind === "records" ? [item.summary, publicCulturalText(item.data)].filter(Boolean).join("\n\n") : item.text, kind, module: item.module?.baseName || item.domain || "Transcript", metadata: repositoryExportFields({languageId, language: item.languageCode, genre: item.genre, version: item.versionNo, consentScope: item.consentScope, restrictionLevel: item.restrictionLevel})}];
  });
  await logAction({userId: account.id, action: "research.read", entityType: "research_library", newValue: {kind, languageId, ids: items.map(item => item.id)}});
  return {items, next: candidates.length > 50 ? page[page.length-1]?.id || null : null};
}
