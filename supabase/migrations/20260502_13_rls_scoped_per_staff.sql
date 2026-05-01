-- Tier 1 #2: RLS scoped per staff dla gmp_cases.
-- Przed: 'authenticated_crud' qual=true → każdy zalogowany widzi WSZYSTKIE 4415 spraw.
-- Po: staff widzi tylko swoje (assigned_to = własny gmp_staff.id);
--     owner/admin/manager widzą wszystko; INSERT/UPDATE/DELETE tylko manager+.
--
-- WAŻNE: Aktualnie aktywnie loguje się tylko Tomek (owner) i konto testowe (staff).
-- Legacy staff (Paweł, Julia, Oleksandr itd.) nie ma user_id. Po wdrożeniu pierwszego
-- konta dla tych osób — TRZEBA powiązać gmp_staff.user_id, inaczej zobaczą 0 spraw.

-- Helper function: zwraca rolę bieżącego usera + jego gmp_staff.id
-- Używamy SECURITY DEFINER żeby uniknąć rekursji (gmp_staff też może mieć RLS)
CREATE OR REPLACE FUNCTION public.gmp_current_staff()
RETURNS TABLE (staff_id uuid, role text)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT id AS staff_id, role
    FROM gmp_staff
    WHERE user_id = auth.uid()
    LIMIT 1
$$;

GRANT EXECUTE ON FUNCTION public.gmp_current_staff() TO authenticated;

-- Helper boolean: czy current user jest manager+ (widzi wszystko)
CREATE OR REPLACE FUNCTION public.gmp_is_manager_or_above()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM gmp_staff
        WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'manager')
    )
$$;

GRANT EXECUTE ON FUNCTION public.gmp_is_manager_or_above() TO authenticated;

-- =====================================================
-- gmp_cases — RLS scoped
-- =====================================================
DROP POLICY IF EXISTS authenticated_crud ON public.gmp_cases;
DROP POLICY IF EXISTS gmp_cases_select_scoped ON public.gmp_cases;
DROP POLICY IF EXISTS gmp_cases_modify_manager ON public.gmp_cases;

-- SELECT: manager+ widzi wszystko; staff tylko swoje (assigned_to)
-- Dodatkowo wykluczamy soft-deleted dla staff (manager widzi też trash)
CREATE POLICY gmp_cases_select_scoped ON public.gmp_cases
FOR SELECT TO authenticated
USING (
    public.gmp_is_manager_or_above()
    OR (
        deleted_at IS NULL
        AND assigned_to IN (SELECT id FROM gmp_staff WHERE user_id = auth.uid())
    )
);

-- INSERT/UPDATE/DELETE: manager+ albo właściciel sprawy (staff może edytować swoją)
CREATE POLICY gmp_cases_modify_owner_or_manager ON public.gmp_cases
FOR ALL TO authenticated
USING (
    public.gmp_is_manager_or_above()
    OR assigned_to IN (SELECT id FROM gmp_staff WHERE user_id = auth.uid())
)
WITH CHECK (
    public.gmp_is_manager_or_above()
    OR assigned_to IN (SELECT id FROM gmp_staff WHERE user_id = auth.uid())
);

COMMENT ON POLICY gmp_cases_select_scoped ON public.gmp_cases IS
'Tier 1 #2 fix 2026-05-02: staff widzi tylko swoje sprawy; manager+ wszystko. Insider threat reduction.';

-- =====================================================
-- gmp_clients — RLS scoped (przez powiązane sprawy)
-- =====================================================
-- gmp_clients nie ma kolumny assigned_to bezpośrednio. Filtrujemy przez gmp_cases.
-- Klient widoczny dla staff jeśli istnieje sprawa z assigned_to=jego_id.
DROP POLICY IF EXISTS authenticated_crud ON public.gmp_clients;
DROP POLICY IF EXISTS gmp_clients_select_scoped ON public.gmp_clients;
DROP POLICY IF EXISTS gmp_clients_modify_manager ON public.gmp_clients;

CREATE POLICY gmp_clients_select_scoped ON public.gmp_clients
FOR SELECT TO authenticated
USING (
    public.gmp_is_manager_or_above()
    OR id IN (
        SELECT client_id FROM gmp_cases
        WHERE assigned_to IN (SELECT id FROM gmp_staff WHERE user_id = auth.uid())
          AND deleted_at IS NULL
    )
);

CREATE POLICY gmp_clients_modify_manager ON public.gmp_clients
FOR ALL TO authenticated
USING (public.gmp_is_manager_or_above())
WITH CHECK (public.gmp_is_manager_or_above());

-- =====================================================
-- gmp_documents — RLS scoped przez gmp_cases
-- =====================================================
DROP POLICY IF EXISTS authenticated_crud ON public.gmp_documents;
DROP POLICY IF EXISTS gmp_documents_select_scoped ON public.gmp_documents;
DROP POLICY IF EXISTS gmp_documents_modify_owner ON public.gmp_documents;

CREATE POLICY gmp_documents_select_scoped ON public.gmp_documents
FOR SELECT TO authenticated
USING (
    public.gmp_is_manager_or_above()
    OR case_id IS NULL  -- documents bez case_id (templates)
    OR case_id IN (
        SELECT id FROM gmp_cases
        WHERE assigned_to IN (SELECT id FROM gmp_staff WHERE user_id = auth.uid())
          AND deleted_at IS NULL
    )
);

CREATE POLICY gmp_documents_modify_owner ON public.gmp_documents
FOR ALL TO authenticated
USING (
    public.gmp_is_manager_or_above()
    OR case_id IN (
        SELECT id FROM gmp_cases
        WHERE assigned_to IN (SELECT id FROM gmp_staff WHERE user_id = auth.uid())
    )
)
WITH CHECK (
    public.gmp_is_manager_or_above()
    OR case_id IN (
        SELECT id FROM gmp_cases
        WHERE assigned_to IN (SELECT id FROM gmp_staff WHERE user_id = auth.uid())
    )
);

-- =====================================================
-- gmp_payments — RLS scoped przez gmp_cases (PII finansowe)
-- =====================================================
DROP POLICY IF EXISTS authenticated_crud ON public.gmp_payments;
DROP POLICY IF EXISTS gmp_payments_select_scoped ON public.gmp_payments;
DROP POLICY IF EXISTS gmp_payments_modify_manager ON public.gmp_payments;

CREATE POLICY gmp_payments_select_scoped ON public.gmp_payments
FOR SELECT TO authenticated
USING (
    public.gmp_is_manager_or_above()
    OR case_id IN (
        SELECT id FROM gmp_cases
        WHERE assigned_to IN (SELECT id FROM gmp_staff WHERE user_id = auth.uid())
          AND deleted_at IS NULL
    )
);

CREATE POLICY gmp_payments_modify_manager ON public.gmp_payments
FOR ALL TO authenticated
USING (public.gmp_is_manager_or_above())
WITH CHECK (public.gmp_is_manager_or_above());
