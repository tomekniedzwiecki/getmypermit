-- ============================================================
-- Hardening po drugim code review (2026-04-23)
-- Race conditions, performance, data integrity
-- ============================================================

-- =================================================================
-- FIX: Race condition w gmp_enforce_max_assignees (B5 z code review)
-- 2 równoczesne INSERT moga obejsc COUNT < 3 (tylko BEFORE INSERT bez locka)
-- Rozwiazanie: advisory lock per case_id blokujacy rownoczesne operacje
-- =================================================================
CREATE OR REPLACE FUNCTION gmp_enforce_max_assignees() RETURNS TRIGGER AS $$
DECLARE
    v_count INTEGER;
BEGIN
    -- Advisory lock na case_id (UUID -> bigint hash) — serializuje INSERT dla tej samej sprawy
    -- Lock jest transaction-scoped (zwolniony po COMMIT/ROLLBACK)
    PERFORM pg_advisory_xact_lock(hashtext('gmp_case_assignees:' || NEW.case_id::text));

    SELECT COUNT(*) INTO v_count
    FROM gmp_case_assignees
    WHERE case_id = NEW.case_id;
    IF v_count >= 3 THEN
        RAISE EXCEPTION 'Maksymalnie 3 opiekunów na sprawę (uwagi Pawła pkt 8, system 2-kowy)';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- =================================================================
-- FIX M1: gmp_payment_installments CHECK installment_number >= 1
-- Zapobieganie wstawieniu ujemnych lub zerowych numerow rat
-- =================================================================
DO $$ BEGIN
    ALTER TABLE gmp_payment_installments
        ADD CONSTRAINT gmp_payment_installments_number_positive CHECK (installment_number >= 1);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- =================================================================
-- FIX H4: FK gmp_cases.category -> gmp_case_categories.code
-- Przed FK: upewnij sie ze wszystkie istniejace category sa w slowniku
-- =================================================================
-- Dodaj do slownika kategorie ktore istnieja w gmp_cases ale nie ma ich w gmp_case_categories
INSERT INTO gmp_case_categories (code, label, group_label, sort_order, is_active)
SELECT DISTINCT
    c.category,
    COALESCE(c.category, '?') AS label,
    'Nieznane (auto-import)' AS group_label,
    9999 AS sort_order,
    FALSE AS is_active
FROM gmp_cases c
WHERE c.category IS NOT NULL
  AND c.category <> ''
  AND NOT EXISTS (SELECT 1 FROM gmp_case_categories cat WHERE cat.code = c.category)
ON CONFLICT (code) DO NOTHING;

-- Teraz mozemy dodac FK
DO $$ BEGIN
    ALTER TABLE gmp_cases
        ADD CONSTRAINT gmp_cases_category_fkey
        FOREIGN KEY (category) REFERENCES gmp_case_categories(code) ON UPDATE CASCADE ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- =================================================================
-- FIX M2/M3: gmp_case_balance jako Materialized View z indeksem (performance)
-- Obecny view robi 6 subselectow per wiersz — dla 500+ spraw list(cases.html)
-- potrafi przetworzyc 3000 skanow. Materializacja + refresh on trigger.
-- =================================================================
-- UWAGA: nie mozemy zmienic obecnego view gmp_case_balance na materialized
-- bez zmiany wszystkich jego uzyc w kodzie. Lepiej zostawic view i stworzyc
-- OBOK materialized view cache.

-- Zamiast pelnej materializacji — zoptymalizuj view uzywajac LATERAL JOIN
-- (1 skan gmp_payments zamiast 6).

