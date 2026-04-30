-- ============================================================================
-- Etap II-C — § II-C.2 — Tabela gmp_case_role_assignments
-- ============================================================================
-- Override domyślnych ról w sprawie. Defaulty wyliczane on-the-fly w UI.
-- ============================================================================

CREATE TABLE IF NOT EXISTS gmp_case_role_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES gmp_cases ON DELETE CASCADE,
    role gmp_case_role NOT NULL,
    party_type gmp_case_role_party_type NOT NULL,
    -- Polymorphic FK — tylko jeden powinien być wypełniony zgodnie z party_type
    client_id UUID REFERENCES gmp_clients ON DELETE SET NULL,
    employer_id UUID REFERENCES gmp_employers ON DELETE SET NULL,
    staff_id UUID REFERENCES gmp_staff ON DELETE SET NULL,
    -- Dla party_type='external': ręcznie wpisane dane (bez FK)
    external_name TEXT,
    external_email TEXT,
    external_phone TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES gmp_staff
    -- UNIQUE constraint via expression index poniżej (PG nie pozwala COALESCE w table-level UNIQUE)
);

-- Unique by (case + role + party): zabezpiecza przed duplikatami
CREATE UNIQUE INDEX IF NOT EXISTS uq_case_role_party
    ON gmp_case_role_assignments (
        case_id, role,
        COALESCE(client_id, '00000000-0000-0000-0000-000000000000'::uuid),
        COALESCE(employer_id, '00000000-0000-0000-0000-000000000000'::uuid),
        COALESCE(staff_id, '00000000-0000-0000-0000-000000000000'::uuid)
    );

CREATE INDEX IF NOT EXISTS idx_role_case ON gmp_case_role_assignments(case_id, role);
CREATE INDEX IF NOT EXISTS idx_role_client ON gmp_case_role_assignments(client_id) WHERE client_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_role_employer ON gmp_case_role_assignments(employer_id) WHERE employer_id IS NOT NULL;

-- RLS
ALTER TABLE gmp_case_role_assignments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "staff_all_roles" ON gmp_case_role_assignments;
CREATE POLICY "staff_all_roles" ON gmp_case_role_assignments
    FOR ALL USING (auth.uid() IS NOT NULL);

COMMENT ON TABLE gmp_case_role_assignments IS
'Override domyślnych ról w sprawie (Pawel pkt 12). Defaulty (jeśli brak wpisu): strona=client_id/employer_id z gmp_cases. Tabela używana TYLKO gdy chcemy nadpisać default.';
