-- ============================================================================
-- Etap I — § 1.7 + A6 — RPC gmp_get_next_steps + sekcja "Co teraz"
-- ============================================================================
-- Performance: 1 RPC zamiast 5 oddzielnych queries z frontendu (A6).
-- Zwraca JSON array: [{ priority, icon, label, action_url }] — top 3.
-- ============================================================================

CREATE OR REPLACE FUNCTION gmp_get_next_steps(p_case_id UUID, p_user_id UUID DEFAULT NULL)
RETURNS JSONB AS $$
DECLARE
    steps JSONB := '[]'::jsonb;
    v_text TEXT;
    v_date DATE;
    v_amount NUMERIC;
    v_id UUID;
    v_n INT;
    v_today DATE := CURRENT_DATE;
BEGIN
    -- ============================================================
    -- Reguła 1: Załącznik nr 1 do ustalenia (krytyczne — RODO/operacja)
    -- (działa tylko jeśli istnieje już gmp_e_submission_status — od Etapu III)
    -- ============================================================
    BEGIN
        SELECT 1 INTO v_n FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'gmp_e_submission_status';
        IF v_n IS NOT NULL THEN
            EXECUTE format(
                $f$ SELECT 1 FROM gmp_e_submission_status
                    WHERE case_id = %L AND zalacznik_nr_1_model = 'do_ustalenia' $f$,
                p_case_id
            );
            IF FOUND THEN
                steps := steps || jsonb_build_object(
                    'priority', 1, 'icon', 'ph-warning',
                    'label', 'Ustal model załącznika nr 1 (pełnomocnictwo / samodzielnie)',
                    'action_url', '#e-submission-zalacznik'
                );
            END IF;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        -- Tabela nie istnieje (Etap III nie wdrożony) — pomiń regułę
        NULL;
    END;

    -- ============================================================
    -- Reguła 2: Najstarsza pending pozycja w braki_formalne
    -- (działa tylko jeśli istnieje gmp_case_checklists — od Etapu II-B)
    -- ============================================================
    BEGIN
        SELECT label INTO v_text FROM gmp_case_checklists
            WHERE case_id = p_case_id AND section = 'braki_formalne' AND status = 'pending'
            ORDER BY sort_order LIMIT 1;
        IF v_text IS NOT NULL THEN
            steps := steps || jsonb_build_object(
                'priority', 2, 'icon', 'ph-clipboard-text',
                'label', 'Uzupełnij brak: ' || v_text,
                'action_url', '#checklist'
            );
        END IF;
    EXCEPTION WHEN OTHERS THEN
        NULL;  -- gmp_case_checklists jeszcze nie istnieje (Etap II-B)
    END;

    -- ============================================================
    -- Reguła 3: Zaległa rata
    -- ============================================================
    SELECT installment_number, amount INTO v_n, v_amount
        FROM gmp_payment_installments
        WHERE case_id = p_case_id AND status = 'overdue'
        ORDER BY due_date LIMIT 1;
    IF v_n IS NOT NULL THEN
        steps := steps || jsonb_build_object(
            'priority', 1, 'icon', 'ph-currency-circle-dollar',
            'label', 'Zaległa rata #' || v_n || ': ' || v_amount || ' zł',
            'action_url', '#finance'
        );
    END IF;

    -- ============================================================
    -- Reguła 4: Moje zadania zaległe/dziś (jeśli p_user_id podany)
    -- ============================================================
    IF p_user_id IS NOT NULL THEN
        SELECT title, due_date INTO v_text, v_date
            FROM gmp_tasks
            WHERE case_id = p_case_id AND assigned_to = p_user_id
              AND status = 'pending' AND due_date <= v_today
            ORDER BY due_date LIMIT 1;
        IF v_text IS NOT NULL THEN
            steps := steps || jsonb_build_object(
                'priority', CASE WHEN v_date < v_today THEN 1 ELSE 2 END,
                'icon', 'ph-check-square',
                'label', 'Twoje zadanie' ||
                    CASE WHEN v_date < v_today THEN ' (zaległe)' ELSE ' na dziś' END
                    || ': ' || v_text,
                'action_url', '#tasks'
            );
        END IF;
    END IF;

    -- ============================================================
    -- Reguła 5: Nadchodząca rata 7 dni
    -- ============================================================
    SELECT installment_number, amount, due_date INTO v_n, v_amount, v_date
        FROM gmp_payment_installments
        WHERE case_id = p_case_id AND status = 'pending'
          AND due_date BETWEEN v_today AND v_today + INTERVAL '7 days'
        ORDER BY due_date LIMIT 1;
    IF v_n IS NOT NULL THEN
        steps := steps || jsonb_build_object(
            'priority', 3, 'icon', 'ph-calendar',
            'label', 'Nadchodząca rata #' || v_n || ': ' || v_amount || ' zł (' || v_date || ')',
            'action_url', '#finance'
        );
    END IF;

    -- Sortuj po priority, weź top 3
    RETURN COALESCE(
        (SELECT jsonb_agg(value ORDER BY (value->>'priority')::int)
         FROM (SELECT * FROM jsonb_array_elements(steps) LIMIT 3) AS t(value)),
        '[]'::jsonb
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION gmp_get_next_steps TO authenticated;

COMMENT ON FUNCTION gmp_get_next_steps IS
'A6: Zwraca top 3 sugerowane akcje dla sprawy ("Co teraz" w karcie sprawy). 1 RPC zamiast 5 queries z frontendu. Reguły uwzględniają załącznik nr 1, braki formalne, zaległe raty, moje zadania, nadchodzące raty.';
