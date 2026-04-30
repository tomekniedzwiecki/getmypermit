-- ============================================================================
-- Etap III — § III.2 — Auto-create gmp_e_submission_status przy elektronicznie
-- ============================================================================

CREATE OR REPLACE FUNCTION gmp_ensure_e_submission_status() RETURNS TRIGGER AS $$
BEGIN
    IF NEW.submission_method = 'elektronicznie' THEN
        INSERT INTO gmp_e_submission_status (case_id) VALUES (NEW.id)
        ON CONFLICT (case_id) DO NOTHING;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ensure_e_submission ON gmp_cases;
CREATE TRIGGER trg_ensure_e_submission AFTER INSERT OR UPDATE OF submission_method ON gmp_cases
    FOR EACH ROW EXECUTE FUNCTION gmp_ensure_e_submission_status();
