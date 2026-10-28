ALTER TABLE "cultural_records"
  ADD COLUMN "publicationOfId" TEXT,
  ADD COLUMN "isProvisional" BOOLEAN NOT NULL DEFAULT false;
CREATE UNIQUE INDEX "cultural_records_publicationOfId_key" ON "cultural_records"("publicationOfId");
ALTER TABLE "cultural_records" ADD CONSTRAINT "cultural_records_publicationOfId_fkey"
  FOREIGN KEY ("publicationOfId") REFERENCES "cultural_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
