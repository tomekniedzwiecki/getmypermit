-- ============================================================
-- Uwagi Pawła 2026-04-20: Nowe pola na karcie sprawy
-- Źródło: uwagi-pawla-2026-04-20.md (pkt 8)
-- ============================================================

-- =================================================================
-- 1) Pola szczegółowe (pkt 8)
-- =================================================================
ALTER TABLE gmp_cases
    -- Data zakończenia legalnego pobytu (pomysł Karol M. + Michał K.)
    ADD COLUMN IF NOT EXISTS legal_stay_end_date DATE,
    -- "Gdzie to leży" — lokalizacja teczki w kancelarii
    ADD COLUMN IF NOT EXISTS document_location TEXT,
    -- Osoba przyjmująca sprawę (inna niż opiekun)
    -- Paweł przyjmuje sprawy, potem dekretuje na innych
    ADD COLUMN IF NOT EXISTS accepted_by UUID REFERENCES gmp_staff(id),
    -- Data przekazania sprawy opiekunowi
    ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_cases_legal_stay_end
    ON gmp_cases(legal_stay_end_date) WHERE legal_stay_end_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cases_accepted_by
    ON gmp_cases(accepted_by) WHERE accepted_by IS NOT NULL;

COMMENT ON COLUMN gmp_cases.legal_stay_end_date IS
'Data zakończenia legalnego pobytu klienta (pkt 8 uwag Pawła). Sort po tej kolumnie w kolejce wniosku.';
COMMENT ON COLUMN gmp_cases.document_location IS
'Gdzie leży teczka w kancelarii — wolnotekstowe (pkt 8 uwag Pawła).';
COMMENT ON COLUMN gmp_cases.accepted_by IS
'Pracownik który przyjął sprawę — inna osoba niż opiekun (pkt 8 uwag Pawła). Raporty przychodów liczone po accepted_by, nie assigned_to.';
COMMENT ON COLUMN gmp_cases.assigned_at IS
'Data przekazania sprawy opiekunowi (pkt 8 uwag Pawła).';


-- =================================================================
-- 2) Trigger: automatycznie ustaw assigned_at przy zmianie assigned_to
-- =================================================================
CREATE OR REPLACE FUNCTION gmp_track_assignment_change() RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF NEW.assigned_to IS NOT NULL AND NEW.assigned_at IS NULL THEN
            NEW.assigned_at := NOW();
        END IF;
    ELSIF TG_OP = 'UPDATE' THEN
        IF COALESCE(NEW.assigned_to::text,'') <> COALESCE(OLD.assigned_to::text,'') THEN
            NEW.assigned_at := NOW();
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_gmp_track_assignment_change ON gmp_cases;
CREATE TRIGGER trg_gmp_track_assignment_change
    BEFORE INSERT OR UPDATE OF assigned_to ON gmp_cases
    FOR EACH ROW EXECUTE FUNCTION gmp_track_assignment_change();
