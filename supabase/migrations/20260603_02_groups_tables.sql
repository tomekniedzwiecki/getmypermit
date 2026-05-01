-- ============================================================================
-- Etap V.1 — Tabele gmp_case_groups + gmp_case_group_members + RLS
-- Pawel pkt 12, 13, 14
-- ============================================================================

CREATE TABLE IF NOT EXISTS gmp_case_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    type gmp_case_group_type NOT NULL,
    employer_id UUID REFERENCES gmp_employers ON DELETE SET NULL,
    primary_contact_client_id UUID REFERENCES gmp_clients ON DELETE SET NULL,
    primary_contact_phone TEXT,
    primary_contact_email TEXT,
    primary_contact_address TEXT,
    payer_party_type TEXT CHECK (payer_party_type IN ('client', 'employer')),
    payer_client_id UUID REFERENCES gmp_clients,
    payer_employer_id UUID REFERENCES gmp_employers,
    assigned_to UUID REFERENCES gmp_staff,
    notes TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES gmp_staff
);

CREATE INDEX IF NOT EXISTS idx_groups_type ON gmp_case_groups(type, is_active);
CREATE INDEX IF NOT EXISTS idx_groups_employer ON gmp_case_groups(employer_id) WHERE employer_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS gmp_case_group_members (
    group_id UUID NOT NULL REFERENCES gmp_case_groups ON DELETE CASCADE,
    case_id UUID NOT NULL REFERENCES gmp_cases ON DELETE CASCADE,
    role_in_group TEXT,
    added_at TIMESTAMPTZ DEFAULT NOW(),
    added_by UUID REFERENCES gmp_staff,
    PRIMARY KEY (group_id, case_id)
);

CREATE INDEX IF NOT EXISTS idx_group_members_case ON gmp_case_group_members(case_id);

-- RLS
ALTER TABLE gmp_case_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE gmp_case_group_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_groups" ON gmp_case_groups;
CREATE POLICY "staff_groups" ON gmp_case_groups FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "staff_group_members" ON gmp_case_group_members;
CREATE POLICY "staff_group_members" ON gmp_case_group_members FOR ALL USING (auth.uid() IS NOT NULL);

COMMENT ON TABLE gmp_case_groups IS 'Pawel pkt 12/13/14 — grupy spraw (pracodawca/rodzina/projekt) z opiekunem, kontaktem, płatnikiem';
COMMENT ON TABLE gmp_case_group_members IS 'M2M sprawa↔grupa, role_in_group=mąż/żona/dziecko/pracownik etc.';
