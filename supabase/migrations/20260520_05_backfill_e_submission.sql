-- ============================================================================
-- Etap III — § III.6 — Backfill istniejących spraw z elektronicznie (review A2)
-- ============================================================================
-- Trigger gmp_ensure_e_submission_status uruchamia się tylko na INSERT/UPDATE.
-- Istniejące sprawy z submission_method=elektronicznie nie dostały rekordu.
-- ============================================================================

INSERT INTO gmp_e_submission_status (case_id)
SELECT id FROM gmp_cases WHERE submission_method = 'elektronicznie'
ON CONFLICT (case_id) DO NOTHING;
