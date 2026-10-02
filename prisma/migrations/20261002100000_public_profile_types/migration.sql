ALTER TABLE "users" ADD COLUMN "profileTypes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

UPDATE "users" AS u
SET "profileTypes" = COALESCE((
  SELECT ARRAY_AGG(DISTINCT CASE r."role"
    WHEN 'registered' THEN 'community_member'
    ELSE r."role"
  END)
  FROM "user_language_roles" AS r
  WHERE r."userId" = u."id"
    AND r."role" IN ('registered', 'student', 'teacher', 'researcher', 'contributor', 'elder')
), ARRAY[]::TEXT[]);

DELETE FROM "user_language_roles"
WHERE "role" IN ('registered', 'student', 'teacher', 'researcher', 'contributor', 'elder');
