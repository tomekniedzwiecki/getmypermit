-- ============================================================
-- Zatwierdzanie dokumentów z ankiety elektronicznej
-- Odpowiedź Pawła z 2026-04-20: "zatwierdź dokument"
-- (nie automatyczny flow — pracownik ręcznie zatwierdza każdy dokument)
-- ============================================================

-- 1) Flaga zatwierdzenia na gmp_intake_documents
ALTER TABLE gmp_intake_documents
    ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES gmp_staff(id),
    ADD COLUMN IF NOT EXISTS gmp_document_id UUID REFERENCES gmp_documents(id) ON DELETE SET NULL;

COMMENT ON COLUMN gmp_intake_documents.approved_at IS
'Kiedy pracownik kancelarii zatwierdził dokument — wtedy tworzy się referencja w gmp_documents (pkt 12 uwag Pawła — "zatwierdź dokument").';

-- 2) Referencja w głównej tabeli dokumentów — dodaj kolumnę żeby wskazać że dokument pochodzi z ankiety
ALTER TABLE gmp_documents
    ADD COLUMN IF NOT EXISTS intake_document_id UUID REFERENCES gmp_intake_documents(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS doc_type TEXT,
    ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'upload'
        CHECK (source IN ('upload','intake_approved','generated'));

CREATE INDEX IF NOT EXISTS idx_documents_intake ON gmp_documents(intake_document_id) WHERE intake_document_id IS NOT NULL;


-- 3) RPC: zatwierdź dokument z ankiety → utwórz rekord w gmp_documents
-- Nie kopiujemy pliku — storage_path wskazuje na bucket intake-docs (oszczędność storage)
CREATE OR REPLACE FUNCTION gmp_approve_intake_document(p_intake_doc_id UUID)
    RETURNS UUID AS $$
DECLARE
    v_case_id UUID;
    v_doc_id UUID;
    v_intake RECORD;
    v_staff_id UUID;
BEGIN
    SELECT id INTO v_staff_id FROM gmp_staff WHERE user_id = auth.uid() LIMIT 1;

    SELECT id.storage_path, id.file_name, id.file_size, id.mime_type, id.doc_type, it.case_id
    INTO v_intake
    FROM gmp_intake_documents id
    JOIN gmp_intake_tokens it ON it.id = id.intake_id
    WHERE id.id = p_intake_doc_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Dokument ankiety % nie istnieje', p_intake_doc_id;
    END IF;

    IF v_intake.case_id IS NULL THEN
        RAISE EXCEPTION 'Ankieta nie jest powiązana ze sprawą — nie można zatwierdzić dokumentu';
    END IF;

    -- Idempotentność: jeśli już zatwierdzony, zwróć istniejące gmp_document_id
    SELECT gmp_document_id INTO v_doc_id FROM gmp_intake_documents WHERE id = p_intake_doc_id;
    IF v_doc_id IS NOT NULL THEN
        RETURN v_doc_id;
    END IF;

    -- Utwórz rekord w gmp_documents (storage_path wskazuje na bucket intake-docs — nie kopiujemy pliku)
    INSERT INTO gmp_documents (
        case_id, name, storage_path, mime_type, file_size,
        uploaded_by, intake_document_id, doc_type, source
    ) VALUES (
        v_intake.case_id,
        COALESCE(v_intake.file_name, v_intake.doc_type || ' (z ankiety)'),
        v_intake.storage_path,
        v_intake.mime_type,
        v_intake.file_size,
        v_staff_id,
        p_intake_doc_id,
        v_intake.doc_type,
        'intake_approved'
    ) RETURNING id INTO v_doc_id;

    -- Oznacz intake doc jako zatwierdzony
    UPDATE gmp_intake_documents
    SET approved_at = NOW(),
        approved_by = v_staff_id,
        gmp_document_id = v_doc_id
    WHERE id = p_intake_doc_id;

    RETURN v_doc_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION gmp_approve_intake_document(UUID) TO authenticated;

COMMENT ON FUNCTION gmp_approve_intake_document IS
'Zatwierdza dokument z ankiety klienta: tworzy rekord w gmp_documents (sprawy) wskazujący na plik w buckecie intake-docs. Nie kopiuje pliku. Idempotentne.';
