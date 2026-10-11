-- These runtime tables were present in the schema but absent from migration
-- history. IF NOT EXISTS preserves installations that provisioned them manually.
CREATE TABLE IF NOT EXISTS "system_settings" (
  "key" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "system_settings_pkey" PRIMARY KEY ("key")
);

CREATE TABLE IF NOT EXISTS "conversations" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "pinned" BOOLEAN NOT NULL DEFAULT false,
  "archived" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "conversations_userId_archived_pinned_updatedAt_idx" ON "conversations"("userId", "archived", "pinned", "updatedAt");
ALTER TABLE "ai_responses" ADD COLUMN IF NOT EXISTS "conversationId" TEXT;
CREATE INDEX IF NOT EXISTS "ai_responses_conversationId_idx" ON "ai_responses"("conversationId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'conversations_userId_fkey' AND conrelid = 'conversations'::regclass) THEN
    ALTER TABLE "conversations" ADD CONSTRAINT "conversations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ai_responses_conversationId_fkey' AND conrelid = 'ai_responses'::regclass) THEN
    ALTER TABLE "ai_responses" ADD CONSTRAINT "ai_responses_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
