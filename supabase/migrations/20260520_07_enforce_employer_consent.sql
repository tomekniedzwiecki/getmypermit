-- ============================================================================
-- Etap III — § III.8 — Enforce zgody przekazywania statusu pracodawcy (RODO, A7)
-- ============================================================================
-- Trigger BEFORE UPDATE blokujący gdy chcesz wysłać raport pracodawcy bez
-- podpisanej zgody.
-- ============================================================================

CREATE OR REPLACE FUNCTION gmp_check_employer_consent() RETURNS TRIGGER AS $$
DECLARE
    v_has_consent BOOLEAN;
    v_employer_id UUID;
BEGIN
    -- Tylko gdy ustawiamy notify_pracodawca lub generujemy raport pracodawcy
    IF NEW.notify_pracodawca_after_submit = TRUE OR
       (NEW.report_pracodawca_generated_at IS NOT NULL AND OLD.report_pracodawca_generated_at IS NULL) THEN

        SELECT employer_id INTO v_employer_id FROM gmp_cases WHERE id = NEW.case_id;
        IF v_employer_id IS NULL THEN RETURN NEW; END IF;  -- Brak pracodawcy = brak ryzyka

        SELECT EXISTS (
            SELECT 1 FROM gmp_documents
            WHERE case_id = NEW.case_id
              AND doc_type = 'zgoda_przekazywania_statusu'
              AND status = 'signed'
        ) INTO v_has_consent;

        IF NOT v_has_consent THEN
            RAISE EXCEPTION 'RODO: brak podpisanej zgody przekazywania statusu pracodawcy. Wygeneruj i daj klientowi do podpisu dokument zgoda_przekazywania_statusu_pracodawcy.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_check_employer_consent ON gmp_e_submission_status;
CREATE TRIGGER trg_check_employer_consent BEFORE UPDATE
    OF notify_pracodawca_after_submit, report_pracodawca_generated_at
    ON gmp_e_submission_status
    FOR EACH ROW EXECUTE FUNCTION gmp_check_employer_consent();
