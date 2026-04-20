-- ============================================================
-- Uwagi Pawła 2026-04-20: Finanse v2
-- Źródło: uwagi-pawla-2026-04-20.md (pkt 1.1 - 1.5)
-- Rozszerzenie typów opłat + pola na gmp_cases + plan rat
-- ============================================================

-- UWAGA: Nowe wartości ENUM (stamp_fee, client_advance, client_advance_repayment)
-- są w osobnym pliku: 20260420_pawel_finanse_enums.sql (musi się zastosować WCZEŚNIEJ).

-- =================================================================
-- 2) Pola na gmp_cases — planowane kwoty poszczególnych opłat
-- Paweł wpisuje je w danych szczegółowych sprawy (uwagi pkt 1.2 i 1.3)
-- =================================================================
ALTER TABLE gmp_cases
    ADD COLUMN IF NOT EXISTS admin_fee_amount NUMERIC(10,2),
    ADD COLUMN IF NOT EXISTS admin_fee_notes TEXT,
    ADD COLUMN IF NOT EXISTS stamp_fee_amount NUMERIC(10,2),
    ADD COLUMN IF NOT EXISTS stamp_fee_notes TEXT,
    ADD COLUMN IF NOT EXISTS client_advances_amount NUMERIC(10,2),
    ADD COLUMN IF NOT EXISTS client_advances_notes TEXT;

COMMENT ON COLUMN gmp_cases.admin_fee_amount IS 'Planowana kwota opłaty administracyjnej (pkt 1.2 uwag Pawła)';
COMMENT ON COLUMN gmp_cases.stamp_fee_amount IS 'Planowana kwota opłaty skarbowej (pkt 1.2 uwag Pawła)';
COMMENT ON COLUMN gmp_cases.client_advances_amount IS 'Planowana kwota opłat założonych za klienta do zwrotu (pkt 1.3 uwag Pawła)';


-- =================================================================
-- 3) Tabela szczegółowych wpisów "za klienta" — poszczególne pozycje
-- Paweł chce widzieć wyszczególnione: jakie opłaty ponieśliśmy (notariusz, polisa itp.)
-- =================================================================
CREATE TABLE IF NOT EXISTS gmp_case_client_advances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES gmp_cases(id) ON DELETE CASCADE,
    description TEXT NOT NULL,              -- "notariusz", "polisa", "tłumaczenie przysięgłe"
    amount NUMERIC(10,2) NOT NULL,
    incurred_date DATE DEFAULT CURRENT_DATE, -- kiedy kancelaria poniosła koszt
    is_repaid BOOLEAN DEFAULT FALSE,
    repaid_date DATE,
    repaid_amount NUMERIC(10,2),
    notes TEXT,
    created_by UUID REFERENCES gmp_staff(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_case_client_advances_case
    ON gmp_case_client_advances(case_id);
CREATE INDEX IF NOT EXISTS idx_case_client_advances_unpaid
    ON gmp_case_client_advances(case_id) WHERE is_repaid = FALSE;

ALTER TABLE gmp_case_client_advances ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "client_advances_auth" ON gmp_case_client_advances;
CREATE POLICY "client_advances_auth" ON gmp_case_client_advances
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

COMMENT ON TABLE gmp_case_client_advances IS
'Opłaty założone za klienta (notariusz, polisa itp.) — wyszczególnione wpisy (pkt 1.3 uwag Pawła).';


-- =================================================================
-- 4) Auto-suma "za klienta" — zachowaj gmp_cases.client_advances_amount zsynchronizowane
-- Trigger: przy INSERT/UPDATE/DELETE na gmp_case_client_advances aktualizuj sumę
-- =================================================================
CREATE OR REPLACE FUNCTION gmp_sync_client_advances_total() RETURNS TRIGGER AS $$
DECLARE
    v_case_id UUID;
    v_total NUMERIC(10,2);
BEGIN
    v_case_id := COALESCE(NEW.case_id, OLD.case_id);
    SELECT COALESCE(SUM(amount), 0) INTO v_total
    FROM gmp_case_client_advances
    WHERE case_id = v_case_id;

    UPDATE gmp_cases
    SET client_advances_amount = v_total,
        updated_at = NOW()
    WHERE id = v_case_id;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_client_advances_total ON gmp_case_client_advances;
