CREATE TABLE "game_rooms" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "resourceId" TEXT NOT NULL,
  "resourceVersion" INTEGER NOT NULL,
  "hostId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'waiting',
  "startsAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "game_rooms_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "game_rooms_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "learning_resources"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "game_rooms_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "game_rooms_code_key" ON "game_rooms"("code");
CREATE INDEX "game_rooms_expiresAt_idx" ON "game_rooms"("expiresAt");
CREATE TABLE "game_players" (
  "id" TEXT NOT NULL,
  "roomId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "alias" TEXT NOT NULL,
  "answers" JSONB NOT NULL DEFAULT '{}',
  "score" INTEGER,
  "submittedAt" TIMESTAMP(3),
  "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "game_players_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "game_players_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "game_rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "game_players_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "game_players_roomId_userId_key" ON "game_players"("roomId", "userId");
