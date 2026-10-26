import type { LearningResourceView } from "./learning-contract";
async function transaction<T>(mode: IDBTransactionMode, work: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof indexedDB === "undefined") return reject(new Error("Offline storage is unavailable."));
    const open = indexedDB.open("luo-heritage-learning-v1", 1);
    open.onupgradeneeded = () => open.result.createObjectStore("items", { keyPath: "key" });
    open.onsuccess = () => resolve(open.result);
    open.onerror = open.onblocked = () => reject(new Error("Offline storage could not open. Close other tabs and retry."));
  });
  try { return await new Promise<T>((resolve, reject) => {
    const tx = db.transaction("items", mode); const request = work(tx.objectStore("items"));
    tx.oncomplete = () => resolve(request.result);
    tx.onerror = tx.onabort = () => reject(new Error("Offline storage is full or unavailable."));
  }); } finally { db.close(); }
}
export async function offlinePut<T>(key: string, value: T) { await transaction("readwrite", store => store.put({ key, value })); }
export async function offlineDelete(key: string) { await transaction("readwrite", store => store.delete(key)); }
export async function offlineList<T>(prefix: string): Promise<{ key: string; value: T }[]> {
  return (await transaction("readonly", store => store.getAll())).filter(record => record.key.startsWith(prefix));
}
export async function downloadLesson(origin: string, resource: LearningResourceView) {
  if (!resource.downloadAllowed || resource.status !== "published") throw new Error("Offline distribution is not permitted for this item.");
  await offlinePut(`pack:${origin}:${resource.id}`, { resource, expiresAt: Date.now() + 7 * 86400000 });
}
export async function downloadedLessons(origin: string) {
  const entries = await offlineList<{ resource: LearningResourceView; expiresAt: number }>(`pack:${origin}:`);
  const result: LearningResourceView[] = [];
  for (const entry of entries) {
    if (entry.value.expiresAt > Date.now()) result.push(entry.value.resource); else await offlineDelete(entry.key);
  }
  return result;
}
export type PendingLearningAction = { data: unknown; resourceId: string; title: string; createdAt: number };
export const learningQueuePrefix = (origin: string, userId: string) => `queue:${origin}:${userId}:`;
