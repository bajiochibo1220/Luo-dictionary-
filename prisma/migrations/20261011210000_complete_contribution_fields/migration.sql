-- These three active modules were seeded without their contribution schemas.
-- Add missing fields using the keys their existing public detail pages read.
-- Preserve customized definitions and translations; do not touch records/users.
INSERT INTO "field_definitions" ("moduleId", "fieldCode", "baseLabel", "fieldType", "isRequired", "displayOrder")
SELECT m."id", f."fieldCode", f."baseLabel", f."fieldType", f."isRequired", f."displayOrder"
FROM "modules" m
JOIN (VALUES
  ('folktales', 'original', 'Original story', 'textarea', true, 1),
  ('folktales', 'translation', 'English translation', 'textarea', false, 2),
  ('folktales', 'moral', 'Moral or meaning', 'textarea', false, 3),
  ('folktales', 'children_version', 'Children''s version', 'textarea', false, 4),
  ('folktales', 'teacher_notes', 'Teacher notes', 'textarea', false, 5),
  ('artifacts', 'description', 'Description', 'textarea', true, 1),
  ('artifacts', 'origin', 'Origin', 'text', false, 2),
  ('artifacts', 'clan', 'Clan', 'text', false, 3),
  ('artifacts', 'usage', 'Usage', 'textarea', false, 4),
  ('heritage_sites', 'county', 'County', 'text', false, 1),
  ('heritage_sites', 'description', 'Description', 'textarea', true, 2),
  ('heritage_sites', 'history', 'History', 'textarea', false, 3),
  ('heritage_sites', 'visiting_info', 'Visiting information', 'textarea', false, 4)
) AS f("moduleCode", "fieldCode", "baseLabel", "fieldType", "isRequired", "displayOrder")
ON m."code" = f."moduleCode"
ON CONFLICT ("moduleId", "fieldCode") DO NOTHING;
