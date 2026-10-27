-- Metadata configuration only. No invented cultural records are inserted.
INSERT INTO "field_definitions" ("moduleId", "fieldCode", "baseLabel", "fieldType", "isRequired", "displayOrder")
SELECT m.id, f.code, f.label, f.kind, f.required, f.position
FROM "modules" m CROSS JOIN (VALUES
 ('research_kind', 'Document type', 'text', true, 1),
 ('abstract', 'Abstract or description', 'textarea', true, 2),
 ('citation', 'Citation', 'textarea', false, 3),
 ('publication_year', 'Publication year', 'text', false, 4),
 ('license', 'Rights and permitted reuse', 'textarea', true, 5),
 ('field_notes', 'Field notes', 'textarea', false, 6),
 ('dataset_description', 'Dataset documentation', 'textarea', false, 7),
 ('model_card', 'Model card and limitations', 'textarea', false, 8)
) f(code, label, kind, required, position)
WHERE m.code = 'research'
ON CONFLICT ("moduleId", "fieldCode") DO NOTHING;
INSERT INTO "field_definitions" ("moduleId", "fieldCode", "baseLabel", "fieldType", "isRequired", "displayOrder")
SELECT id, 'subject_area', 'Subject area', 'text', false, 900 FROM "modules"
WHERE code IN ('dictionary','proverbs','riddles','oral_histories','folktales','songs','artifacts','heritage_sites','research')
ON CONFLICT ("moduleId", "fieldCode") DO NOTHING;
