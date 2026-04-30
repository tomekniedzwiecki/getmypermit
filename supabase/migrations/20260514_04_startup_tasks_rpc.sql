-- ============================================================================
-- Etap II-C — § II-C.4 — RPC gmp_create_startup_tasks
-- ============================================================================
-- Wywołanie z Wizarda po utworzeniu sprawy. Tworzy zadania startowe per kind.
-- ============================================================================

CREATE OR REPLACE FUNCTION gmp_create_startup_tasks(
    p_case_id UUID,
    p_user_id UUID DEFAULT NULL  -- staff_id, default = current authed user
)
RETURNS INT AS $$
DECLARE
    v_count INT := 0;
    v_employer_id UUID;
    v_kind gmp_case_kind;
    v_today DATE := CURRENT_DATE;
    v_user UUID;
BEGIN
    -- Mapowanie auth.uid() → staff.id (poprawka A1: NIE wpisuj auth.uid() do FK pole)
    v_user := COALESCE(p_user_id, (SELECT id FROM gmp_staff WHERE user_id = auth.uid() LIMIT 1));

    SELECT employer_id, kind INTO v_employer_id, v_kind
    FROM gmp_cases WHERE id = p_case_id;

    IF v_kind = 'nowa_sprawa' THEN
        INSERT INTO gmp_tasks (case_id, title, task_type, due_date, assigned_to, created_by, status)
        VALUES
            (p_case_id, 'Zweryfikuj dokumenty cudzoziemca',
             'uzupelnienie_dokumentow_merytorycznych', v_today + 3, v_user, v_user, 'pending'),
            (p_case_id, 'Wyślij ankietę klientowi',
             'rozmowa_klient', v_today + 1, v_user, v_user, 'pending'),
            (p_case_id, 'Skontaktuj się z klientem ws. pełnomocnictwa',
             'rozmowa_klient', v_today + 2, v_user, v_user, 'pending');
        v_count := 3;

        IF v_employer_id IS NOT NULL THEN
            INSERT INTO gmp_tasks (case_id, title, task_type, due_date, assigned_to, created_by, status)
            VALUES (p_case_id, 'Zweryfikuj dokumenty pracodawcy',
                    'uzupelnienie_dokumentow_merytorycznych', v_today + 3, v_user, v_user, 'pending');
            v_count := v_count + 1;
        END IF;

    ELSIF v_kind IN ('przystapienie_do_sprawy', 'przejeta_do_dalszego_prowadzenia') THEN
        INSERT INTO gmp_tasks (case_id, title, task_type, due_date, assigned_to, created_by, status)
        VALUES
            (p_case_id, 'Pozyskaj kopie wniosku z urzędu / UPO',
             'kontakt_urzad', v_today + 5, v_user, v_user, 'pending'),
            (p_case_id, 'Ustal datę przystąpienia + znak sprawy',
             'inne', v_today + 3, v_user, v_user, 'pending'),
            (p_case_id, 'Sprawdź braki formalne',
             'uzupelnienie_brakow_formalnych', v_today + 7, v_user, v_user, 'pending'),
            (p_case_id, 'Sprawdź czy odciski uzupełnione',
             'inne', v_today + 7, v_user, v_user, 'pending'),
            (p_case_id, 'Sprawdź czy opłata wniesiona',
             'platnosc_rata', v_today + 5, v_user, v_user, 'pending');
        v_count := 5;

    ELSIF v_kind = 'kontrola_legalnosci_pobytu_pracy' THEN
        INSERT INTO gmp_tasks (case_id, title, task_type, due_date, assigned_to, created_by, status)
        VALUES
            (p_case_id, 'Pobierz aktualne dokumenty pobytowe',
             'uzupelnienie_dokumentow_merytorycznych', v_today + 7, v_user, v_user, 'pending'),
            (p_case_id, 'Zweryfikuj umowę o pracę vs decyzję / zezwolenie',
             'uzupelnienie_dokumentow_merytorycznych', v_today + 7, v_user, v_user, 'pending'),
            (p_case_id, 'Sprawdź ZUS', 'kontakt_urzad', v_today + 14, v_user, v_user, 'pending');
        v_count := 3;
    END IF;

    RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION gmp_create_startup_tasks TO authenticated;

COMMENT ON FUNCTION gmp_create_startup_tasks IS
'Tworzy zadania startowe per kind sprawy (Pawel § II-C.4). Wywoływana z Wizarda po insert do gmp_cases.';