DROP VIEW IF EXISTS gmp_case_balance CASCADE;
CREATE VIEW gmp_case_balance AS
SELECT
    c.id AS case_id,
    COALESCE(c.fee_amount, 0) AS planned_fee,
    COALESCE(c.admin_fee_amount, 0) AS planned_admin_fee,
    COALESCE(c.stamp_fee_amount, 0) AS planned_stamp_fee,
    COALESCE(c.client_advances_amount, 0) AS planned_client_advances,
    COALESCE(c.fee_amount, 0)
        + COALESCE(c.admin_fee_amount, 0)
        + COALESCE(c.stamp_fee_amount, 0)
        + COALESCE(c.client_advances_amount, 0) AS total_planned,
    -- Subquery po stronie gmp_payments: 1 skan zamiast 3
    COALESCE(pay.total_paid, 0) AS total_paid,
    COALESCE(pay.total_advance_repaid, 0) AS total_advance_repaid,
    COALESCE(pay.total_advance_paid_by_office, 0) AS total_advance_paid_by_office,
    -- Subquery po stronie gmp_payment_installments: 1 skan zamiast 2
    COALESCE(inst.overdue_amount, 0) AS overdue_installments_amount,
    COALESCE(inst.overdue_count, 0) AS overdue_installments_count,
    (COALESCE(c.fee_amount, 0)
        + COALESCE(c.admin_fee_amount, 0)
        + COALESCE(c.stamp_fee_amount, 0)
        + COALESCE(c.client_advances_amount, 0))
    - COALESCE(pay.total_paid, 0) AS balance_due
FROM gmp_cases c
LEFT JOIN LATERAL (
    SELECT
        SUM(amount) FILTER (WHERE kind IN ('fee','admin_fee','stamp_fee','client_advance_repayment')) AS total_paid,
        SUM(amount) FILTER (WHERE kind = 'client_advance_repayment') AS total_advance_repaid,
        SUM(amount) FILTER (WHERE kind = 'client_advance') AS total_advance_paid_by_office
    FROM gmp_payments
    WHERE case_id = c.id
) pay ON TRUE
LEFT JOIN LATERAL (
    SELECT
        SUM(amount) FILTER (WHERE status IN ('pending','reminder_sent','overdue') AND due_date < CURRENT_DATE) AS overdue_amount,
        COUNT(*) FILTER (WHERE status IN ('pending','reminder_sent','overdue') AND due_date < CURRENT_DATE) AS overdue_count
    FROM gmp_payment_installments
    WHERE case_id = c.id
) inst ON TRUE;

GRANT SELECT ON gmp_case_balance TO authenticated;

-- Recreate gmp_staff_effectiveness (usunięty przez CASCADE) + LATERAL optimization
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
    COALESCE(bs.pending_balance, 0) AS pending_balance
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
) bs ON TRUE;

GRANT SELECT ON gmp_staff_effectiveness TO authenticated;


-- =================================================================
-- FIX: Dodatkowe indeksy optymalizacyjne
-- =================================================================
CREATE INDEX IF NOT EXISTS idx_cases_accepted_by ON gmp_cases(accepted_by) WHERE accepted_by IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_status_due ON gmp_tasks(status, due_date) WHERE status IN ('pending','in_progress');
CREATE INDEX IF NOT EXISTS idx_tasks_completed_at ON gmp_tasks(completed_at) WHERE status = 'done';

-- =================================================================
-- FIX L5: gmp_payment_installments.status enum
-- (obecnie TEXT + CHECK — dla spojnosci z reszta schematu)
-- POMINIECIE: zmiana TEXT->ENUM wymaga drop cascade viewow, ryzyko regresji.
-- Zostawiamy TEXT + CHECK — nie jest krytyczne.
-- =================================================================

-- =================================================================
-- FIX L3 (dashboard): indeks wspomagajacy MRR query (admin.js)
-- Query: gmp_payments.kind IN ('fee', NULL) + payment_date >= X
-- =================================================================
CREATE INDEX IF NOT EXISTS idx_payments_date_fee
    ON gmp_payments(payment_date DESC) WHERE kind = 'fee' OR kind IS NULL;


COMMENT ON VIEW gmp_case_balance IS
'Saldo sprawy — zoptymalizowane LATERAL JOIN (1 skan payments + 1 skan installments zamiast 6 subselectów).';
COMMENT ON VIEW gmp_staff_effectiveness IS
'Efektywność per staff — zoptymalizowane LATERAL JOIN. Pokazuje również inactive staff z historycznymi zaległościami.';
