-- Preserve assignment evidence before merging the redundant reviewer duty.
INSERT INTO audit_logs (action, "entityType", "entityId", "oldValue", "newValue", "createdAt")
SELECT 'staff.cultural_review_merged_into_editor', 'user', "userId",
       jsonb_build_object('role', role, 'languageId', "languageId", 'assignedBy', "assignedBy", 'assignedAt', "assignedAt"),
       jsonb_build_object('role', 'content_editor', 'languageId', "languageId"), NOW()
FROM user_language_roles WHERE role = 'cultural_expert';

INSERT INTO user_language_roles ("userId", "languageId", role, "assignedBy", "assignedAt")
SELECT "userId", "languageId", 'content_editor', "assignedBy", "assignedAt"
FROM user_language_roles WHERE role = 'cultural_expert'
ON CONFLICT ("userId", "languageId", role) DO NOTHING;
DELETE FROM user_language_roles WHERE role = 'cultural_expert';

-- Deleted-upload snapshots must survive ordinary application operations.
-- FK anonymization may clear userId without changing the historical payload.
CREATE OR REPLACE FUNCTION protect_deleted_content_audit() RETURNS trigger AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
      RAISE EXCEPTION 'Audit history is append-only';
    END IF;
    IF (to_jsonb(NEW) - 'userId') IS DISTINCT FROM (to_jsonb(OLD) - 'userId')
       OR NOT (NEW."userId" IS NULL OR NEW."userId" IS NOT DISTINCT FROM OLD."userId") THEN
      RAISE EXCEPTION 'Audit history is append-only';
    END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER protect_deleted_content_history BEFORE UPDATE OR DELETE ON audit_logs
FOR EACH ROW EXECUTE FUNCTION protect_deleted_content_audit();
