ALTER TABLE "consent_records"
  ADD COLUMN "recordId" TEXT,
  ADD COLUMN "projectRef" TEXT,
  ADD COLUMN "sourcePermissionStatus" TEXT,
  ADD COLUMN "attributionPreference" TEXT,
  ADD COLUMN "consentScope" TEXT,
  ADD COLUMN "restrictionLevel" TEXT,
  ADD COLUMN "embargoUntil" TIMESTAMP(3),
  ADD COLUMN "reviewedById" TEXT,
  ADD COLUMN "reviewedAt" TIMESTAMP(3);

CREATE INDEX "consent_records_recordId_consentType_createdAt_idx"
  ON "consent_records"("recordId", "consentType", "createdAt");
CREATE INDEX "consent_records_projectRef_idx" ON "consent_records"("projectRef");

ALTER TABLE "consent_records"
  ADD CONSTRAINT "consent_records_recordId_fkey"
  FOREIGN KEY ("recordId") REFERENCES "cultural_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "consent_records"
  ADD CONSTRAINT "consent_records_reviewedById_fkey"
  FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "consent_record_assets" (
  "id" TEXT NOT NULL,
  "consentRecordId" TEXT NOT NULL,
  "mediaAssetId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "consent_record_assets_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "consent_record_assets_consentRecordId_mediaAssetId_key"
  ON "consent_record_assets"("consentRecordId", "mediaAssetId");
CREATE INDEX "consent_record_assets_mediaAssetId_idx"
  ON "consent_record_assets"("mediaAssetId");

ALTER TABLE "consent_record_assets"
  ADD CONSTRAINT "consent_record_assets_consentRecordId_fkey"
  FOREIGN KEY ("consentRecordId") REFERENCES "consent_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "consent_record_assets"
  ADD CONSTRAINT "consent_record_assets_mediaAssetId_fkey"
  FOREIGN KEY ("mediaAssetId") REFERENCES "media_assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
