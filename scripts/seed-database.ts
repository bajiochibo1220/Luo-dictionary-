import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";
import crypto from "crypto";

const prisma = new PrismaClient();

// ============================================================
// HELPER — Read JSON safely (strips UTF-8 BOM added by PowerShell)
// ============================================================
function readJsonFile(filePath: string) {
  let raw = fs.readFileSync(filePath, "utf-8");
  if (raw.charCodeAt(0) === 0xfeff) {
    raw = raw.slice(1);
  }
  return JSON.parse(raw);
}

// ============================================================
// ROLES
// ============================================================
const ROLES = [
  { name: "guest", level: 1, description: "Unauthenticated visitor" },
  { name: "registered", level: 2, description: "Registered user" },
  { name: "student", level: 3, description: "Student" },
  { name: "contributor", level: 4, description: "Content contributor" },
  { name: "elder", level: 4, description: "Cultural elder" },
  { name: "teacher", level: 5, description: "Teacher" },
  { name: "researcher", level: 5, description: "Researcher" },
  { name: "moderator", level: 6, description: "Content moderator" },
  { name: "content_editor", level: 7, description: "Content editor" },
  { name: "language_admin", level: 8, description: "Language admin" },
  { name: "super_admin", level: 9, description: "Platform super admin" },
];

// ============================================================
// LANGUAGES
// ============================================================
const LANGUAGES = [
  {
    code: "luo",
    name: "Luo",
    nativeName: "Dholuo",
    isActive: true,
    isDefault: true,
    displayOrder: 1,
  },
  {
    code: "eng",
    name: "English",
    nativeName: "English",
    isActive: true,
    isDefault: false,
    displayOrder: 2,
  },
  {
    code: "kik",
    name: "Kikuyu",
    nativeName: "Gikuyu",
    isActive: false,
    isDefault: false,
    displayOrder: 3,
  },
];

// ============================================================
// MODULES
// ============================================================
const MODULES = [
  { code: "dictionary", baseName: "Dictionary", displayOrder: 1, isStub: false },
  { code: "proverbs", baseName: "Proverbs", displayOrder: 2, isStub: false },
  { code: "riddles", baseName: "Riddles", displayOrder: 3, isStub: false },
  { code: "oral_histories", baseName: "Oral Histories", displayOrder: 4, isStub: false },
  { code: "folktales", baseName: "Folktales", displayOrder: 5, isStub: false },
  { code: "songs", baseName: "Traditional Songs", displayOrder: 6, isStub: false },
  { code: "artifacts", baseName: "Cultural Artifacts", displayOrder: 7, isStub: false },
  { code: "heritage_sites", baseName: "Heritage Sites", displayOrder: 8, isStub: false },
  { code: "cultural_calendar", baseName: "Cultural Calendar", displayOrder: 9, isStub: false },
  { code: "audio_visual", baseName: "Audio-Visual Library", displayOrder: 10, isStub: false },
  { code: "chatbot", baseName: "AI Chatbot", displayOrder: 11, isStub: false },
  { code: "games", baseName: "Games", displayOrder: 12, isStub: true },
  { code: "learning", baseName: "Learning Centre", displayOrder: 13, isStub: true },
  { code: "ai_tutor", baseName: "AI Language Tutor", displayOrder: 14, isStub: true },
  { code: "research", baseName: "Research Portal", displayOrder: 15, isStub: false },
];

// ============================================================
// LUO MODULE TITLES
// ============================================================
const LUO_TITLES: Record<string, string> = {
  dictionary: "Muma",
  proverbs: "Ngero",
  riddles: "Ngeche",
  oral_histories: "Sigana",
  folktales: "Sigana",
  songs: "Wende",
  artifacts: "Gik Luo",
  heritage_sites: "Piny Luo",
  cultural_calendar: "Ndalo",
  audio_visual: "Picha gi Duol",
  chatbot: "Jabuk",
  games: "Tugo",
  learning: "Puonj",
  ai_tutor: "Japuonj",
  research: "Kido",
};

// ============================================================
// FIELD DEFINITIONS PER MODULE
// ============================================================
type FieldDef = {
  fieldCode: string;
  baseLabel: string;
  fieldType: string;
  isRequired: boolean;
  displayOrder: number;
  luoLabel: string;
};

