-- Automatyzacja windykacji: eskalacje + tworzenie zadań/notyfikacji
-- Nie wysyła maili automatycznie - to człowiek (opiekun) wykonuje akcję

-- Progowe dni per poziom (od date_accepted sprawy lub last_contact)
-- new            -> reminder_soft   po 30 dniach
-- reminder_soft  -> reminder_firm   po 60 dniach
-- reminder_firm  -> demand_1        po 90 dniach
-- demand_1       -> demand_final    po 120 dniach
-- demand_final   -> pre_court       po 150 dniach
-- pre_court      -> epu             po 365 dniach (blisko przedawnienia)

CREATE OR REPLACE FUNCTION gmp_process_collections_reminders()
RETURNS TABLE(
    escalated_count INT,
    tasks_created INT,
    promise_broken_count INT,
    notifications_sent INT
) AS $$
DECLARE
    v_escalated INT := 0;
    v_tasks INT := 0;
    v_promise INT := 0;
    v_notify INT := 0;
    rec RECORD;
    new_level TEXT;
    days_since_accept INT;
    days_promise_past INT;
    action_task_title TEXT;
BEGIN
    -- Eskalacje
    FOR rec IN
        SELECT
            co.collection_id, co.case_id, co.level, co.date_accepted, co.assigned_to,
            co.last_name, co.first_name,
            (CURRENT_DATE - co.date_accepted) AS days_old
        FROM gmp_collection_overview co
        WHERE co.status = 'active'
          AND co.remaining_amount > 0
    LOOP
        days_since_accept := rec.days_old;
        new_level := NULL;

        IF rec.level = 'new' AND days_since_accept >= 30 THEN new_level := 'reminder_soft';
        ELSIF rec.level = 'reminder_soft' AND days_since_accept >= 60 THEN new_level := 'reminder_firm';
        ELSIF rec.level = 'reminder_firm' AND days_since_accept >= 90 THEN new_level := 'demand_1';
        ELSIF rec.level = 'demand_1' AND days_since_accept >= 120 THEN new_level := 'demand_final';
        ELSIF rec.level = 'demand_final' AND days_since_accept >= 150 THEN new_level := 'pre_court';
        ELSIF rec.level = 'pre_court' AND days_since_accept >= 365 THEN new_level := 'epu';
        END IF;

        IF new_level IS NOT NULL THEN
            -- Eskaluj (cast na enum)
            UPDATE gmp_collections SET level = new_level::gmp_collection_level, updated_at = NOW()
                WHERE id = rec.collection_id AND level = rec.level::gmp_collection_level;

            -- Aktywność windykacji
            INSERT INTO gmp_collection_activities (collection_id, case_id, activity_type, content)
            VALUES (rec.collection_id, rec.case_id, 'escalation',
                format('[AUTO] Eskalacja %s → %s (%s dni od przyjęcia)', rec.level, new_level, days_since_accept));
            v_escalated := v_escalated + 1;

            -- Zadanie dla opiekuna
            action_task_title := CASE new_level
                WHEN 'reminder_soft' THEN 'Wyślij delikatne przypomnienie'
                WHEN 'reminder_firm' THEN 'Wyślij ponaglenie (firm)'
                WHEN 'demand_1' THEN 'Wygeneruj i wyślij wezwanie do zapłaty #1'
                WHEN 'demand_final' THEN 'Wygeneruj i wyślij OSTATECZNE wezwanie'
                WHEN 'pre_court' THEN 'Przygotuj przedsądowe wezwanie + dokumenty do EPU'
                WHEN 'epu' THEN 'PILNE: skieruj do E-sądu (EPU) - blisko przedawnienia'
                ELSE 'Obsłuż windykację'
            END;

            INSERT INTO gmp_tasks (case_id, assigned_to, title, due_date, status)
            VALUES (rec.case_id, rec.assigned_to,
                format('%s — %s %s', action_task_title, COALESCE(rec.last_name, ''), COALESCE(rec.first_name, '')),
                CURRENT_DATE + INTERVAL '2 days', 'pending');
            v_tasks := v_tasks + 1;

            -- Notyfikacja dla opiekuna
            IF rec.assigned_to IS NOT NULL THEN
                INSERT INTO gmp_notifications (recipient_id, kind, title, body, link_url, icon, severity, source_entity_type, source_entity_id, dedupe_key)
                VALUES (rec.assigned_to, 'collection_escalated',
                    format('Windykacja eskalowana: %s', new_level),
                    format('Sprawa %s %s — %s dni', COALESCE(rec.last_name, ''), COALESCE(rec.first_name, ''), days_since_accept),
                    format('case.html?id=%s', rec.case_id),
                    'ph-warning-circle',
                    CASE new_level WHEN 'epu' THEN 'danger' WHEN 'pre_court' THEN 'danger' WHEN 'demand_final' THEN 'warn' ELSE 'info' END,
                    'collection', rec.collection_id,
                    'col_escalate_' || rec.collection_id::text || '_' || new_level
                ) ON CONFLICT (dedupe_key) DO NOTHING;
                GET DIAGNOSTICS v_notify = ROW_COUNT;
            END IF;
        END IF;
    END LOOP;

    -- Obietnice niedotrzymane (promise_to_pay_date < today - 2d, brak płatności po obietnicy)
    FOR rec IN
        SELECT co.collection_id, co.case_id, co.assigned_to, co.last_name, co.first_name,
               co.promise_to_pay_date, co.promise_to_pay_amount,
               (CURRENT_DATE - co.promise_to_pay_date) AS days_past
        FROM gmp_collection_overview co
        WHERE co.status = 'active'
          AND co.promise_to_pay_date IS NOT NULL
          AND co.promise_to_pay_date < CURRENT_DATE - INTERVAL '2 days'
          AND co.remaining_amount > 0
    LOOP
        -- Task: sprawdź obietnicę
        INSERT INTO gmp_tasks (case_id, assigned_to, title, due_date, status)
        VALUES (rec.case_id, rec.assigned_to,
            format('Obietnica niedotrzymana (%s dni po terminie) — %s %s',
                rec.days_past, COALESCE(rec.last_name, ''), COALESCE(rec.first_name, '')),
            CURRENT_DATE, 'pending')
        ON CONFLICT DO NOTHING;
        v_promise := v_promise + 1;

        -- Notyfikacja dla opiekuna
        IF rec.assigned_to IS NOT NULL THEN
            INSERT INTO gmp_notifications (recipient_id, kind, title, body, link_url, icon, severity, source_entity_type, source_entity_id, dedupe_key)
            VALUES (rec.assigned_to, 'promise_broken',
                format('Obietnica niedotrzymana: %s %s', COALESCE(rec.last_name, ''), COALESCE(rec.first_name, '')),
                format('Obiecał %s zapłacić %s, dziś %s dni po terminie',
                    fmt_date(rec.promise_to_pay_date),
                    COALESCE(rec.promise_to_pay_amount::text || ' PLN', ''),
                    rec.days_past),
                format('case.html?id=%s', rec.case_id),
                'ph-handshake', 'warn',
                'collection', rec.collection_id,
                'promise_broken_' || rec.collection_id::text || '_' || rec.promise_to_pay_date::text
            ) ON CONFLICT (dedupe_key) DO NOTHING;
        END IF;
    END LOOP;

    RETURN QUERY SELECT v_escalated, v_tasks, v_promise, v_notify;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper: format daty dla komunikatów
CREATE OR REPLACE FUNCTION fmt_date(d DATE) RETURNS TEXT AS $$
    SELECT to_char(d, 'DD.MM.YYYY');
$$ LANGUAGE sql IMMUTABLE;

GRANT EXECUTE ON FUNCTION gmp_process_collections_reminders() TO authenticated;
