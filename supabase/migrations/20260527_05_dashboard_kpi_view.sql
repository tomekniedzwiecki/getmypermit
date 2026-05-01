-- ============================================================================
-- Etap IV.6 — View gmp_case_dashboard_kpi (E6)
-- Cel: 1 view zbierający KPI dla dashboardu (refactor — dashboard.html ma już 1230 linii JS)
-- UWAGA: legal_stay_status będzie dodane w Etapie VI (Legalność) — wówczas re-create view z legal_red/yellow/green
-- ============================================================================

CREATE OR REPLACE VIEW gmp_case_dashboard_kpi AS
WITH counts AS (
    SELECT
        COUNT(*) FILTER (WHERE status = 'aktywna') AS aktywne,
        COUNT(*) FILTER (WHERE status = 'lead') AS leady,
        COUNT(*) FILTER (WHERE status = 'zakonczona' AND date_decision >= CURRENT_DATE - 90)
            AS decyzje_90d,
        COUNT(*) FILTER (WHERE status = 'zakonczona' AND date_decision >= CURRENT_DATE - 90
                         AND decision_outcome = 'pozytywna') AS pozytywne_90d,
        COUNT(*) FILTER (WHERE status = 'zakonczona' AND date_decision >= CURRENT_DATE - 90
                         AND decision_outcome IN ('negatywna', 'odmowa')) AS negatywne_90d,
        COUNT(*) FILTER (WHERE status = 'zakonczona' AND date_decision >= CURRENT_DATE - 90
                         AND decision_outcome = 'czesciowo_pozytywna') AS czesciowo_90d
    FROM gmp_cases
)
SELECT
    aktywne, leady, decyzje_90d, pozytywne_90d, negatywne_90d, czesciowo_90d,
    CASE WHEN decyzje_90d > 0
         THEN ROUND(pozytywne_90d::numeric / decyzje_90d * 100, 1)
         ELSE NULL END AS sukces_pct
FROM counts;

GRANT SELECT ON gmp_case_dashboard_kpi TO authenticated;

COMMENT ON VIEW gmp_case_dashboard_kpi IS 'Pawel E6 — KPI dashboardu: aktywne, leady, decyzje 90d, sukces %. Etap VI doda legal_red/yellow/green.';