const FIELDS_BY_MODULE: Record<string, FieldDef[]> = {
  proverbs: [
    { fieldCode: "original_text", baseLabel: "Original Text", fieldType: "textarea", isRequired: true, displayOrder: 1, luoLabel: "Ndiko ma chon" },
    { fieldCode: "translation", baseLabel: "Translation", fieldType: "textarea", isRequired: true, displayOrder: 2, luoLabel: "Lokruok" },
    { fieldCode: "meaning", baseLabel: "Meaning", fieldType: "textarea", isRequired: true, displayOrder: 3, luoLabel: "Tiende" },
    { fieldCode: "interpretation", baseLabel: "Interpretation", fieldType: "textarea", isRequired: false, displayOrder: 4, luoLabel: "Lokruok mopogore" },
    { fieldCode: "context", baseLabel: "Context", fieldType: "textarea", isRequired: false, displayOrder: 5, luoLabel: "Kaka inyalo tiyo go" },
    { fieldCode: "usage", baseLabel: "Usage", fieldType: "textarea", isRequired: false, displayOrder: 6, luoLabel: "Kaka itiyo go" },
  ],
  riddles: [
    { fieldCode: "question", baseLabel: "Question", fieldType: "textarea", isRequired: true, displayOrder: 1, luoLabel: "Penjo" },
    { fieldCode: "answer", baseLabel: "Answer", fieldType: "text", isRequired: true, displayOrder: 2, luoLabel: "Duoko" },
    { fieldCode: "translation", baseLabel: "Translation", fieldType: "textarea", isRequired: false, displayOrder: 3, luoLabel: "Lokruok" },
    { fieldCode: "context", baseLabel: "Context", fieldType: "textarea", isRequired: false, displayOrder: 4, luoLabel: "Kaka inyalo tiyo go" },
  ],
  dictionary: [
    { fieldCode: "dholuo", baseLabel: "Dholuo Word", fieldType: "text", isRequired: true, displayOrder: 1, luoLabel: "Wach Dholuo" },
    { fieldCode: "english", baseLabel: "English", fieldType: "text", isRequired: true, displayOrder: 2, luoLabel: "Sikukuu" },
    { fieldCode: "kiswahili", baseLabel: "Kiswahili", fieldType: "text", isRequired: false, displayOrder: 3, luoLabel: "Kiswahili" },
    { fieldCode: "pronunciation", baseLabel: "Pronunciation", fieldType: "text", isRequired: false, displayOrder: 4, luoLabel: "Kaka iluongo" },
    { fieldCode: "grammarClass", baseLabel: "Grammar Class", fieldType: "text", isRequired: false, displayOrder: 5, luoLabel: "Kit wach" },
  ],
  songs: [
    { fieldCode: "title", baseLabel: "Title", fieldType: "text", isRequired: true, displayOrder: 1, luoLabel: "Nying wende" },
    { fieldCode: "lyrics", baseLabel: "Lyrics", fieldType: "textarea", isRequired: true, displayOrder: 2, luoLabel: "Weche wende" },
    { fieldCode: "translation", baseLabel: "Translation", fieldType: "textarea", isRequired: false, displayOrder: 3, luoLabel: "Lokruok" },
    { fieldCode: "meaning", baseLabel: "Meaning", fieldType: "textarea", isRequired: false, displayOrder: 4, luoLabel: "Tiende" },
    { fieldCode: "instruments", baseLabel: "Instruments", fieldType: "text", isRequired: false, displayOrder: 5, luoLabel: "Gik moyweyo" },
    { fieldCode: "cultural_context", baseLabel: "Cultural Context", fieldType: "textarea", isRequired: false, displayOrder: 6, luoLabel: "Kit Luo" },
  ],
  oral_histories: [
    { fieldCode: "title", baseLabel: "Title", fieldType: "text", isRequired: true, displayOrder: 1, luoLabel: "Nying sigana" },
    { fieldCode: "community", baseLabel: "Community", fieldType: "text", isRequired: false, displayOrder: 2, luoLabel: "Oganda" },
    { fieldCode: "clan", baseLabel: "Clan", fieldType: "text", isRequired: false, displayOrder: 3, luoLabel: "Anyuola" },
    { fieldCode: "narrator", baseLabel: "Narrator", fieldType: "text", isRequired: false, displayOrder: 4, luoLabel: "Jawacho" },
    { fieldCode: "location", baseLabel: "Location", fieldType: "text", isRequired: false, displayOrder: 5, luoLabel: "Piny" },
    { fieldCode: "county", baseLabel: "County", fieldType: "text", isRequired: false, displayOrder: 6, luoLabel: "Senta" },
    { fieldCode: "transcript", baseLabel: "Transcript", fieldType: "textarea", isRequired: true, displayOrder: 7, luoLabel: "Ndiko" },
  ],
};

