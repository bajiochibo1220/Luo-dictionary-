import { offlineDelete, offlineList, offlinePut } from "./offline-learning";

export type DeviceContributionDraft = {
  id: string;
  moduleCode: string;
  languageId: number;
  recordId?: string;
  title: string;
  values: Record<string, any>;
  files: Record<string, File | null>;
  sourcePermission: string;
  attributionPreference: string;
  governance: Record<string, string>;
  provenance: Record<string, string>;
  updatedAt: number;
};

export function contributionDraftScope(origin: string, userId: string) {
  if (!userId.trim()) throw new Error("Sign in before using device drafts.");
  return `contribution:${encodeURIComponent(new URL(origin).origin)}:${encodeURIComponent(userId)}:`;
}
function draftKey(scope: string, id: string) {
  if (!scope.startsWith("contribution:") || !scope.endsWith(":")) throw new Error("Invalid draft scope.");
  if (!/^[a-zA-Z0-9_-]{1,100}$/.test(id)) throw new Error("Invalid device draft ID.");
  return scope + id;
}
export async function saveDeviceDraft(scope: string, draft: DeviceContributionDraft) {
  // IndexedDB structured cloning preserves File/Blob bytes. JSON/localStorage
  // would silently drop attachments. A failed transaction leaves the old copy.
  await offlinePut(draftKey(scope, draft.id), draft);
}
export async function listDeviceDrafts(scope: string, languageId: number) {
  const entries = await offlineList<DeviceContributionDraft>(scope);
  return entries.map(entry => entry.value).filter(draft => draft.languageId === languageId)
    .sort((left, right) => right.updatedAt - left.updatedAt);
}
export async function removeDeviceDraft(scope: string, id: string) {
  await offlineDelete(draftKey(scope, id));
}
