-- Integracja: Faktury ↔ Płatności ↔ Windykacja

-- 1. VIEW: status finansowy sprawy (suma fee vs suma wpłat vs aktywna windykacja vs faktury)
DROP VIEW IF EXISTS gmp_case_finance;
CREATE VIEW gmp_case_finance AS
SELECT
    c.id AS case_id,
    c.case_number,
    COALESCE(c.fee_amount, 0)::numeric AS fee_total,
    COALESCE((SELECT SUM(amount) FROM gmp_payments WHERE case_id = c.id), 0)::numeric AS paid_total,
    GREATEST(0, COALESCE(c.fee_amount, 0) - COALESCE((SELECT SUM(amount) FROM gmp_payments WHERE case_id = c.id), 0))::numeric AS outstanding,
    (SELECT COUNT(*) FROM gmp_invoices WHERE case_id = c.id) AS invoice_count,
    (SELECT COUNT(*) FROM gmp_invoices WHERE case_id = c.id AND status = 'paid') AS invoices_paid,
    (SELECT COUNT(*) FROM gmp_invoices WHERE case_id = c.id AND status != 'paid') AS invoices_unpaid,
    (SELECT SUM(amount) FROM gmp_invoices WHERE case_id = c.id) AS invoiced_total,
    EXISTS(SELECT 1 FROM gmp_collections WHERE case_id = c.id AND status = 'active') AS has_active_collection,
    (SELECT id FROM gmp_collections WHERE case_id = c.id AND status = 'active' LIMIT 1) AS active_collection_id
FROM gmp_cases c;

GRANT SELECT ON gmp_case_finance TO authenticated, anon;

-- 2. VIEW: faktury z doliczonymi płatnościami (match po case_id)
-- Uwaga: płatność może dotyczyć wielu faktur tej samej sprawy; heurystyka:
--   - faktura jest "paid" gdy suma wszystkich płatności sprawy >= suma wszystkich faktur sprawy
--   - w widoku pokazujemy alokację proporcjonalną do kwoty faktury
DROP VIEW IF EXISTS gmp_invoice_finance;
CREATE VIEW gmp_invoice_finance AS
SELECT
    i.*,
    cf.paid_total AS case_paid_total,
    cf.invoiced_total AS case_invoiced_total,
    CASE
        WHEN cf.paid_total >= cf.invoiced_total THEN i.amount  -- faktura w pełni pokryta
        WHEN cf.invoiced_total > 0 THEN ROUND(cf.paid_total * i.amount / cf.invoiced_total, 2)
        ELSE 0
    END AS allocated_paid,
    CASE
        WHEN cf.paid_total >= cf.invoiced_total THEN true
        ELSE false
    END AS is_fully_paid_via_case
FROM gmp_invoices i
LEFT JOIN gmp_case_finance cf ON cf.case_id = i.case_id;

GRANT SELECT ON gmp_invoice_finance TO authenticated, anon;

-- 3. TRIGGER: auto-update status faktur po zmianie płatności
CREATE OR REPLACE FUNCTION gmp_sync_invoice_status() RETURNS TRIGGER AS $$
DECLARE
    v_case_id UUID;
    v_paid NUMERIC;
    v_invoiced NUMERIC;
BEGIN
    v_case_id := COALESCE(NEW.case_id, OLD.case_id);
    IF v_case_id IS NULL THEN RETURN COALESCE(NEW, OLD); END IF;

    SELECT COALESCE(SUM(amount), 0) INTO v_paid FROM gmp_payments WHERE case_id = v_case_id;
    SELECT COALESCE(SUM(amount), 0) INTO v_invoiced FROM gmp_invoices WHERE case_id = v_case_id;

    -- Jeśli suma płatności >= suma faktur → wszystkie faktury tej sprawy oznacz jako paid
    IF v_invoiced > 0 AND v_paid >= v_invoiced THEN
        UPDATE gmp_invoices SET status = 'paid'
            WHERE case_id = v_case_id AND status != 'paid';
    END IF;

    -- Auto-close windykacji jeśli sprawa w pełni opłacona
    IF v_paid >= COALESCE((SELECT fee_amount FROM gmp_cases WHERE id = v_case_id), 0) AND v_paid > 0 THEN
        UPDATE gmp_collections SET status = 'paid', level = 'settled'
            WHERE case_id = v_case_id AND status = 'active';
    END IF;

    RETURN COALESCE(NEW, OLD);
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sync_invoice_on_payment ON gmp_payments;
CREATE TRIGGER trg_sync_invoice_on_payment
    AFTER INSERT OR UPDATE OR DELETE ON gmp_payments
    FOR EACH ROW EXECUTE FUNCTION gmp_sync_invoice_status();

DROP TRIGGER IF EXISTS trg_sync_invoice_on_insert ON gmp_invoices;
CREATE TRIGGER trg_sync_invoice_on_insert
    AFTER INSERT ON gmp_invoices
    FOR EACH ROW EXECUTE FUNCTION gmp_sync_invoice_status();

-- 4. RPC: jednorazowa synchronizacja wszystkiego (przydaje się po wgraniu danych)
CREATE OR REPLACE FUNCTION gmp_sync_all_finance() RETURNS TABLE(updated_invoices INT, closed_collections INT) AS $$
DECLARE
    u_inv INT := 0;
    c_col INT := 0;
BEGIN
    -- Faktury sprawy w pełni opłaconej → paid
    WITH full_paid AS (
        SELECT i.id FROM gmp_invoices i
        JOIN gmp_case_finance cf ON cf.case_id = i.case_id
        WHERE cf.paid_total >= cf.invoiced_total AND cf.invoiced_total > 0 AND i.status != 'paid'
    )
    UPDATE gmp_invoices SET status = 'paid' WHERE id IN (SELECT id FROM full_paid);
    GET DIAGNOSTICS u_inv = ROW_COUNT;

    -- Windykacje gdzie fee pokryte przez wpłaty
    UPDATE gmp_collections SET status = 'paid', level = 'settled'
    WHERE status = 'active' AND case_id IN (
        SELECT c.id FROM gmp_cases c
        WHERE COALESCE(c.fee_amount, 0) > 0
          AND COALESCE(c.fee_amount, 0) <= COALESCE((SELECT SUM(amount) FROM gmp_payments WHERE case_id = c.id), 0)
    );
    GET DIAGNOSTICS c_col = ROW_COUNT;

    RETURN QUERY SELECT u_inv, c_col;
END; $$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION gmp_sync_all_finance() TO authenticated;
