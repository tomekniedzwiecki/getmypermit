-- ============================================================================
-- Etap V.2 — group_id w gmp_documents + gmp_tasks (B11/D2)
-- Cel: dokumenty/zadania mogą być przywiązane do GRUPY zamiast pojedynczej sprawy
-- ============================================================================

-- DOCUMENTS
ALTER TABLE gmp_documents
    ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES gmp_case_groups ON DELETE SET NULL;

ALTER TABLE gmp_documents DROP CONSTRAINT IF EXISTS chk_doc_case_or_group;
ALTER TABLE gmp_documents ALTER COLUMN case_id DROP NOT NULL;
ALTER TABLE gmp_documents
    ADD CONSTRAINT chk_doc_case_or_group CHECK (case_id IS NOT NULL OR group_id IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_documents_group
    ON gmp_documents(group_id) WHERE group_id IS NOT NULL;

-- TASKS (Decision D2 z roadmap — case_id may be NULL when group_id present)
ALTER TABLE gmp_tasks
    ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES gmp_case_groups ON DELETE CASCADE;

ALTER TABLE gmp_tasks DROP CONSTRAINT IF EXISTS chk_task_case_or_group;
ALTER TABLE gmp_tasks ALTER COLUMN case_id DROP NOT NULL;
ALTER TABLE gmp_tasks
    ADD CONSTRAINT chk_task_case_or_group CHECK (case_id IS NOT NULL OR group_id IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_tasks_group
    ON gmp_tasks(group_id) WHERE group_id IS NOT NULL;

COMMENT ON COLUMN gmp_documents.group_id IS 'Pawel V.2 — dokument przywiązany do GRUPY (np. KRS pracodawcy współdzielony przez członków grupy)';
COMMENT ON COLUMN gmp_tasks.group_id IS 'Pawel V.2 (D2) — zadanie grupowe (np. spotkanie zbiorcze z pracodawcą). Może mieć case_id NULL.';
