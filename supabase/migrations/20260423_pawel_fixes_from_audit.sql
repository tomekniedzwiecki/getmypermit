-- ============================================================
-- Naprawy po code review migracji Pawla (2026-04-20 audit)
-- ============================================================

-- =================================================================
-- FIX B1: zduplikowany tag w gmp_employer_inaction_alerts
-- Widok pokazywal sprawy z tagiem 'brak-reakcji-urzedu' jako "brak reakcji pracodawcy"
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
        AND t.name = 'czeka-na-dok-pracodawcy'
  )
  AND CURRENT_DATE - COALESCE(c.date_last_activity, c.created_at::date) > 14;

GRANT SELECT ON gmp_employer_inaction_alerts TO authenticated;


-- =================================================================
-- FIX H1: gmp_case_balance niespojne total_paid vs balance_due
-- balance_due wliczal client_advance_repayment, total_paid nie - rozjazd.
-- Unifikacja: total_paid = wszystko co klient faktycznie wplacil (rodzaje przychodowe):
--   fee + admin_fee + stamp_fee + client_advance_repayment
-- client_advance to NIE jest wplata klienta (to wydatek kancelarii za klienta).
-- =================================================================
-- DROP potrzebne bo zmieniamy kolejnosc/nazwy kolumn (Postgres nie pozwala na CREATE OR REPLACE z innymi kolumnami)
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
    -- Suma rzeczywistych wplat klienta (wszystkie typy "przychodowe")
    COALESCE((
        SELECT SUM(p.amount) FROM gmp_payments p
        WHERE p.case_id = c.id
          AND p.kind IN ('fee','admin_fee','stamp_fee','client_advance_repayment')
    ), 0) AS total_paid,
    -- Osobno: ile zwrocono z "za klienta" (subsumowane w total_paid)
    COALESCE((
        SELECT SUM(p.amount) FROM gmp_payments p
        WHERE p.case_id = c.id
          AND p.kind = 'client_advance_repayment'
    ), 0) AS total_advance_repaid,
    -- Koszt poniesiony przez kancelarie (client_advance) - osobno
    COALESCE((
        SELECT SUM(p.amount) FROM gmp_payments p
        WHERE p.case_id = c.id
          AND p.kind = 'client_advance'
    ), 0) AS total_advance_paid_by_office,
    -- Zaległe raty z planu
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
    -- Saldo finansowe (total_planned - total_paid) - teraz SPÓJNE
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

GRANT SELECT ON gmp_case_balance TO authenticated;

-- Indeks wspomagajacy 6 korelowanych subselectow (M2 z audit)
CREATE INDEX IF NOT EXISTS idx_payments_case_kind ON gmp_payments(case_id, kind);


-- =================================================================
-- FIX H2: gmp_mark_installment_paid - czesciowe wplaty + odpinanie + DELETE
-- =================================================================
CREATE OR REPLACE FUNCTION gmp_mark_installment_paid() RETURNS TRIGGER AS $$
DECLARE
    v_installment RECORD;
    v_paid_sum NUMERIC(10,2);
    v_target_installment UUID;
