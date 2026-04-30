-- ============================================================================
-- Etap III — § III.4 — Auto stage change po wniosek wysłany
-- ============================================================================
-- Po odznaczeniu submitted_at: update gmp_cases.stage + date_submitted
-- + insert do gmp_case_activities
-- ============================================================================

CREATE OR REPLACE FUNCTION gmp_after_submit_update_case() RETURNS TRIGGER AS $$
DECLARE
    v_kind gmp_case_kind;
    v_new_stage gmp_case_stage;
BEGIN
    -- Tylko gdy submitted_at zostało ustawione (nie było)
    IF NEW.submitted_at IS NOT NULL AND OLD.submitted_at IS NULL THEN
        SELECT kind INTO v_kind FROM gmp_cases WHERE id = NEW.case_id;

        -- Wybierz stage: oczekiwanie na osobiste jeśli stawiennictwo wymagane,
        -- inaczej zlozenie_wniosku
        v_new_stage := 'zlozenie_wniosku';

        UPDATE gmp_cases
        SET stage = v_new_stage,
            date_submitted = NEW.submitted_at::date,
            submission_method = COALESCE(NEW.submission_method_used, 'elektronicznie')
        WHERE id = NEW.case_id;

        -- Wpis w historii
        INSERT INTO gmp_case_activities (case_id, activity_type, content, metadata, created_by)
        VALUES (
            NEW.case_id,
            'status_change',
            'Wniosek złożony elektronicznie' ||
                CASE WHEN NEW.upo_number IS NOT NULL THEN ', UPO: ' || NEW.upo_number ELSE '' END,
            jsonb_build_object(
                'submitted_at', NEW.submitted_at,
                'upo_number', NEW.upo_number,
                'method', NEW.submission_method_used
            ),
            (SELECT id FROM gmp_staff WHERE user_id = auth.uid() LIMIT 1)
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_after_submit_update_case ON gmp_e_submission_status;
CREATE TRIGGER trg_after_submit_update_case AFTER UPDATE OF submitted_at ON gmp_e_submission_status
    FOR EACH ROW EXECUTE FUNCTION gmp_after_submit_update_case();
