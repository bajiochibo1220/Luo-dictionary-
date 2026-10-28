import { prisma } from "@/lib/db";

const CACHE_TTL_MS = 60_000;
let cache: { data: Record<string, string>; ts: number } | null = null;

export async function getSystemSettings({ fresh = false }: { fresh?: boolean } = {}): Promise<Record<string, string>> {
  if (!fresh && cache && Date.now() - cache.ts < CACHE_TTL_MS) {
    return cache.data;
  }

  const rows = await prisma.$queryRaw<{ key: string; value: string }[]>`
    SELECT key, value FROM system_settings WHERE key NOT LIKE 'rate-limit:%'
  `;

  const map: Record<string, string> = {};
  for (const r of rows) map[r.key] = r.value;

  cache = { data: map, ts: Date.now() };
  return map;
}

export async function getSystemSetting(
  key: string,
  fallback = "",
  options: { fresh?: boolean } = {}
): Promise<string> {
  const all = await getSystemSettings(options);
  return all[key] ?? fallback;
}

export async function setSystemSetting(key: string, value: string) {
  await prisma.systemSetting.upsert({ where: { key }, create: { key, value }, update: { value } });
  cache = null;
}

export async function setSystemSettings(entries: Record<string, string>) {
  await prisma.$transaction(Object.entries(entries).map(([key, value]) => prisma.systemSetting.upsert({ where: { key }, create: { key, value }, update: { value } })));
  cache = null;
}

export function invalidateSettingsCache() {
  cache = null;
}