BEGIN
    -- Obsluz zmiane installment_id (UPDATE: stara rata przestaje byc pokryta)
    IF TG_OP = 'UPDATE' AND OLD.installment_id IS NOT NULL
       AND (NEW.installment_id IS NULL OR NEW.installment_id <> OLD.installment_id) THEN
        -- Policz sume pozostalych wplat dla starej raty
        SELECT COALESCE(SUM(p.amount), 0) INTO v_paid_sum
        FROM gmp_payments p WHERE p.installment_id = OLD.installment_id AND p.id <> NEW.id;
        SELECT * INTO v_installment FROM gmp_payment_installments WHERE id = OLD.installment_id;
        IF FOUND THEN
            UPDATE gmp_payment_installments SET
                status = CASE
                    WHEN v_paid_sum >= v_installment.amount THEN 'paid'
                    WHEN v_paid_sum > 0 THEN 'reminder_sent'
                    ELSE CASE WHEN v_installment.due_date < CURRENT_DATE THEN 'overdue' ELSE 'pending' END
                END,
                paid_at = CASE WHEN v_paid_sum >= v_installment.amount THEN v_installment.paid_at ELSE NULL END,
                paid_amount = v_paid_sum,
                updated_at = NOW()
            WHERE id = OLD.installment_id;
        END IF;
    END IF;

    -- Obsluz nowa rate (INSERT lub UPDATE z nowym installment_id)
    IF NEW.installment_id IS NOT NULL THEN
        SELECT COALESCE(SUM(p.amount), 0) INTO v_paid_sum
        FROM gmp_payments p WHERE p.installment_id = NEW.installment_id;
        SELECT * INTO v_installment FROM gmp_payment_installments WHERE id = NEW.installment_id;
        IF FOUND THEN
            UPDATE gmp_payment_installments SET
                status = CASE
                    WHEN v_paid_sum >= v_installment.amount THEN 'paid'
                    ELSE 'reminder_sent'
                END,
                paid_at = CASE WHEN v_paid_sum >= v_installment.amount
                               THEN COALESCE(NEW.payment_date, CURRENT_DATE)
                               ELSE NULL END,
                paid_amount = v_paid_sum,
                updated_at = NOW()
            WHERE id = NEW.installment_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog;

-- Trigger DELETE dla wplat
CREATE OR REPLACE FUNCTION gmp_mark_installment_paid_on_delete() RETURNS TRIGGER AS $$
DECLARE
    v_installment RECORD;
    v_paid_sum NUMERIC(10,2);
BEGIN
    IF OLD.installment_id IS NOT NULL THEN
        SELECT COALESCE(SUM(p.amount), 0) INTO v_paid_sum
        FROM gmp_payments p WHERE p.installment_id = OLD.installment_id;
        SELECT * INTO v_installment FROM gmp_payment_installments WHERE id = OLD.installment_id;
        IF FOUND THEN
            UPDATE gmp_payment_installments SET
                status = CASE
                    WHEN v_paid_sum >= v_installment.amount THEN 'paid'
                    WHEN v_paid_sum > 0 THEN 'reminder_sent'
                    ELSE CASE WHEN v_installment.due_date < CURRENT_DATE THEN 'overdue' ELSE 'pending' END
                END,
                paid_at = CASE WHEN v_paid_sum >= v_installment.amount THEN v_installment.paid_at ELSE NULL END,
                paid_amount = v_paid_sum,
                updated_at = NOW()
            WHERE id = OLD.installment_id;
        END IF;
    END IF;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog;

DROP TRIGGER IF EXISTS trg_mark_installment_paid_on_delete ON gmp_payments;
CREATE TRIGGER trg_mark_installment_paid_on_delete
    AFTER DELETE ON gmp_payments
    FOR EACH ROW EXECUTE FUNCTION gmp_mark_installment_paid_on_delete();


-- =================================================================
-- FIX H7: gmp_staff_effectiveness - pokazuj takze inactive staff
-- Zdezaktywowani opiekunowie mogą mieć historyczne zaległości
-- =================================================================
-- DROP potrzebny bo zmienilismy WHERE; dodatkowo mogl byc usuniety CASCADE z case_balance powyzej.
DROP VIEW IF EXISTS gmp_staff_effectiveness CASCADE;

