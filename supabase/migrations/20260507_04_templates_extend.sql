-- ============================================================================
-- Etap II-A — § II-A.2 + A5 versioning + D1 audit sanitization
-- ============================================================================

-- Rozszerzenie gmp_document_templates
ALTER TABLE gmp_document_templates
    ADD COLUMN IF NOT EXISTS kind gmp_document_template_kind,
    ADD COLUMN IF NOT EXISTS template_format TEXT DEFAULT 'docx',  -- docx | xlsx
    ADD COLUMN IF NOT EXISTS auto_for_categories TEXT[],
    ADD COLUMN IF NOT EXISTS auto_for_kinds TEXT[],
    ADD COLUMN IF NOT EXISTS auto_for_party_types TEXT[],
    ADD COLUMN IF NOT EXISTS auto_in_startup_pack BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS required_fields TEXT[],
    -- A5: versioning szablonów
    ADD COLUMN IF NOT EXISTS version INT DEFAULT 1,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES gmp_staff;

CREATE INDEX IF NOT EXISTS idx_doc_templates_kind ON gmp_document_templates(kind, is_active);
CREATE INDEX IF NOT EXISTS idx_doc_templates_startup
    ON gmp_document_templates(is_active) WHERE auto_in_startup_pack;

-- A5: Trigger version bump przy zmianie storage_path
CREATE OR REPLACE FUNCTION gmp_template_version_bump() RETURNS TRIGGER AS $$
BEGIN
    IF NEW.storage_path IS DISTINCT FROM OLD.storage_path THEN
        NEW.version = COALESCE(OLD.version, 1) + 1;
        NEW.updated_at = NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_template_version_bump ON gmp_document_templates;
CREATE TRIGGER trg_template_version_bump BEFORE UPDATE ON gmp_document_templates
    FOR EACH ROW EXECUTE FUNCTION gmp_template_version_bump();

-- ============================================================================
-- Tabela log generacji DOCX (operational log — różny cel od gmp_audit_log)
-- ============================================================================
CREATE TABLE IF NOT EXISTS gmp_document_generation_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID REFERENCES gmp_cases ON DELETE CASCADE,
    template_id UUID REFERENCES gmp_document_templates,
    document_id UUID REFERENCES gmp_documents,
    generated_by UUID REFERENCES gmp_staff,
    generated_at TIMESTAMPTZ DEFAULT NOW(),
    parameters JSONB,
    status TEXT,                  -- success | partial | error
    error_message TEXT,
    duration_ms INT
);

CREATE INDEX IF NOT EXISTS idx_gen_log_case ON gmp_document_generation_log(case_id, generated_at DESC);
CREATE INDEX IF NOT EXISTS idx_gen_log_template ON gmp_document_generation_log(template_id, generated_at DESC);
CREATE INDEX IF NOT EXISTS idx_gen_log_errors ON gmp_document_generation_log(generated_at DESC) WHERE status = 'error';

ALTER TABLE gmp_document_generation_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "staff_can_read_gen_log" ON gmp_document_generation_log;
CREATE POLICY "staff_can_read_gen_log" ON gmp_document_generation_log
    FOR SELECT USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "staff_can_insert_gen_log" ON gmp_document_generation_log;
CREATE POLICY "staff_can_insert_gen_log" ON gmp_document_generation_log
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================================
-- D1: Sanityzacja audit log — usuwanie pól wrażliwych przed insertem
-- ============================================================================
CREATE OR REPLACE FUNCTION gmp_sanitize_audit_jsonb(p_data JSONB) RETURNS JSONB AS $$
BEGIN
    IF p_data IS NULL THEN RETURN NULL; END IF;
    RETURN p_data
        - 'pesel'
        - 'passport_number'
        - 'trusted_profile_password'
        - 'trusted_profile_login';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION gmp_sanitize_audit_jsonb IS
'D1 (RODO): usuwa pola wrażliwe (PESEL, passport, profil zaufany) z JSONB przed insertem do gmp_audit_log';

-- ============================================================================
-- Dodanie 'document_generated' do enum gmp_activity_type (jeśli go nie ma)
-- (split — najpierw ALTER, potem nic — wartość będzie używana przez generate-document)
-- ============================================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
        WHERE t.typname = 'gmp_activity_type' AND e.enumlabel = 'document_generated'
    ) THEN
        -- Note: ALTER TYPE w DO block — może się nie powieść przy concurrent transaction
        -- Awaryjnie — zignorować
        BEGIN
            ALTER TYPE gmp_activity_type ADD VALUE 'document_generated';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Could not add document_generated to gmp_activity_type: %', SQLERRM;
        END;
    END IF;
END $$;
