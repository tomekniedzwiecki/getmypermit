-- ============================================================================
-- Etap VI.2 — legal_stay_status na gmp_cases + trigger auto-update
-- Cel: derived column z legal_stay_end_date — zielony/żółty/czerwony/brak
-- ============================================================================

ALTER TABLE gmp_cases
    ADD COLUMN IF NOT EXISTS legal_stay_status gmp_legal_status;

-- Funkcja kalkulacji statusu (zielony >30 dni, żółty 0-30, czerwony <0, brak gdy NULL)
CREATE OR REPLACE FUNCTION gmp_calc_legal_stay_status(p_end_date DATE)
RETURNS gmp_legal_status AS $$
BEGIN
    IF p_end_date IS NULL THEN RETURN 'brak'; END IF;
    IF p_end_date < CURRENT_DATE THEN RETURN 'czerwony'; END IF;
    IF p_end_date - CURRENT_DATE <= 30 THEN RETURN 'zolty'; END IF;
    RETURN 'zielony';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Trigger: aktualizuj status przy każdej zmianie legal_stay_end_date
CREATE OR REPLACE FUNCTION gmp_update_legal_stay_status() RETURNS TRIGGER AS $$
BEGIN
    NEW.legal_stay_status = gmp_calc_legal_stay_status(NEW.legal_stay_end_date);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_legal_stay_status ON gmp_cases;
CREATE TRIGGER trg_update_legal_stay_status BEFORE INSERT OR UPDATE OF legal_stay_end_date ON gmp_cases
    FOR EACH ROW EXECUTE FUNCTION gmp_update_legal_stay_status();

-- Backfill istniejących wierszy
UPDATE gmp_cases SET legal_stay_status = gmp_calc_legal_stay_status(legal_stay_end_date) WHERE legal_stay_status IS NULL;

-- Index dla filtrów Kanban + dashboard KPI
CREATE INDEX IF NOT EXISTS idx_cases_legal_stay_status ON gmp_cases(legal_stay_status) WHERE legal_stay_status IS NOT NULL;

COMMENT ON COLUMN gmp_cases.legal_stay_status IS 'Auto-derived z legal_stay_end_date (trigger). Recalkulowany przez nightly cron żeby uwzględnić upływ czasu.';
