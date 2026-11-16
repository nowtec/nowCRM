-- Letter Feature Migration Script
INSERT INTO channels (name, type, description, is_active, created_at, updated_at)
SELECT 'Letter', 'letter', 'PDF letter generation', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE type = 'letter');

INSERT INTO letter_templates (name, description, file_path, file_type, is_active, created_at, updated_at)
SELECT 'Business Letter', 'Professional letter', '/templates/business_letter.docx', 'docx', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM letter_templates WHERE name = 'Business Letter');

INSERT INTO letter_templates (name, description, file_path, file_type, is_active, created_at, updated_at)
SELECT 'Invoice Template', 'Invoice template', '/templates/invoice.docx', 'docx', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM letter_templates WHERE name = 'Invoice Template');

INSERT INTO permissions (action, subject, properties, conditions, role_id, created_at, updated_at)
SELECT 'create', 'api::letter-template.letter-template', '{}', '{}', r.id, NOW(), NOW()
FROM roles r WHERE r.code = 'strapi-super-admin'
AND NOT EXISTS (SELECT 1 FROM permissions WHERE action = 'create' AND subject = 'api::letter-template.letter-template' AND role_id = r.id);

INSERT INTO permissions (action, subject, properties, conditions, role_id, created_at, updated_at)
SELECT 'read', 'api::letter-template.letter-template', '{}', '{}', r.id, NOW(), NOW()
FROM roles r WHERE r.code = 'strapi-super-admin'
AND NOT EXISTS (SELECT 1 FROM permissions WHERE action = 'read' AND subject = 'api::letter-template.letter-template' AND role_id = r.id);

INSERT INTO permissions (action, subject, properties, conditions, role_id, created_at, updated_at)
SELECT 'update', 'api::letter-template.letter-template', '{}', '{}', r.id, NOW(), NOW()
FROM roles r WHERE r.code = 'strapi-super-admin'
AND NOT EXISTS (SELECT 1 FROM permissions WHERE action = 'update' AND subject = 'api::letter-template.letter-template' AND role_id = r.id);

INSERT INTO permissions (action, subject, properties, conditions, role_id, created_at, updated_at)
SELECT 'delete', 'api::letter-template.letter-template', '{}', '{}', r.id, NOW(), NOW()
FROM roles r WHERE r.code = 'strapi-super-admin'
AND NOT EXISTS (SELECT 1 FROM permissions WHERE action = 'delete' AND subject = 'api::letter-template.letter-template' AND role_id = r.id);

INSERT INTO permissions (action, subject, properties, conditions, role_id, created_at, updated_at)
SELECT 'read', 'api::letter-template.letter-template', '{}', '{}', r.id, NOW(), NOW()
FROM roles r WHERE r.code = 'authenticated'
AND NOT EXISTS (SELECT 1 FROM permissions WHERE action = 'read' AND subject = 'api::letter-template.letter-template' AND role_id = r.id);

INSERT INTO permissions (action, subject, properties, conditions, role_id, created_at, updated_at)
SELECT 'create', 'api::letter.letter', '{}', '{}', r.id, NOW(), NOW()
FROM roles r WHERE r.code = 'authenticated'
AND NOT EXISTS (SELECT 1 FROM permissions WHERE action = 'create' AND subject = 'api::letter.letter' AND role_id = r.id);

INSERT INTO queue_configs (name, type, config, is_active, created_at, updated_at)
SELECT 'letter-processing', 'letter', '{"concurrency": 5}', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM queue_configs WHERE name = 'letter-processing');

SELECT 'Migration completed' as status;