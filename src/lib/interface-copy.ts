import defaults from "@/lib/interface-copy-defaults.json";

export type CopyPair = { local: string; english: string };
export type InterfaceCatalog = Record<string, CopyPair>;
export function normalizeInterfaceText(text: string) { return text.replace(/\s+/g, " ").trim(); }
export function interfaceSettingKey(code: string) { return `interface-copy:${code}`; }
export function defaultInterfaceCatalog(code: string): InterfaceCatalog {
  return Object.fromEntries(Object.entries(defaults).map(([source, local]) => [source, { local: code === "luo" ? local : "", english: source }]));
}
export function mergeInterfaceCatalog(code: string, saved: string | null | undefined): InterfaceCatalog {
  let overrides: InterfaceCatalog = {};
  try { const parsed = JSON.parse(saved || "{}"); if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) overrides = parsed; } catch {}
  return { ...defaultInterfaceCatalog(code), ...overrides };
}
export function translateInterfaceText(catalog: InterfaceCatalog, source: string, local: boolean) {
  const entry = catalog[normalizeInterfaceText(source)];
  const value = local ? entry?.local : entry?.english;
  return value?.trim() ? source.replace(source.trim(), value) : source;
}
