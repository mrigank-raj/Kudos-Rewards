-- ============================================================
-- 020_kiit_data_cleanup.sql
-- Removes the remaining software-company demo data:
--   * departments are free text instead of Design/Frontend/Backend/Product
--   * "Sales Star" (rule-based, never automated) becomes a manual
--     university program; no program is rule-based any more
--   * community category descriptions reworded for a university
-- ============================================================

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_team_check;
ALTER TABLE users ADD CONSTRAINT users_team_check
    CHECK (team IS NULL OR length(trim(team)) BETWEEN 1 AND 60);

ALTER TABLE pending_members DROP CONSTRAINT IF EXISTS pending_members_team_check;
ALTER TABLE pending_members ADD CONSTRAINT pending_members_team_check
    CHECK (team IS NULL OR length(trim(team)) BETWEEN 1 AND 60);

-- Nothing evaluates rule-based programs; HR awards every program by hand.
UPDATE reward_programs
SET name = 'Teaching Excellence',
    description = 'Outstanding teaching, mentoring or student outcomes.'
WHERE name = 'Sales Star';

UPDATE reward_programs
SET trigger_type = 'manual', rule_metric = NULL, rule_threshold = NULL
WHERE trigger_type = 'rule';

UPDATE community_categories SET description = 'IT, lab systems, software and technical problems'
WHERE slug = 'technical-help';
UPDATE community_categories SET description = 'ERP, email, portals, licences and setup'
WHERE slug = 'tools-software';
UPDATE community_categories SET name = 'University Processes', description = 'University policies, approvals and how things work here'
WHERE slug = 'company-processes';
UPDATE community_categories SET description = 'Productivity, campus life and wellbeing'
WHERE slug = 'workplace-tips';