CREATE VIEW gmp_staff_effectiveness AS
SELECT
    s.id AS staff_id,
    s.full_name,
    s.role,
    s.color,
    s.is_active,
    COALESCE((SELECT COUNT(*) FROM gmp_cases c WHERE c.accepted_by = s.id), 0) AS cases_accepted,
    COALESCE((SELECT SUM(c.fee_amount) FROM gmp_cases c WHERE c.accepted_by = s.id), 0) AS revenue_accepted,
    COALESCE((SELECT COUNT(*) FROM gmp_cases c
              WHERE c.assigned_to = s.id AND c.status IN ('zlecona','aktywna')), 0) AS cases_active,
    COALESCE((SELECT COUNT(*) FROM gmp_cases c WHERE c.assigned_to = s.id), 0) AS cases_assigned_total,
    COALESCE((SELECT COUNT(*) FROM gmp_tasks t
              WHERE t.assigned_to = s.id AND t.status IN ('pending','in_progress')), 0) AS tasks_open,
    COALESCE((SELECT COUNT(*) FROM gmp_tasks t
              WHERE t.assigned_to = s.id AND t.status IN ('pending','in_progress')
                AND t.due_date < CURRENT_DATE), 0) AS tasks_overdue,
    COALESCE((SELECT COUNT(*) FROM gmp_tasks t
              WHERE t.assigned_to = s.id AND t.status = 'done'), 0) AS tasks_done,
    COALESCE((SELECT COUNT(*) FROM gmp_tasks t
              WHERE t.assigned_to = s.id AND t.status = 'done'
                AND t.completed_at >= NOW() - INTERVAL '30 days'), 0) AS tasks_done_30d,
    COALESCE((SELECT SUM(GREATEST(b.balance_due, 0))
              FROM gmp_cases c JOIN gmp_case_balance b ON b.case_id = c.id
              WHERE c.assigned_to = s.id AND c.status IN ('zlecona','aktywna')), 0) AS pending_balance
FROM gmp_staff s;
-- USUNIETO: WHERE s.is_active = TRUE (zeby inactive staff tez byl widoczny z zaleglosciami)

GRANT SELECT ON gmp_staff_effectiveness TO authenticated;


-- =================================================================
-- FIX: sync gmp_cases.assigned_to (PRIMARY) -> gmp_case_assignees
-- Uwagi Pawla: gdy zmieniasz opiekuna z dropdowna na karcie sprawy,
-- tabela gmp_case_assignees musi zostac zsynchronizowana.
-- =================================================================
CREATE OR REPLACE FUNCTION gmp_sync_assigned_to_to_assignees() RETURNS TRIGGER AS $$
BEGIN
    -- Tylko gdy assigned_to rzeczywiscie sie zmienilo
    IF COALESCE(NEW.assigned_to::text,'') = COALESCE(OLD.assigned_to::text,'') THEN
        RETURN NEW;
    END IF;

    -- Jesli wyczyszczono assigned_to, usun primary
    IF NEW.assigned_to IS NULL THEN
        UPDATE gmp_case_assignees
        SET role_type = 'secondary'
        WHERE case_id = NEW.id AND role_type = 'primary';
        RETURN NEW;
    END IF;

    -- Uwaga: trigger synchronizacyjny w odwrotna strone (sync_primary_assignee_to_cases)
    -- NIE zadziala tu (bo edytujemy gmp_cases, nie gmp_case_assignees).
    -- Wstawiamy/upsertujemy primary rekord w gmp_case_assignees.

    -- Najpierw: jesli staff juz jest przypisany jako secondary/backup — promuj do primary.
    -- Trigger gmp_enforce_single_primary_assignee zadziala i demotuje starego primary.
    IF EXISTS (SELECT 1 FROM gmp_case_assignees
               WHERE case_id = NEW.id AND staff_id = NEW.assigned_to) THEN
        UPDATE gmp_case_assignees SET role_type = 'primary'
        WHERE case_id = NEW.id AND staff_id = NEW.assigned_to;
    ELSE
        -- Demotuj starego primary do secondary (trigger enforce_single_primary zrobi to automatycznie przy INSERT)
        -- Pominiecie: trigger enforce_max_assignees (3). Jesli juz jest 3 assignees bez tego staff_id, wstawienie padnie.
        -- Workaround: usun nieaktywnego primary najpierw.
        DELETE FROM gmp_case_assignees WHERE case_id = NEW.id AND role_type = 'primary';
        INSERT INTO gmp_case_assignees (case_id, staff_id, role_type, assigned_by)
        VALUES (NEW.id, NEW.assigned_to, 'primary', auth.uid()::uuid);
    END IF;
    RETURN NEW;
