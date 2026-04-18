-- Client intake form dla MOS 2.0 playbook
-- Klient wypełnia formularz po otrzymaniu linku, potem kancelaria generuje MOS 2.0 playbook

CREATE TABLE IF NOT EXISTS gmp_intake_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token TEXT NOT NULL UNIQUE,
    case_id UUID REFERENCES gmp_cases(id) ON DELETE CASCADE,
    client_id UUID REFERENCES gmp_clients(id) ON DELETE SET NULL,
    language TEXT DEFAULT 'en' CHECK (language IN ('pl', 'en', 'uk', 'ru', 'hi')),
    status TEXT NOT NULL DEFAULT 'invited' CHECK (status IN ('invited', 'in_progress', 'submitted', 'approved', 'rejected')),
    current_step INT DEFAULT 0,
    data JSONB DEFAULT '{}'::jsonb,
    expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '30 days',
    submitted_at TIMESTAMPTZ,
    reviewed_by UUID REFERENCES gmp_staff(id),
    reviewed_at TIMESTAMPTZ,
    review_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES gmp_staff(id),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_intake_token ON gmp_intake_tokens(token);
CREATE INDEX IF NOT EXISTS idx_intake_case ON gmp_intake_tokens(case_id);
CREATE INDEX IF NOT EXISTS idx_intake_status ON gmp_intake_tokens(status, created_at DESC);

CREATE TABLE IF NOT EXISTS gmp_intake_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    intake_id UUID REFERENCES gmp_intake_tokens(id) ON DELETE CASCADE,
    doc_type TEXT NOT NULL,  -- 'passport' | 'contract' | 'payslip' | 'biometric_photo' | 'registration' | 'birth_certificate' | 'other'
    storage_path TEXT NOT NULL,
    file_name TEXT,
    file_size INT,
    mime_type TEXT,
    ocr_data JSONB,
    validation JSONB,  -- {status: 'ok'|'warning'|'error', issues: []}
    uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_intake_docs_intake ON gmp_intake_documents(intake_id);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION gmp_intake_bump_updated() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_intake_updated ON gmp_intake_tokens;
CREATE TRIGGER trg_intake_updated BEFORE UPDATE ON gmp_intake_tokens
    FOR EACH ROW EXECUTE FUNCTION gmp_intake_bump_updated();

-- Auto-update status 'invited' -> 'in_progress' when data changes
CREATE OR REPLACE FUNCTION gmp_intake_auto_progress() RETURNS TRIGGER AS $$
BEGIN
    IF NEW.data IS DISTINCT FROM OLD.data AND OLD.status = 'invited' THEN
        NEW.status = 'in_progress';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_intake_progress ON gmp_intake_tokens;
CREATE TRIGGER trg_intake_progress BEFORE UPDATE ON gmp_intake_tokens
    FOR EACH ROW EXECUTE FUNCTION gmp_intake_auto_progress();

-- RLS
ALTER TABLE gmp_intake_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE gmp_intake_documents ENABLE ROW LEVEL SECURITY;

-- Anon: może SELECT/UPDATE po tokenie (token jest praktycznie secret jako 32-char random)
DROP POLICY IF EXISTS intake_anon_read ON gmp_intake_tokens;
CREATE POLICY intake_anon_read ON gmp_intake_tokens FOR SELECT TO anon USING (expires_at > NOW());

DROP POLICY IF EXISTS intake_anon_update ON gmp_intake_tokens;
CREATE POLICY intake_anon_update ON gmp_intake_tokens FOR UPDATE TO anon
    USING (expires_at > NOW() AND status IN ('invited', 'in_progress'))
    WITH CHECK (status IN ('invited', 'in_progress', 'submitted'));

-- Authenticated (staff): pełen dostęp
DROP POLICY IF EXISTS intake_auth_all ON gmp_intake_tokens;
CREATE POLICY intake_auth_all ON gmp_intake_tokens FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS intake_docs_anon_read ON gmp_intake_documents;
CREATE POLICY intake_docs_anon_read ON gmp_intake_documents FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS intake_docs_anon_insert ON gmp_intake_documents;
CREATE POLICY intake_docs_anon_insert ON gmp_intake_documents FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS intake_docs_anon_delete ON gmp_intake_documents;
CREATE POLICY intake_docs_anon_delete ON gmp_intake_documents FOR DELETE TO anon USING (true);

DROP POLICY IF EXISTS intake_docs_auth_all ON gmp_intake_documents;
CREATE POLICY intake_docs_auth_all ON gmp_intake_documents FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Storage bucket (idempotent)
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('intake-docs', 'intake-docs', false, 10485760)  -- 10MB max
ON CONFLICT (id) DO NOTHING;

-- Storage policies (anon może upload/read/delete w swoim prefixie = token)
DROP POLICY IF EXISTS intake_storage_anon_select ON storage.objects;
CREATE POLICY intake_storage_anon_select ON storage.objects FOR SELECT TO anon USING (bucket_id = 'intake-docs');

DROP POLICY IF EXISTS intake_storage_anon_insert ON storage.objects;
CREATE POLICY intake_storage_anon_insert ON storage.objects FOR INSERT TO anon WITH CHECK (bucket_id = 'intake-docs');

DROP POLICY IF EXISTS intake_storage_anon_delete ON storage.objects;
CREATE POLICY intake_storage_anon_delete ON storage.objects FOR DELETE TO anon USING (bucket_id = 'intake-docs');

DROP POLICY IF EXISTS intake_storage_auth_all ON storage.objects;
CREATE POLICY intake_storage_auth_all ON storage.objects FOR ALL TO authenticated USING (bucket_id = 'intake-docs') WITH CHECK (bucket_id = 'intake-docs');
