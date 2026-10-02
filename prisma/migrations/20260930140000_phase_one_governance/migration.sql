ALTER TABLE "cultural_records"
  ADD COLUMN "consentScope" TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN "restrictionLevel" TEXT NOT NULL DEFAULT 'internal',
  ADD COLUMN "embargoUntil" TIMESTAMP(3),
  ADD COLUMN "countyCode" TEXT,
  ADD COLUMN "siteName" TEXT,
  ADD COLUMN "sourceReference" TEXT,
  ADD COLUMN "sessionId" TEXT;

ALTER TABLE "dictionary_entries"
  ADD COLUMN "consentScope" TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN "restrictionLevel" TEXT NOT NULL DEFAULT 'internal',
  ADD COLUMN "embargoUntil" TIMESTAMP(3),
  ADD COLUMN "countyCode" TEXT,
  ADD COLUMN "siteName" TEXT,
  ADD COLUMN "sourceReference" TEXT,
  ADD COLUMN "sessionId" TEXT;

ALTER TABLE "media_assets"
  ADD COLUMN "deliveryType" TEXT NOT NULL DEFAULT 'upload',
  ADD COLUMN "assetId" TEXT,
  ADD COLUMN "nrfUri" TEXT,
  ADD COLUMN "consentScope" TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN "restrictionLevel" TEXT NOT NULL DEFAULT 'internal',
  ADD COLUMN "embargoUntil" TIMESTAMP(3),
  ADD COLUMN "countyCode" TEXT,
  ADD COLUMN "siteName" TEXT,
  ADD COLUMN "sourceReference" TEXT,
  ADD COLUMN "sessionId" TEXT;

ALTER TABLE "transcripts"
  ADD COLUMN "consentScope" TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN "restrictionLevel" TEXT NOT NULL DEFAULT 'internal',
  ADD COLUMN "embargoUntil" TIMESTAMP(3),
  ADD COLUMN "countyCode" TEXT,
  ADD COLUMN "siteName" TEXT,
  ADD COLUMN "sourceReference" TEXT,
  ADD COLUMN "sourceChecksum" TEXT,
  ADD COLUMN "sourceId" TEXT,
  ADD COLUMN "sourceUri" TEXT,
  ADD COLUMN "sessionId" TEXT,
  ADD COLUMN "domain" TEXT,
  ADD COLUMN "genre" TEXT,
  ADD COLUMN "versionNo" INTEGER NOT NULL DEFAULT 1;

CREATE UNIQUE INDEX "media_assets_assetId_key" ON "media_assets"("assetId");
CREATE UNIQUE INDEX "media_assets_nrfUri_key" ON "media_assets"("nrfUri");
CREATE UNIQUE INDEX "transcripts_sourceId_key" ON "transcripts"("sourceId");
CREATE INDEX "cultural_records_consentScope_restrictionLevel_idx" ON "cultural_records"("consentScope", "restrictionLevel");
CREATE INDEX "dictionary_entries_consentScope_restrictionLevel_idx" ON "dictionary_entries"("consentScope", "restrictionLevel");
CREATE INDEX "media_assets_consentScope_restrictionLevel_idx" ON "media_assets"("consentScope", "restrictionLevel");
CREATE INDEX "transcripts_consentScope_restrictionLevel_idx" ON "transcripts"("consentScope", "restrictionLevel");
CREATE INDEX "transcripts_sessionId_idx" ON "transcripts"("sessionId");

ALTER TABLE "cultural_record_translations"
  ADD COLUMN "title" TEXT;
