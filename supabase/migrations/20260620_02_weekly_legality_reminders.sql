-- ============================================================================
-- Etap VI.E1 — Weekly legality reminders cron
-- Cel: auto-task 14 dni przed work_end_date dla każdej sprawy z work_legality
-- Schedule: poniedziałki o 08:00 UTC
-- ============================================================================

CREATE OR REPLACE FUNCTION gmp_create_legality_reminders() RETURNS INT AS $$
DECLARE
    v_count INT := 0;
    v_row RECORD;
BEGIN
    -- Dla każdej sprawy z work_end_date między dziś+7 a dziś+21 (window 14d ± 7d)
    -- żeby capture sprawy które wpadły w ten window od ostatniego runu
    FOR v_row IN
        SELECT
            wl.case_id,
            wl.work_end_date,
            wl.work_basis,
            c.case_number,
            c.assigned_to,
            cl.last_name || ' ' || cl.first_name AS client_name
        FROM gmp_case_work_legality wl
        JOIN gmp_cases c ON c.id = wl.case_id
        LEFT JOIN gmp_clients cl ON cl.id = c.client_id
        WHERE wl.work_end_date BETWEEN CURRENT_DATE + 7 AND CURRENT_DATE + 21
          AND c.status IN ('aktywna', 'zlecona')
          -- Nie twórz duplikatu jeśli task już istnieje
          AND NOT EXISTS (
              SELECT 1 FROM gmp_tasks t
              WHERE t.case_id = wl.case_id
                AND t.task_type = 'legal_reminder'
                AND t.due_date BETWEEN wl.work_end_date - 21 AND wl.work_end_date
                AND t.status != 'done'
          )
    LOOP
        INSERT INTO gmp_tasks (
            case_id, title, description, due_date,
            task_type, status, visibility, show_in_calendar,
            assigned_to
        ) VALUES (
            v_row.case_id,
            'Weryfikacja legalności pracy: ' || COALESCE(v_row.client_name, v_row.case_number),
            'Auto-przypomnienie: legalność pracy kończy się ' || v_row.work_end_date::text ||
            ' (podstawa: ' || COALESCE(v_row.work_basis, '-') || '). ' ||
            'Sprawdź czy klient potrzebuje przedłużenia / nowego zezwolenia.',
            v_row.work_end_date - 14,  -- 14 dni przed końcem
            'legal_reminder',
            'todo',
            'team',
            true,
            v_row.assigned_to
        );
        v_count := v_count + 1;
    END LOOP;

    RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Schedule cron — poniedziałki o 08:00 UTC (10:00 CEST)
DO $$
BEGIN
    PERFORM cron.unschedule('gmp_weekly_legality_reminders')
    WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'gmp_weekly_legality_reminders');

    PERFORM cron.schedule(
        'gmp_weekly_legality_reminders',
        '0 8 * * 1',
        $cmd$ SELECT gmp_create_legality_reminders() $cmd$
    );
END$$;

COMMENT ON FUNCTION gmp_create_legality_reminders() IS 'Pawel VI.E1 — auto-task 14 dni przed work_end_date dla każdej sprawy. Cron co poniedziałek 08:00 UTC.';