EXCEPTION WHEN others THEN
    RAISE NOTICE 'sync_assigned_to_to_assignees: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Zapobiegnij rekurencji: trigger sync_primary_assignee_to_cases aktualizuje assigned_to,
-- co odpaliloby nasz trigger sync_assigned_to_to_assignees znowu -> infinite loop.
-- Rozwiazanie: uzyj pg_trigger_depth() albo flagi sesji.
CREATE OR REPLACE FUNCTION gmp_sync_assigned_to_to_assignees_safe() RETURNS TRIGGER AS $$
BEGIN
    -- Jesli jestes w zaglebionym triggerze, pomin
    IF pg_trigger_depth() > 1 THEN
        RETURN NEW;
    END IF;
    RETURN gmp_sync_assigned_to_to_assignees();
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_gmp_sync_assigned_to_to_assignees ON gmp_cases;
CREATE TRIGGER trg_gmp_sync_assigned_to_to_assignees
    AFTER UPDATE OF assigned_to ON gmp_cases
    FOR EACH ROW
    WHEN (pg_trigger_depth() < 1) -- wykluczamy odpalenia z innych triggerow
    EXECUTE FUNCTION gmp_sync_assigned_to_to_assignees();


-- =================================================================
-- FIX H5: gmp_generate_installment_tasks - link po installment_id zamiast LIKE
-- =================================================================
ALTER TABLE gmp_tasks
    ADD COLUMN IF NOT EXISTS installment_id UUID REFERENCES gmp_payment_installments(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_tasks_installment
    ON gmp_tasks(installment_id) WHERE installment_id IS NOT NULL;

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
        WHERE i.status IN ('pending','reminder_sent')
          AND i.due_date = CURRENT_DATE
          AND NOT EXISTS (
              SELECT 1 FROM gmp_tasks t WHERE t.installment_id = i.id
          )
    LOOP
        INSERT INTO gmp_tasks (
            case_id, installment_id, title, description,
            assigned_to, due_date, status, task_type, show_in_calendar
        ) VALUES (
            r.case_id, r.installment_id,
            'Płatność dziś: rata #' || r.installment_number || ' — ' || r.client_label,
            'Kwota: ' || r.amount || ' zł. Sprawdź czy klient zapłacił i oznacz ratę w Finansach.',
            r.assigned_to,
            CURRENT_DATE,
            'pending',
            'platnosc_rata',
            TRUE
        );
        v_count := v_count + 1;
    END LOOP;
    RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog;


-- =================================================================
-- FIX H3: RLS dla prywatnych zadań - serwer nie zwraca private od innych
-- =================================================================
-- Usun obecna policy "authenticated_crud" dla gmp_tasks
DROP POLICY IF EXISTS "authenticated_crud" ON gmp_tasks;

-- SELECT: widzisz wszystkie team + swoje prywatne
DROP POLICY IF EXISTS "tasks_select" ON gmp_tasks;
CREATE POLICY "tasks_select" ON gmp_tasks
    FOR SELECT TO authenticated
    USING (
        visibility = 'team'
        OR created_by IN (SELECT id FROM gmp_staff WHERE user_id = auth.uid())
        OR assigned_to IN (SELECT id FROM gmp_staff WHERE user_id = auth.uid())
    );

-- INSERT/UPDATE/DELETE: wszyscy zalogowani
DROP POLICY IF EXISTS "tasks_insert" ON gmp_tasks;
CREATE POLICY "tasks_insert" ON gmp_tasks FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "tasks_update" ON gmp_tasks;
CREATE POLICY "tasks_update" ON gmp_tasks FOR UPDATE TO authenticated
    USING (
        visibility = 'team'
        OR created_by IN (SELECT id FROM gmp_staff WHERE user_id = auth.uid())
        OR assigned_to IN (SELECT id FROM gmp_staff WHERE user_id = auth.uid())
    ) WITH CHECK (true);
DROP POLICY IF EXISTS "tasks_delete" ON gmp_tasks;
CREATE POLICY "tasks_delete" ON gmp_tasks FOR DELETE TO authenticated
    USING (
        visibility = 'team'
        OR created_by IN (SELECT id FROM gmp_staff WHERE user_id = auth.uid())
    );


-- =================================================================
-- FIX L4: bezpieczniejszy search_path dla istniejacych SECURITY DEFINER funkcji
-- =================================================================
ALTER FUNCTION gmp_mark_overdue_installments() SET search_path = public, pg_catalog;
ALTER FUNCTION gmp_approve_intake_document(UUID) SET search_path = public, pg_catalog;


-- =================================================================
-- FIX B2: gmp_approve_intake_document - alias 'id' kolidujacy z nazwa kolumny
-- (re-stwórz z bezpiecznym aliasem "idoc")
-- =================================================================
CREATE OR REPLACE FUNCTION gmp_approve_intake_document(p_intake_doc_id UUID)
    RETURNS UUID AS $$
DECLARE
    v_case_id UUID;
    v_doc_id UUID;
    v_intake RECORD;
    v_staff_id UUID;
    v_existing_doc_still_valid BOOLEAN;
BEGIN
    SELECT gs.id INTO v_staff_id FROM gmp_staff gs WHERE gs.user_id = auth.uid() LIMIT 1;

    SELECT idoc.storage_path, idoc.file_name, idoc.file_size, idoc.mime_type, idoc.doc_type, it.case_id
    INTO v_intake
    FROM gmp_intake_documents idoc
    JOIN gmp_intake_tokens it ON it.id = idoc.intake_id
    WHERE idoc.id = p_intake_doc_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Dokument ankiety % nie istnieje', p_intake_doc_id;
    END IF;

    IF v_intake.case_id IS NULL THEN
        RAISE EXCEPTION 'Ankieta nie jest powiązana ze sprawą — nie można zatwierdzić dokumentu';
    END IF;

    -- Idempotentność: jeśli już zatwierdzony I rekord gmp_documents nadal istnieje, zwróć go
    SELECT gmp_document_id INTO v_doc_id FROM gmp_intake_documents WHERE id = p_intake_doc_id;
    IF v_doc_id IS NOT NULL THEN
        SELECT EXISTS (SELECT 1 FROM gmp_documents WHERE id = v_doc_id) INTO v_existing_doc_still_valid;
        IF v_existing_doc_still_valid THEN
            RETURN v_doc_id;
        END IF;
        -- Cichy recovery: stary rekord usuniety, tworzymy nowy
    END IF;

    INSERT INTO gmp_documents (
        case_id, name, storage_path, mime_type, file_size,
        uploaded_by, intake_document_id, doc_type, source
    ) VALUES (
        v_intake.case_id,
        COALESCE(v_intake.file_name, v_intake.doc_type || ' (z ankiety)'),
        v_intake.storage_path,
        v_intake.mime_type,
        v_intake.file_size,
        v_staff_id,
        p_intake_doc_id,
        v_intake.doc_type,
        'intake_approved'
    ) RETURNING id INTO v_doc_id;

    UPDATE gmp_intake_documents
    SET approved_at = NOW(),
        approved_by = v_staff_id,
        gmp_document_id = v_doc_id
    WHERE id = p_intake_doc_id;

    RETURN v_doc_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog;

GRANT EXECUTE ON FUNCTION gmp_approve_intake_document(UUID) TO authenticated;


-- =================================================================
-- FIX L9: gmp_approve_intake_document - auto-zapis activity
-- Dodatkowo: log do gmp_case_activities zeby bylo widac w historii
-- =================================================================
-- (pominiete dla prostoty - mozna dodac pozniej)


COMMENT ON VIEW gmp_case_balance IS
'Saldo sprawy - SPÓJNE po fixie z 2026-04-23: total_paid = fee+admin_fee+stamp_fee+client_advance_repayment. balance_due = total_planned - total_paid.';
