-- ============================================================================
-- Etap I — § 1.5 — Windykacja look-ahead: zbliżające się raty (14 dni)
-- ============================================================================
-- Paweł (intro): "fajnie by było jakiś podstawowy system windykacji wprowadzić,
-- na zasadzie zbliżające się terminy płatności, najbardziej zaległe płatności"
--
-- Uwaga: zaległe (overdue) korzystają z istniejącego systemu gmp_collections /
-- gmp_collection_overview (nie powielamy). Ten widok dodaje TYLKO look-ahead.
-- ============================================================================

CREATE OR REPLACE VIEW gmp_upcoming_installments AS
SELECT
    inst.id, inst.case_id, inst.installment_number, inst.amount, inst.due_date, inst.status,
    inst.notes,
    c.case_number, c.client_id, c.assigned_to, c.status AS case_status,
    cl.first_name, cl.last_name, cl.phone, cl.email,
    e.id AS employer_id, e.name AS employer_name,
    s.full_name AS assignee_name, s.color AS assignee_color,
    (inst.due_date - CURRENT_DATE) AS days_until_due,
    CASE
        WHEN inst.due_date - CURRENT_DATE <= 3 THEN 'critical'  -- 0-3 dni
        WHEN inst.due_date - CURRENT_DATE <= 7 THEN 'warning'   -- 4-7 dni
        ELSE 'info'                                              -- 8-14 dni
    END AS urgency
FROM gmp_payment_installments inst
JOIN gmp_cases c ON c.id = inst.case_id
LEFT JOIN gmp_clients cl ON cl.id = c.client_id
LEFT JOIN gmp_employers e ON e.id = c.employer_id
LEFT JOIN gmp_staff s ON s.id = c.assigned_to
WHERE inst.status = 'pending'
  AND inst.due_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '14 days'
ORDER BY inst.due_date;

GRANT SELECT ON gmp_upcoming_installments TO authenticated;

COMMENT ON VIEW gmp_upcoming_installments IS
'Raty pending z due_date w najbliższych 14 dniach. Używane w receivables.html i dashboard.html. Dla overdue → użyć gmp_collection_overview.';
