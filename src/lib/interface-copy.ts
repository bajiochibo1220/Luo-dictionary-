import defaults from "@/lib/interface-copy-defaults.json";

export type CopyPair = { local: string; english: string };
export type InterfaceCatalog = Record<string, CopyPair>;
export function normalizeInterfaceText(text: string) { return text.replace(/\s+/g, " ").trim(); }
export function interfaceSettingKey(code: string) { return `interface-copy:${code}`; }
export function defaultInterfaceCatalog(_code: string): InterfaceCatalog {
  // The bundled file registers editable English sources. Seed wording is never
  // public approval: only translations saved by an editor are displayed.
  return Object.fromEntries(Object.keys(defaults).map(source => [source, { local: "", english: source }]));
}
export function mergeInterfaceCatalog(code: string, saved: string | null | undefined): InterfaceCatalog {
  let overrides: InterfaceCatalog = {};
  try {
    const parsed = JSON.parse(saved || "{}");
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) overrides = Object.fromEntries(Object.entries(parsed).filter(([, value]) => {
      const entry = value as CopyPair | null;
      return !!entry && typeof entry.local === "string" && typeof entry.english === "string" && !!entry.english.trim();
    })) as InterfaceCatalog;
  } catch {}
  return { ...defaultInterfaceCatalog(code), ...overrides };
}
export function translateInterfaceText(catalog: InterfaceCatalog, source: string, local: boolean) {
  const entry = catalog[normalizeInterfaceText(source)];
  const value = local ? entry?.local?.trim() || entry?.english : entry?.english;
  return value?.trim() ? source.replace(source.trim(), value) : source;
}
