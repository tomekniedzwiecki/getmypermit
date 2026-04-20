-- ============================================================
-- Uwagi Pawła 2026-04-20: Zestawienia per opiekun + alert brak reakcji pracodawcy
-- Źródło: uwagi-pawla-2026-04-20.md (pkt 10, 11)
-- ============================================================

-- =================================================================
-- 1) VIEW: efektywność pracowników (pkt 10)
-- Kto ile spraw przyjął (accepted_by) + ile prowadzi (assigned_to) + ile zadań
-- =================================================================
CREATE OR REPLACE VIEW gmp_staff_effectiveness AS
SELECT
    s.id AS staff_id,
    s.full_name,
    s.role,
    s.color,
    s.is_active,
    -- Ile przyjął spraw (accepted_by)
    COALESCE((SELECT COUNT(*) FROM gmp_cases c WHERE c.accepted_by = s.id), 0) AS cases_accepted,
    -- Suma kwot z przyjętych spraw
    COALESCE((SELECT SUM(c.fee_amount) FROM gmp_cases c WHERE c.accepted_by = s.id), 0) AS revenue_accepted,
    -- Ile prowadzi aktywnie (assigned_to + status in aktywna/zlecona)
    COALESCE((SELECT COUNT(*) FROM gmp_cases c
              WHERE c.assigned_to = s.id AND c.status IN ('zlecona','aktywna')), 0) AS cases_active,
    -- Ile prowadzi łącznie
    COALESCE((SELECT COUNT(*) FROM gmp_cases c WHERE c.assigned_to = s.id), 0) AS cases_assigned_total,
    -- Ile ma otwartych zadań
    COALESCE((SELECT COUNT(*) FROM gmp_tasks t
              WHERE t.assigned_to = s.id AND t.status IN ('pending','in_progress')), 0) AS tasks_open,
    -- Ile zadań po terminie
    COALESCE((SELECT COUNT(*) FROM gmp_tasks t
              WHERE t.assigned_to = s.id AND t.status IN ('pending','in_progress')
                AND t.due_date < CURRENT_DATE), 0) AS tasks_overdue,
    -- Ile zadań zrobionych (ever)
    COALESCE((SELECT COUNT(*) FROM gmp_tasks t
              WHERE t.assigned_to = s.id AND t.status = 'done'), 0) AS tasks_done,
    -- Ile zadań zrobionych w ostatnich 30 dniach
    COALESCE((SELECT COUNT(*) FROM gmp_tasks t
              WHERE t.assigned_to = s.id AND t.status = 'done'
                AND t.completed_at >= NOW() - INTERVAL '30 days'), 0) AS tasks_done_30d,
    -- Zaległości finansowe na sprawach opiekuna (dodatnie = jest zaległość)
    COALESCE((SELECT SUM(GREATEST(b.balance_due, 0))
              FROM gmp_cases c JOIN gmp_case_balance b ON b.case_id = c.id
              WHERE c.assigned_to = s.id AND c.status IN ('zlecona','aktywna')), 0) AS pending_balance
FROM gmp_staff s
WHERE s.is_active = TRUE;

GRANT SELECT ON gmp_staff_effectiveness TO authenticated;

COMMENT ON VIEW gmp_staff_effectiveness IS
'Efektywność pracowników: przyjął/prowadzi/zadania/zaległości (pkt 10 uwag Pawła).';


-- =================================================================
-- 2) VIEW: zadania per staff per miesiąc (pkt 10)
-- =================================================================
CREATE OR REPLACE VIEW gmp_staff_tasks_monthly AS
SELECT
    s.id AS staff_id,
    s.full_name,
    date_trunc('month', t.created_at)::date AS month,
    COUNT(*) AS tasks_total,
    COUNT(*) FILTER (WHERE t.status = 'done') AS tasks_done,
    COUNT(*) FILTER (WHERE t.status IN ('pending','in_progress')) AS tasks_open,
    COUNT(*) FILTER (WHERE t.status IN ('pending','in_progress') AND t.due_date < CURRENT_DATE) AS tasks_overdue
FROM gmp_staff s
LEFT JOIN gmp_tasks t ON t.assigned_to = s.id
WHERE s.is_active = TRUE
GROUP BY s.id, s.full_name, date_trunc('month', t.created_at)::date;

GRANT SELECT ON gmp_staff_tasks_monthly TO authenticated;


-- =================================================================
-- 3) VIEW: alert brak reakcji pracodawcy (pkt 11)
-- Sprawa ma employer_id, ostatnia aktywność typu whatsapp/email z metadata.target='employer' > 14 dni
-- Fallback: gdy brak rekordów activity z metadata.target='employer', ale tag 'czeka-na-dok-pracodawcy' > 14 dni od last activity
-- =================================================================
CREATE OR REPLACE VIEW gmp_employer_inaction_alerts AS
SELECT
    c.id AS case_id,
    c.case_number,
    c.client_id,
    c.employer_id,
    c.assigned_to,
    c.status,
    c.stage,
    c.date_last_activity,
    CURRENT_DATE - COALESCE(c.date_last_activity, c.created_at::date) AS days_since_activity,
    CASE
        WHEN CURRENT_DATE - COALESCE(c.date_last_activity, c.created_at::date) > 30 THEN 'no_response_30'
        WHEN CURRENT_DATE - COALESCE(c.date_last_activity, c.created_at::date) > 14 THEN 'no_response_14'
        ELSE 'ok'
    END AS alert_level
FROM gmp_cases c
WHERE c.status IN ('zlecona','aktywna')
  AND c.employer_id IS NOT NULL
  AND EXISTS (
      SELECT 1 FROM gmp_entity_tags et
      JOIN gmp_tags t ON t.id = et.tag_id
      WHERE et.entity_type = 'case'
        AND et.entity_id = c.id
        AND t.name IN ('czeka-na-dok-pracodawcy','czeka-na-dok-pracodawcy','brak-reakcji-urzedu')
  )
  AND CURRENT_DATE - COALESCE(c.date_last_activity, c.created_at::date) > 14;

GRANT SELECT ON gmp_employer_inaction_alerts TO authenticated;

COMMENT ON VIEW gmp_employer_inaction_alerts IS
'Alert "brak reakcji pracodawcy" — sprawa z tagiem czeka-na-dok-pracodawcy i brakiem aktywności >14 dni (pkt 11 uwag Pawła, pomysł Julki).';
