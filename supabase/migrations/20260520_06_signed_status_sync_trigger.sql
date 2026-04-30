-- ============================================================================
-- Etap III — § III.7 — Trigger spójności statusów dokumentów (review A4)
-- ============================================================================
-- Gdy zalacznik_nr_1_signed zmieni się na TRUE → znajdź dokument
-- kind='zalacznik_nr_1' tej sprawy i ustaw status='signed' + signed_at
-- + signed_by_party (wg zalacznik_nr_1_model)
-- ============================================================================

CREATE OR REPLACE FUNCTION gmp_sync_zalacznik_signed_status() RETURNS TRIGGER AS $$
DECLARE
    v_signer TEXT;
BEGIN
    IF NEW.zalacznik_nr_1_signed = TRUE AND
       (OLD.zalacznik_nr_1_signed IS DISTINCT FROM TRUE) THEN
        v_signer := CASE NEW.zalacznik_nr_1_model
            WHEN 'pracodawca_pelnomocnictwo' THEN 'kancelaria'
            WHEN 'pracodawca_samodzielnie'  THEN 'pracodawca'
            ELSE 'pracodawca'
        END;
        UPDATE gmp_documents
        SET status = 'signed',
            signed_at = NOW(),
            signed_by_party = v_signer
        WHERE case_id = NEW.case_id
          AND doc_type = 'zalacznik_nr_1'
          AND status != 'signed';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_zalacznik_signed ON gmp_e_submission_status;
CREATE TRIGGER trg_sync_zalacznik_signed AFTER UPDATE OF zalacznik_nr_1_signed
    ON gmp_e_submission_status
    FOR EACH ROW EXECUTE FUNCTION gmp_sync_zalacznik_signed_status();
