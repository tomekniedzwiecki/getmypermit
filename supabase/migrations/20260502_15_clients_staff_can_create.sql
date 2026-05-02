-- Tier 1 #2 follow-up (2026-05-02): staff musi móc tworzyć i edytować klientów.
-- Migracja 13 z dziś rano ograniczyła INSERT/UPDATE/DELETE do manager+ — to zablokowało
-- wizard "Nowa sprawa" dla zwykłych asystentów/prawników (nie mogą dodać nowego klienta).
--
-- Decyzja:
--   INSERT — każdy gmp_staff (authenticated)
--   UPDATE — staff jeśli twórca lub powiązany przez sprawę; manager+ wszystko
--   DELETE — tylko manager+ (jak było — destrukcja zostaje pod kontrolą)
-- SELECT rozszerzony o created_by_staff_id, żeby modal .insert().select().single()
-- mógł zwrócić świeżo utworzony rekord (bez tego SELECT po INSERT zwraca pustkę).

-- =====================================================
-- 1. Kolumna created_by_staff_id (audit + scope)
-- =====================================================
ALTER TABLE public.gmp_clients
    ADD COLUMN IF NOT EXISTS created_by_staff_id uuid REFERENCES public.gmp_staff(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_gmp_clients_created_by_staff
    ON public.gmp_clients(created_by_staff_id)
    WHERE created_by_staff_id IS NOT NULL;

-- =====================================================
-- 2. Trigger BEFORE INSERT: ustawia created_by_staff_id z auth.uid()
-- =====================================================
CREATE OR REPLACE FUNCTION public.gmp_set_client_created_by()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NEW.created_by_staff_id IS NULL THEN
        SELECT id INTO NEW.created_by_staff_id
        FROM gmp_staff WHERE user_id = auth.uid() LIMIT 1;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_gmp_clients_set_created_by ON public.gmp_clients;
CREATE TRIGGER trg_gmp_clients_set_created_by
    BEFORE INSERT ON public.gmp_clients
    FOR EACH ROW EXECUTE FUNCTION public.gmp_set_client_created_by();

-- =====================================================
-- 3. Drop restrictive "manager-only" policy z migracji 13
-- =====================================================
DROP POLICY IF EXISTS gmp_clients_modify_manager ON public.gmp_clients;

-- =====================================================
-- 4. Granularne policies — INSERT/UPDATE/DELETE
-- =====================================================

-- INSERT: każdy authenticated staff (musi być w gmp_staff)
CREATE POLICY gmp_clients_insert_staff ON public.gmp_clients
FOR INSERT TO authenticated
WITH CHECK (
    EXISTS (SELECT 1 FROM gmp_staff WHERE user_id = auth.uid())
);

-- UPDATE: manager+, twórca, lub przypisany do powiązanej sprawy
CREATE POLICY gmp_clients_update_staff_scoped ON public.gmp_clients
FOR UPDATE TO authenticated
USING (
    public.gmp_is_manager_or_above()
    OR created_by_staff_id IN (SELECT id FROM gmp_staff WHERE user_id = auth.uid())
    OR id IN (
        SELECT client_id FROM gmp_cases
        WHERE assigned_to IN (SELECT id FROM gmp_staff WHERE user_id = auth.uid())
          AND deleted_at IS NULL
    )
)
WITH CHECK (
    public.gmp_is_manager_or_above()
    OR created_by_staff_id IN (SELECT id FROM gmp_staff WHERE user_id = auth.uid())
    OR id IN (
        SELECT client_id FROM gmp_cases
        WHERE assigned_to IN (SELECT id FROM gmp_staff WHERE user_id = auth.uid())
          AND deleted_at IS NULL
    )
);

-- DELETE: tylko manager+ (jak w migracji 13 — destrukcja zostaje pod kontrolą)
CREATE POLICY gmp_clients_delete_manager ON public.gmp_clients
FOR DELETE TO authenticated
USING (public.gmp_is_manager_or_above());

-- =====================================================
-- 5. SELECT rozszerzony o created_by_staff_id
--    (kluczowe dla wizard modal: db.from(...).insert(payload).select().single())
-- =====================================================
DROP POLICY IF EXISTS gmp_clients_select_scoped ON public.gmp_clients;

CREATE POLICY gmp_clients_select_scoped ON public.gmp_clients
FOR SELECT TO authenticated
USING (
    public.gmp_is_manager_or_above()
    OR created_by_staff_id IN (SELECT id FROM gmp_staff WHERE user_id = auth.uid())
    OR id IN (
        SELECT client_id FROM gmp_cases
        WHERE assigned_to IN (SELECT id FROM gmp_staff WHERE user_id = auth.uid())
          AND deleted_at IS NULL
    )
);

COMMENT ON POLICY gmp_clients_insert_staff ON public.gmp_clients IS
'2026-05-02 #15: staff potrzebuje tworzyć klientów w wizardzie. Każdy gmp_staff może INSERT, trigger ustawia created_by_staff_id.';

COMMENT ON POLICY gmp_clients_update_staff_scoped ON public.gmp_clients IS
'2026-05-02 #15: staff edytuje swoich (twórca lub powiązany przez sprawę). DELETE nadal manager+.';
