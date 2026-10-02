-- Public accounts can use public content immediately. Account review is not a
-- prerequisite for learners, researchers, contributors, or community members.
UPDATE "users" AS u
SET "status" = 'active'
WHERE u."status" = 'pending'
  AND u."isSuperAdmin" = false
  AND u."isMasterSuperAdmin" = false
  AND NOT EXISTS (
    SELECT 1
    FROM "user_language_roles" AS r
    WHERE r."userId" = u."id"
      AND r."role" IN ('language_admin', 'moderator', 'content_editor', 'cultural_expert')
  );
