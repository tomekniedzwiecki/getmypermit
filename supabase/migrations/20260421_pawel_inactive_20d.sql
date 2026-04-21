-- ============================================================
-- Dodatkowy prog inactive_20 w gmp_case_alerts + view "moje zaniedbane"
-- Zgloszenie Pawla 2026-04-21: opiekunowie chca zestawienie swoich spraw
-- w ktorych nie bylo czynnosci od 20 dni
-- ============================================================

-- Rozszerz progi w gmp_case_alerts: dodaj 'inactive_20' miedzy 14 a 30
CREATE OR REPLACE VIEW gmp_case_alerts AS
SELECT
    id AS case_id,
    case_number,
    client_id,
    assigned_to,
    status,
    stage,
    inactivity_reason,
    inactivity_note,
    date_last_activity,
    (CURRENT_DATE - date_last_activity) AS days_inactive,
    CASE
        WHEN (date_last_activity IS NULL) THEN 'never_active'::text
        WHEN ((CURRENT_DATE - date_last_activity) > 30) THEN 'inactive_30'::text
        WHEN ((CURRENT_DATE - date_last_activity) > 20) THEN 'inactive_20'::text
        WHEN ((CURRENT_DATE - date_last_activity) > 14) THEN 'inactive_14'::text
        ELSE 'ok'::text
    END AS inactivity_level
FROM gmp_cases c
WHERE (status = ANY (ARRAY['zlecona'::gmp_case_status, 'aktywna'::gmp_case_status]));

GRANT SELECT ON gmp_case_alerts TO authenticated;

COMMENT ON VIEW gmp_case_alerts IS
'Alerty bezczynnosci spraw. Poziomy: never_active / inactive_30 / inactive_20 / inactive_14 / ok. Inactive_20 dodany 2026-04-21 na prosbe Pawla (zestawienie dla opiekunow).';


-- Licznik zaniedbanych per opiekun (dla staff.html)
-- Rozszerzam gmp_staff_effectiveness o kolumny:
--   cases_inactive_20d — sprawy prowadzone bez czynnosci >20 dni
--   cases_inactive_30d — >30 dni (krytyczne)
DROP VIEW IF EXISTS gmp_staff_effectiveness CASCADE;
CREATE VIEW gmp_staff_effectiveness AS
SELECT
    s.id AS staff_id,
    s.full_name,
    s.role,
    s.color,
    s.is_active,
    COALESCE(cs.cases_accepted, 0) AS cases_accepted,
    COALESCE(cs.revenue_accepted, 0) AS revenue_accepted,
    COALESCE(cs.cases_active, 0) AS cases_active,
    COALESCE(cs.cases_assigned_total, 0) AS cases_assigned_total,
    COALESCE(ts.tasks_open, 0) AS tasks_open,
    COALESCE(ts.tasks_overdue, 0) AS tasks_overdue,
    COALESCE(ts.tasks_done, 0) AS tasks_done,
    COALESCE(ts.tasks_done_30d, 0) AS tasks_done_30d,
    COALESCE(bs.pending_balance, 0) AS pending_balance,
    COALESCE(ia.cases_inactive_20d, 0) AS cases_inactive_20d,
    COALESCE(ia.cases_inactive_30d, 0) AS cases_inactive_30d
FROM gmp_staff s
LEFT JOIN LATERAL (
    SELECT
        COUNT(*) FILTER (WHERE accepted_by = s.id) AS cases_accepted,
        SUM(fee_amount) FILTER (WHERE accepted_by = s.id) AS revenue_accepted,
        COUNT(*) FILTER (WHERE assigned_to = s.id AND status IN ('zlecona','aktywna')) AS cases_active,
        COUNT(*) FILTER (WHERE assigned_to = s.id) AS cases_assigned_total
    FROM gmp_cases
    WHERE accepted_by = s.id OR assigned_to = s.id
) cs ON TRUE
LEFT JOIN LATERAL (
    SELECT
        COUNT(*) FILTER (WHERE status IN ('pending','in_progress')) AS tasks_open,
        COUNT(*) FILTER (WHERE status IN ('pending','in_progress') AND due_date < CURRENT_DATE) AS tasks_overdue,
        COUNT(*) FILTER (WHERE status = 'done') AS tasks_done,
        COUNT(*) FILTER (WHERE status = 'done' AND completed_at >= NOW() - INTERVAL '30 days') AS tasks_done_30d
    FROM gmp_tasks
    WHERE assigned_to = s.id
) ts ON TRUE
LEFT JOIN LATERAL (
    SELECT SUM(GREATEST(b.balance_due, 0)) AS pending_balance
    FROM gmp_cases c JOIN gmp_case_balance b ON b.case_id = c.id
    WHERE c.assigned_to = s.id AND c.status IN ('zlecona','aktywna')
) bs ON TRUE
LEFT JOIN LATERAL (
    SELECT
        COUNT(*) FILTER (WHERE (CURRENT_DATE - date_last_activity) > 20 OR date_last_activity IS NULL) AS cases_inactive_20d,
        COUNT(*) FILTER (WHERE (CURRENT_DATE - date_last_activity) > 30 OR date_last_activity IS NULL) AS cases_inactive_30d
    FROM gmp_cases
    WHERE assigned_to = s.id AND status IN ('zlecona','aktywna')
) ia ON TRUE;

GRANT SELECT ON gmp_staff_effectiveness TO authenticated;

COMMENT ON VIEW gmp_staff_effectiveness IS
'Efektywnosc per staff — LATERAL JOIN. +cases_inactive_20d/30d (prosba Pawla 2026-04-21).';
