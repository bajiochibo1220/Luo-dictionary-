import { prisma } from "@/lib/db";

const CACHE_TTL_MS = 60_000;
let cache: { data: Record<string, string>; ts: number } | null = null;

export async function getSystemSettings(): Promise<Record<string, string>> {
  if (cache && Date.now() - cache.ts < CACHE_TTL_MS) {
    return cache.data;
  }

  const rows = await prisma.$queryRaw<{ key: string; value: string }[]>`
    SELECT key, value FROM system_settings
  `;

  const map: Record<string, string> = {};
  for (const r of rows) map[r.key] = r.value;

  cache = { data: map, ts: Date.now() };
  return map;
}

export async function getSystemSetting(
  key: string,
  fallback = ""
): Promise<string> {
  const all = await getSystemSettings();
  return all[key] ?? fallback;
}

export async function setSystemSetting(key: string, value: string) {
  await prisma.$executeRaw`
    INSERT INTO system_settings (key, value, updated_at)
    VALUES (${key}, ${value}, NOW())
    ON CONFLICT (key)
    DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
  `;
  cache = null;
}

export async function setSystemSettings(entries: Record<string, string>) {
  for (const [key, value] of Object.entries(entries)) {
    await setSystemSetting(key, value);
  }
}

export function invalidateSettingsCache() {
  cache = null;
}