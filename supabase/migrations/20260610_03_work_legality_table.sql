-- ============================================================================
-- Etap VI.3 — Tabela gmp_case_work_legality (Decision D3 — osobna 1:1 tabela)
-- Cel: szczegóły legalności pracy (data od/do, podstawa, status auto)
-- ============================================================================

CREATE TABLE IF NOT EXISTS gmp_case_work_legality (
    case_id UUID PRIMARY KEY REFERENCES gmp_cases ON DELETE CASCADE,
    work_basis TEXT,                       -- np. 'oświadczenie pracodawcy', 'zezwolenie A', 'OWP'
    work_start_date DATE,
    work_end_date DATE,
    work_status gmp_legal_status,
    work_notes TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES gmp_staff
);

CREATE INDEX IF NOT EXISTS idx_work_legality_status
    ON gmp_case_work_legality(work_status) WHERE work_status IS NOT NULL;

ALTER TABLE gmp_case_work_legality ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "staff_work_legality" ON gmp_case_work_legality;
CREATE POLICY "staff_work_legality" ON gmp_case_work_legality FOR ALL USING (auth.uid() IS NOT NULL);

-- Trigger auto-derive work_status z work_end_date
CREATE OR REPLACE FUNCTION gmp_update_work_status() RETURNS TRIGGER AS $$
BEGIN
    NEW.work_status = gmp_calc_legal_stay_status(NEW.work_end_date);
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_work_status ON gmp_case_work_legality;
CREATE TRIGGER trg_update_work_status BEFORE INSERT OR UPDATE ON gmp_case_work_legality
    FOR EACH ROW EXECUTE FUNCTION gmp_update_work_status();

COMMENT ON TABLE gmp_case_work_legality IS 'Pawel D3 — szczegóły legalności pracy w sprawie (1:1 z gmp_cases). Status auto z work_end_date.';
