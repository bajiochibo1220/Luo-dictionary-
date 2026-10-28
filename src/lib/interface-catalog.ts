import { prisma } from "@/lib/db";
import { mergeInterfaceCatalog, normalizeInterfaceText, type InterfaceCatalog } from "@/lib/interface-copy";

// Metadata registers editable labels; approved interface overrides supply text.
export async function getInterfaceCatalog(code: string, languageId: number, saved?: string | null): Promise<InterfaceCatalog> {
  const [modules, fields] = await Promise.all([
    prisma.module.findMany({ select: { baseName: true, translations: { where: { languageId }, select: { title: true } } } }),
    prisma.fieldDefinition.findMany({ select: { baseLabel: true, translations: { where: { languageId }, select: { label: true } } } }),
  ]);
  const catalog = mergeInterfaceCatalog(code, null);
  for (const item of modules) catalog[normalizeInterfaceText(item.baseName)] = { local: "", english: item.baseName };
  for (const item of fields) catalog[normalizeInterfaceText(item.baseLabel)] = { local: "", english: item.baseLabel };
  return { ...catalog, ...mergeInterfaceCatalog(code, saved) };
}
