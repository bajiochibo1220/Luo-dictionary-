import { cacheForRender } from "./render-cache";
import { prisma } from "@/lib/db";

// Shared only within a server render; language/module edits are visible on
// the next request without a global stale-content cache.
export const getDefaultPublicLanguage = cacheForRender(() => prisma.language.findFirst({
  where: { isActive: true, code: { not: "eng" } },
  orderBy: [{ isDefault: "desc" }, { displayOrder: "asc" }],
  select: { id: true, code: true, nativeName: true },
}));

export const getPublicModules = cacheForRender((languageId: number) => prisma.module.findMany({
  where: { isActive: true, isStub: false },
  orderBy: { displayOrder: "asc" },
  include: { translations: { where: { languageId } }, _count: { select: { fieldDefinitions: true } } },
}));
