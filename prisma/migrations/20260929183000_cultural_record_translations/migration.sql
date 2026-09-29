CREATE TABLE "cultural_record_translations" (
    "id" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "languageId" INTEGER NOT NULL,
    "summary" TEXT,
    "data" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cultural_record_translations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "cultural_record_translations_recordId_languageId_key"
    ON "cultural_record_translations"("recordId", "languageId");
CREATE INDEX "cultural_record_translations_languageId_idx"
    ON "cultural_record_translations"("languageId");

ALTER TABLE "cultural_record_translations"
    ADD CONSTRAINT "cultural_record_translations_recordId_fkey"
    FOREIGN KEY ("recordId") REFERENCES "cultural_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "cultural_record_translations"
    ADD CONSTRAINT "cultural_record_translations_languageId_fkey"
    FOREIGN KEY ("languageId") REFERENCES "languages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "cultural_record_translations" ("id", "recordId", "languageId", "updatedAt")
SELECT uuid_generate_v4()::text, records."id", languages."id", CURRENT_TIMESTAMP
FROM "cultural_records" AS records
CROSS JOIN "languages" AS languages
WHERE languages."code" IN ('luo', 'eng')
  AND languages."id" <> records."languageId";

ALTER TABLE "embeddings" ADD COLUMN "languageId" INTEGER;
UPDATE "embeddings" AS e SET "languageId" = r."languageId"
FROM "cultural_records" AS r WHERE e."recordId" = r."id";
UPDATE "embeddings" AS e SET "languageId" = d."languageId"
FROM "dictionary_entries" AS d WHERE e."dictionaryId" = d."id";
UPDATE "embeddings" AS e SET "languageId" = t."languageId"
FROM "transcripts" AS t WHERE e."transcriptId" = t."id";
CREATE INDEX "embeddings_languageId_idx" ON "embeddings"("languageId");
ALTER TABLE "embeddings"
    ADD CONSTRAINT "embeddings_languageId_fkey"
    FOREIGN KEY ("languageId") REFERENCES "languages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