CREATE TRIGGER trg_sync_client_advances_total
    AFTER INSERT OR UPDATE OR DELETE ON gmp_case_client_advances
    FOR EACH ROW EXECUTE FUNCTION gmp_sync_client_advances_total();


-- =================================================================
-- 5) Plan rat — osobna tabela, po 1 wpisie na ratę (pkt 1.1)
-- Paweł chce każdą ratę z osobną datą (nie jeden due_date dla całego planu)
-- =================================================================
CREATE TABLE IF NOT EXISTS gmp_payment_installments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_plan_id UUID REFERENCES gmp_payment_plans(id) ON DELETE CASCADE,
    case_id UUID NOT NULL REFERENCES gmp_cases(id) ON DELETE CASCADE,
    installment_number INTEGER NOT NULL,
    amount NUMERIC(10,2) NOT NULL,
    due_date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending','reminder_sent','paid','overdue','cancelled')),
    paid_at DATE,
    paid_amount NUMERIC(10,2),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (case_id, installment_number)
);

CREATE INDEX IF NOT EXISTS idx_installments_case
    ON gmp_payment_installments(case_id);
CREATE INDEX IF NOT EXISTS idx_installments_due_status
    ON gmp_payment_installments(due_date, status) WHERE status != 'paid';
CREATE INDEX IF NOT EXISTS idx_installments_today_pending
    ON gmp_payment_installments(due_date) WHERE status IN ('pending','reminder_sent');

ALTER TABLE gmp_payment_installments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "installments_auth" ON gmp_payment_installments;
CREATE POLICY "installments_auth" ON gmp_payment_installments
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

COMMENT ON TABLE gmp_payment_installments IS
'Plan rat — 1 rekord = 1 rata z własną datą zapłaty. Pkt 1.1 uwag Pawła.';


-- =================================================================
-- 6) FK: powiązanie wpłaty z konkretną ratą (pkt 1.1 — oznacz ratę jako zapłaconą)
-- =================================================================
ALTER TABLE gmp_payments
    ADD COLUMN IF NOT EXISTS installment_id UUID REFERENCES gmp_payment_installments(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_payments_installment
    ON gmp_payments(installment_id) WHERE installment_id IS NOT NULL;


-- =================================================================
-- 7) Auto-oznaczaj ratę jako "paid" gdy wpłata jest przypisana do raty
-- =================================================================
CREATE OR REPLACE FUNCTION gmp_mark_installment_paid() RETURNS TRIGGER AS $$
BEGIN
    IF NEW.installment_id IS NOT NULL THEN
        UPDATE gmp_payment_installments
        SET status = 'paid',
            paid_at = COALESCE(NEW.payment_date, CURRENT_DATE),
            paid_amount = NEW.amount,
            updated_at = NOW()
        WHERE id = NEW.installment_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_mark_installment_paid ON gmp_payments;
CREATE TRIGGER trg_mark_installment_paid
    AFTER INSERT OR UPDATE OF installment_id ON gmp_payments
    FOR EACH ROW EXECUTE FUNCTION gmp_mark_installment_paid();


-- =================================================================
-- 8) Auto-oznaczaj przeterminowane raty (overdue) — periodic update
-- Wywoływać manualnie albo z cron (Supabase pg_cron)
-- =================================================================
CREATE OR REPLACE FUNCTION gmp_mark_overdue_installments() RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER;
BEGIN
    UPDATE gmp_payment_installments
    SET status = 'overdue', updated_at = NOW()
    WHERE status IN ('pending','reminder_sent')
      AND due_date < CURRENT_DATE;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION gmp_mark_overdue_installments TO authenticated;


-- =================================================================
-- 9) Auto-zadanie dla opiekuna w dniu raty (pkt 1.1)
-- "w danym dniu, konkretna osoba powinna zapłacić, wówczas będzie mógł to skonfrontować"
--
-- Strategia: funkcja RPC wywoływana raz dziennie (cron albo manualnie z panelu)
-- tworzy zadania dla każdej raty z due_date = CURRENT_DATE i status = pending
-- =================================================================
CREATE OR REPLACE FUNCTION gmp_generate_installment_tasks() RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER := 0;
    r RECORD;
