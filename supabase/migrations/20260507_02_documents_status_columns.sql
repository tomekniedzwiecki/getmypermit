-- ============================================================================
-- Etap II-A — § II-A.1 — Rozszerzenie gmp_documents o status + sygnatury
-- ============================================================================

ALTER TABLE gmp_documents
    ADD COLUMN IF NOT EXISTS status gmp_document_status DEFAULT 'ready',
    ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS signed_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS signed_by_party TEXT;  -- 'klient' | 'pracodawca' | 'kancelaria' | 'oboje'

-- Indeksy dla 4-sekcjowej zakładki Dokumenty
CREATE INDEX IF NOT EXISTS idx_documents_status ON gmp_documents(case_id, status);
CREATE INDEX IF NOT EXISTS idx_documents_awaiting ON gmp_documents(case_id)
    WHERE status = 'awaiting_signature';
CREATE INDEX IF NOT EXISTS idx_documents_to_send ON gmp_documents(case_id)
    WHERE status = 'signed' AND sent_at IS NULL;

COMMENT ON COLUMN gmp_documents.status IS
'Status dokumentu (Pawel pkt 7): draft / ready / awaiting_signature / signed / sent / archived';
