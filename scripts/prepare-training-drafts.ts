import "dotenv/config";
import { readFile } from "node:fs/promises";
import { prisma } from "../src/lib/db";
import { ResourceInput } from "../src/lib/learning-contract";
import type { Prisma } from "@prisma/client";
async function main() {
  const authorId = process.argv.find(value => value.startsWith("--author="))?.slice("--author=".length);
  const authors = await prisma.user.findMany({ where: { status: "active", ...(authorId ? { id: authorId } : { isMasterSuperAdmin: true }) }, select: { id: true, isMasterSuperAdmin: true }, take: 2 });
  if (authors.length !== 1 || !authors[0].isMasterSuperAdmin) throw new Error("Choose one active Master Super Admin with --author=<id>.");
  const language = await prisma.language.findFirst({ where: { code: "eng", isActive: true }, select: { id: true } });
  if (!language) throw new Error("Activate the English language before preparing English trainer drafts.");
  const lessons = JSON.parse(await readFile(new URL("../data/training/trainer-lessons.json", import.meta.url), "utf8")) as unknown[];
  let created = 0;
  for (const lesson of lessons) {
    const input = ResourceInput.parse({ ...(lesson as object), languageId: language.id, kind: "lesson", consentScope: "pending", restrictionLevel: "internal", downloadAllowed: false });
    if (await prisma.learningResource.findFirst({ where: { title: input.title, createdBy: authors[0].id } })) continue;
    await prisma.learningResource.create({ data: { ...input, body: input.body as Prisma.InputJsonValue, startsAt: null, endsAt: null, createdBy: authors[0].id } });
    created++;
  }
  console.log(`${created} private trainer drafts prepared. Review permissions/content and use independent review before publication. No cultural research records were changed.`);
}
main().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => prisma.$disconnect());
