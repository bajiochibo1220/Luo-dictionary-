ALTER TABLE "users" ADD COLUMN "isMasterSuperAdmin" BOOLEAN NOT NULL DEFAULT false;

-- Preserve the existing owner account as the sole master administrator.
UPDATE "users"
SET "isMasterSuperAdmin" = true
WHERE "id" = (
  SELECT "id"
  FROM "users"
  WHERE "isSuperAdmin" = true
  ORDER BY "createdAt" ASC, "id" ASC
  LIMIT 1
);

CREATE UNIQUE INDEX "users_single_master_super_admin_key"
ON "users" ("isMasterSuperAdmin")
WHERE "isMasterSuperAdmin" = true;
