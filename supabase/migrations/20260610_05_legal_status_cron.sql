-- ============================================================================
-- Etap VI.5 — pg_cron job: nightly recalc legal_stay_status
-- Cel: status zależy od CURRENT_DATE — bez tego sprawa "zielony" nie zmieni się na żółty/czerwony
-- ============================================================================

-- Funkcja recalc dla wszystkich aktywnych spraw
CREATE OR REPLACE FUNCTION gmp_recalc_legal_status_all() RETURNS INT AS $$
DECLARE
    cnt INT := 0;
BEGIN
    UPDATE gmp_cases
    SET legal_stay_status = gmp_calc_legal_stay_status(legal_stay_end_date)
    WHERE legal_stay_status IS DISTINCT FROM gmp_calc_legal_stay_status(legal_stay_end_date);
    GET DIAGNOSTICS cnt = ROW_COUNT;

    UPDATE gmp_case_work_legality
    SET work_status = gmp_calc_legal_stay_status(work_end_date)
    WHERE work_status IS DISTINCT FROM gmp_calc_legal_stay_status(work_end_date);

    RETURN cnt;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Schedule cron (codziennie o 02:00 UTC = 03:00/04:00 CET/CEST)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        -- Usuń stary job jeśli istnieje
        PERFORM cron.unschedule('gmp_legal_status_nightly') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'gmp_legal_status_nightly');
        PERFORM cron.schedule(
            'gmp_legal_status_nightly',
            '0 2 * * *',
            $cmd$ SELECT gmp_recalc_legal_status_all() $cmd$
        );
    END IF;
END$$;

COMMENT ON FUNCTION gmp_recalc_legal_status_all() IS 'Pawel VI.5 — nightly cron: recalc legal_stay_status + work_status na bazie CURRENT_DATE';