BEGIN
    FOR r IN
        SELECT
            i.id AS installment_id,
            i.case_id,
            i.installment_number,
            i.amount,
            c.assigned_to,
            c.case_number,
            COALESCE(cl.last_name || ' ' || cl.first_name, 'Klient') AS client_label
        FROM gmp_payment_installments i
        JOIN gmp_cases c ON c.id = i.case_id
        LEFT JOIN gmp_clients cl ON cl.id = c.client_id
        WHERE i.status = 'pending'
          AND i.due_date = CURRENT_DATE
          -- Nie duplikuj: sprawdź czy zadanie już istnieje
          AND NOT EXISTS (
              SELECT 1 FROM gmp_tasks t
              WHERE t.case_id = i.case_id
                AND t.due_date = CURRENT_DATE
                AND t.title LIKE '%rata%' || i.installment_number::text || '%'
          )
    LOOP
        INSERT INTO gmp_tasks (
            case_id, title, description,
            assigned_to, due_date, status
        ) VALUES (
            r.case_id,
            'Płatność dziś: rata #' || r.installment_number || ' — ' || r.client_label,
            'Kwota: ' || r.amount || ' zł. Sprawdź czy klient zapłacił i oznacz ratę w Finansach.',
            r.assigned_to,
            CURRENT_DATE,
            'pending'
        );
        v_count := v_count + 1;
    END LOOP;
    RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION gmp_generate_installment_tasks TO authenticated;

COMMENT ON FUNCTION gmp_generate_installment_tasks IS
'Generuje zadania dla opiekunów w dniu raty. Wywoływana raz dziennie (cron) albo z UI Pawła.';


-- =================================================================
-- 10) VIEW: saldo sprawy — używane przez listę spraw (pkt 1.5)
-- "kwota zaległości zamiast kwoty wpłat"
-- =================================================================
CREATE OR REPLACE VIEW gmp_case_balance AS
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
    COALESCE((
        SELECT SUM(p.amount) FROM gmp_payments p
        WHERE p.case_id = c.id
          AND p.kind IN ('fee','admin_fee','stamp_fee')
    ), 0) AS total_paid,
    COALESCE((
        SELECT SUM(p.amount) FROM gmp_payments p
        WHERE p.case_id = c.id
          AND p.kind = 'client_advance_repayment'
    ), 0) AS total_advance_repaid,
    -- zaległości z rat (plan rat jest gruntem prawdy dla „zalega na dziś")
    COALESCE((
        SELECT SUM(i.amount) FROM gmp_payment_installments i
        WHERE i.case_id = c.id
          AND i.status IN ('pending','reminder_sent','overdue')
          AND i.due_date < CURRENT_DATE
    ), 0) AS overdue_installments_amount,
    COALESCE((
        SELECT COUNT(*) FROM gmp_payment_installments i
        WHERE i.case_id = c.id
          AND i.status IN ('pending','reminder_sent','overdue')
          AND i.due_date < CURRENT_DATE
    ), 0) AS overdue_installments_count,
    -- Saldo finansowe (total_planned - total_paid)
    (COALESCE(c.fee_amount, 0)
        + COALESCE(c.admin_fee_amount, 0)
        + COALESCE(c.stamp_fee_amount, 0)
        + COALESCE(c.client_advances_amount, 0))
    - COALESCE((
        SELECT SUM(p.amount) FROM gmp_payments p
        WHERE p.case_id = c.id
          AND p.kind IN ('fee','admin_fee','stamp_fee','client_advance_repayment')
    ), 0) AS balance_due
FROM gmp_cases c;

GRANT SELECT ON gmp_case_balance TO authenticated, anon;

COMMENT ON VIEW gmp_case_balance IS
'Saldo sprawy — planowane kwoty (4 rodzaje opłat) vs wpłaty + zaległe raty. Źródło dla listy spraw i kafelków Finansów.';
