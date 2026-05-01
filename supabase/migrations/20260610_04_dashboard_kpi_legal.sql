-- ============================================================================
-- Etap VI.4 — Aktualizacja gmp_case_dashboard_kpi o legal_red/yellow/green
-- ============================================================================

DROP VIEW IF EXISTS gmp_case_dashboard_kpi;

CREATE OR REPLACE VIEW gmp_case_dashboard_kpi AS
WITH counts AS (
    SELECT
        COUNT(*) FILTER (WHERE status = 'aktywna') AS aktywne,
        COUNT(*) FILTER (WHERE status = 'lead') AS leady,
        COUNT(*) FILTER (WHERE status = 'zakonczona' AND date_decision >= CURRENT_DATE - 90) AS decyzje_90d,
        COUNT(*) FILTER (WHERE status = 'zakonczona' AND date_decision >= CURRENT_DATE - 90
                         AND decision_outcome = 'pozytywna') AS pozytywne_90d,
        COUNT(*) FILTER (WHERE status = 'zakonczona' AND date_decision >= CURRENT_DATE - 90
                         AND decision_outcome IN ('negatywna', 'odmowa')) AS negatywne_90d,
        COUNT(*) FILTER (WHERE status = 'zakonczona' AND date_decision >= CURRENT_DATE - 90
                         AND decision_outcome = 'czesciowo_pozytywna') AS czesciowo_90d,
        COUNT(*) FILTER (WHERE legal_stay_status = 'czerwony' AND status IN ('aktywna', 'zlecona')) AS legal_red,
        COUNT(*) FILTER (WHERE legal_stay_status = 'zolty' AND status IN ('aktywna', 'zlecona')) AS legal_yellow,
        COUNT(*) FILTER (WHERE legal_stay_status = 'zielony' AND status IN ('aktywna', 'zlecona')) AS legal_green
    FROM gmp_cases
)
SELECT
    aktywne, leady, decyzje_90d, pozytywne_90d, negatywne_90d, czesciowo_90d,
    CASE WHEN decyzje_90d > 0
         THEN ROUND(pozytywne_90d::numeric / decyzje_90d * 100, 1)
         ELSE NULL END AS sukces_pct,
    legal_red, legal_yellow, legal_green
FROM counts;

GRANT SELECT ON gmp_case_dashboard_kpi TO authenticated;

COMMENT ON VIEW gmp_case_dashboard_kpi IS 'Pawel E6 — KPI dashboardu (aktywne/leady/decyzje 90d/sukces % + legal red/yellow/green).';