// ============================================================
// MAIN SEED
// ============================================================
async function main() {
  console.log("\nSeeding LuoLinguaAI database...\n");

  // ---------- ROLES ----------
  for (const role of ROLES) {
    await prisma.role.upsert({
      where: { name: role.name },
      update: {},
      create: role,
    });
  }
  console.log(`Roles: ${ROLES.length} upserted`);

  // ---------- LANGUAGES ----------
  const languageMap: Record<string, number> = {};
  for (const lang of LANGUAGES) {
    const created = await prisma.language.upsert({
      where: { code: lang.code },
      update: {},
      create: lang,
    });
    languageMap[lang.code] = created.id;
  }
  console.log(`Languages: ${LANGUAGES.length} upserted`);

  // ---------- MODULES ----------
  const moduleMap: Record<string, number> = {};
  for (const mod of MODULES) {
    const created = await prisma.module.upsert({
      where: { code: mod.code },
      update: {},
      create: mod,
    });
    moduleMap[mod.code] = created.id;
  }
  console.log(`Modules: ${MODULES.length} upserted`);

  // ---------- MODULE TRANSLATIONS (LUO) ----------
  const luoId = languageMap["luo"];
  let titleCount = 0;
  for (const [code, title] of Object.entries(LUO_TITLES)) {
    const modId = moduleMap[code];
    if (!modId) continue;
    await prisma.moduleTranslation.upsert({
      where: {
        moduleId_languageId: { moduleId: modId, languageId: luoId },
      },
      update: { title },
      create: { moduleId: modId, languageId: luoId, title },
    });
    titleCount++;
  }
  console.log(`Module translations (Luo): ${titleCount} upserted`);

  // ---------- FIELD DEFINITIONS + TRANSLATIONS ----------
  let fieldCount = 0;
  let fieldTransCount = 0;
  for (const [moduleCode, fields] of Object.entries(FIELDS_BY_MODULE)) {
    const modId = moduleMap[moduleCode];
    if (!modId) continue;

    for (const f of fields) {
      const fd = await prisma.fieldDefinition.upsert({
        where: {
          moduleId_fieldCode: { moduleId: modId, fieldCode: f.fieldCode },
        },
        update: {},
        create: {
          moduleId: modId,
          fieldCode: f.fieldCode,
          baseLabel: f.baseLabel,
          fieldType: f.fieldType,
          isRequired: f.isRequired,
          displayOrder: f.displayOrder,
        },
      });
      fieldCount++;

      await prisma.fieldTranslation.upsert({
        where: { fieldId_languageId: { fieldId: fd.id, languageId: luoId } },
        update: { label: f.luoLabel },
        create: { fieldId: fd.id, languageId: luoId, label: f.luoLabel },
      });
      fieldTransCount++;
    }
  }
  console.log(`Field definitions: ${fieldCount} upserted`);
  console.log(`Field translations (Luo): ${fieldTransCount} upserted`);

  // ---------- SAMPLE DICTIONARY ENTRIES ----------
  const dictFile = path.join(
    process.cwd(),
    "data",
    "seed",
    "luo",
    "dictionary.json"
  );
  if (fs.existsSync(dictFile)) {
    const entries = readJsonFile(dictFile);
    for (const entry of entries) {
      const existing = await prisma.dictionaryEntry.findFirst({
        where: { languageId: luoId, dholuo: entry.dholuo },
      });
      if (existing) continue;

      await prisma.dictionaryEntry.create({
        data: {
          languageId: luoId,
          dholuo: entry.dholuo,
          english: entry.english,
          kiswahili: entry.kiswahili,
          pronunciation: entry.pronunciation,
          grammarClass: entry.grammarClass,
          wordOrigin: entry.wordOrigin,
          synonyms: entry.synonyms ?? [],
          antonyms: entry.antonyms ?? [],
          examples: entry.examples ?? [],
          status: "published",
          nrfUri: `JOOUST/NRF/LuoAI_Repository/luo/dictionary/${crypto.randomUUID()}`,
          nrfMetadata: {
            domain: "culture",
            genre: "dictionary",
            consent: "granted",
            restriction: "none",
          },
        },
      });
    }
    console.log(`Dictionary entries: ${entries.length} seeded`);
  }

  // ---------- PROVERBS + RIDDLES ----------
  await seedModuleContent(
    "luo",
    "proverbs",
    "data/seed/luo/proverbs.json",
    moduleMap,
    languageMap
  );
  await seedModuleContent(
    "luo",
    "riddles",
    "data/seed/luo/riddles.json",
    moduleMap,
    languageMap
  );

  console.log("\nSeeding complete.\n");
}

// ============================================================
// HELPER — Seed CulturalRecord content for a module
// ============================================================
async function seedModuleContent(
  languageCode: string,
  moduleCode: string,
  relativePath: string,
  moduleMap: Record<string, number>,
  languageMap: Record<string, number>
) {
  const filePath = path.join(process.cwd(), relativePath);
  if (!fs.existsSync(filePath)) {
    console.log(`No seed file at ${relativePath} - skipping`);
    return;
  }

  const items = readJsonFile(filePath);
  const langId = languageMap[languageCode];
  const modId = moduleMap[moduleCode];

  for (const item of items) {
    const title = item.original_text || item.question || item.title || "Untitled";
    const existing = await prisma.culturalRecord.findFirst({
      where: { languageId: langId, moduleId: modId, title },
    });
    if (existing) continue;

    await prisma.culturalRecord.create({
      data: {
        languageId: langId,
        moduleId: modId,
        title,
        data: item,
        tags: item.themes ?? [],
        status: "published",
        nrfUri: `JOOUST/NRF/LuoAI_Repository/${languageCode}/${moduleCode}/${crypto.randomUUID()}`,
        nrfMetadata: {
          domain: "culture",
          genre: moduleCode,
          consent: "granted",
          restriction: "none",
        },
      },
    });
  }
  console.log(`${moduleCode}: ${items.length} seeded`);
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });