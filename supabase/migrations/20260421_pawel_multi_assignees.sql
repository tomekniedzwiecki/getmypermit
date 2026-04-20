-- ============================================================
-- Uwagi Pawła 2026-04-20: Wielu opiekunów sprawy (max 3)
-- Źródło: uwagi-pawla-2026-04-20.md (pkt 8 — "system 2-kowy")
--
-- Strategia: zachowaj gmp_cases.assigned_to jako primary (backward compat)
-- Dodaj tabelę gmp_case_assignees z role_type
-- Trigger: limit max 3 opiekunów per sprawa
-- ============================================================

CREATE TABLE IF NOT EXISTS gmp_case_assignees (
    case_id UUID NOT NULL REFERENCES gmp_cases(id) ON DELETE CASCADE,
    staff_id UUID NOT NULL REFERENCES gmp_staff(id) ON DELETE RESTRICT,
    role_type TEXT NOT NULL DEFAULT 'primary'
        CHECK (role_type IN ('primary','secondary','backup')),
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    assigned_by UUID REFERENCES gmp_staff(id),
    PRIMARY KEY (case_id, staff_id)
);

CREATE INDEX IF NOT EXISTS idx_case_assignees_staff
    ON gmp_case_assignees(staff_id);
CREATE INDEX IF NOT EXISTS idx_case_assignees_case
    ON gmp_case_assignees(case_id);

ALTER TABLE gmp_case_assignees ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "case_assignees_auth" ON gmp_case_assignees;
CREATE POLICY "case_assignees_auth" ON gmp_case_assignees
    FOR ALL TO authenticated USING (true) WITH CHECK (true);


-- =================================================================
-- 1) Trigger: max 3 opiekunów per sprawa (uwagi pkt 8)
-- =================================================================
CREATE OR REPLACE FUNCTION gmp_enforce_max_assignees() RETURNS TRIGGER AS $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_count
    FROM gmp_case_assignees
    WHERE case_id = NEW.case_id;
    IF v_count >= 3 THEN
        RAISE EXCEPTION 'Maksymalnie 3 opiekunów na sprawę (uwagi Pawła pkt 8, system 2-kowy)';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_gmp_enforce_max_assignees ON gmp_case_assignees;
CREATE TRIGGER trg_gmp_enforce_max_assignees
    BEFORE INSERT ON gmp_case_assignees
    FOR EACH ROW EXECUTE FUNCTION gmp_enforce_max_assignees();


-- =================================================================
-- 2) Trigger: tylko jeden 'primary' opiekun per sprawa
-- =================================================================
CREATE OR REPLACE FUNCTION gmp_enforce_single_primary_assignee() RETURNS TRIGGER AS $$
BEGIN
    IF NEW.role_type = 'primary' THEN
        -- Usuń flagę primary z innych
        UPDATE gmp_case_assignees
        SET role_type = 'secondary'
        WHERE case_id = NEW.case_id
          AND staff_id <> NEW.staff_id
          AND role_type = 'primary';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_gmp_enforce_single_primary ON gmp_case_assignees;
CREATE TRIGGER trg_gmp_enforce_single_primary
    AFTER INSERT OR UPDATE OF role_type ON gmp_case_assignees
    FOR EACH ROW EXECUTE FUNCTION gmp_enforce_single_primary_assignee();


-- =================================================================
-- 3) Sync: gmp_cases.assigned_to = primary assignee (dla backward compat)
-- =================================================================
CREATE OR REPLACE FUNCTION gmp_sync_primary_assignee_to_cases() RETURNS TRIGGER AS $$
DECLARE
    v_primary_staff UUID;
    v_case_id UUID;
BEGIN
    v_case_id := COALESCE(NEW.case_id, OLD.case_id);
    SELECT staff_id INTO v_primary_staff
    FROM gmp_case_assignees
    WHERE case_id = v_case_id AND role_type = 'primary'
    LIMIT 1;

    UPDATE gmp_cases
    SET assigned_to = v_primary_staff,
        updated_at = NOW()
    WHERE id = v_case_id;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_gmp_sync_primary_assignee ON gmp_case_assignees;
CREATE TRIGGER trg_gmp_sync_primary_assignee
    AFTER INSERT OR UPDATE OR DELETE ON gmp_case_assignees
    FOR EACH ROW EXECUTE FUNCTION gmp_sync_primary_assignee_to_cases();


-- =================================================================
-- 4) Backfill: dla istniejących spraw z assigned_to utwórz rekord primary
-- =================================================================
INSERT INTO gmp_case_assignees (case_id, staff_id, role_type, assigned_at)
SELECT id, assigned_to, 'primary', COALESCE(assigned_at, created_at)
FROM gmp_cases
WHERE assigned_to IS NOT NULL
ON CONFLICT (case_id, staff_id) DO NOTHING;


-- =================================================================
-- 5) VIEW: agregacja opiekunów per sprawa (dla list i case.html)
-- =================================================================
CREATE OR REPLACE VIEW gmp_case_assignees_view AS
SELECT
    ca.case_id,
    jsonb_agg(
        jsonb_build_object(
            'staff_id', ca.staff_id,
            'full_name', s.full_name,
            'color', s.color,
            'role_type', ca.role_type,
            'assigned_at', ca.assigned_at
        ) ORDER BY
            CASE ca.role_type WHEN 'primary' THEN 1 WHEN 'secondary' THEN 2 ELSE 3 END,
            s.full_name
    ) AS assignees
FROM gmp_case_assignees ca
JOIN gmp_staff s ON s.id = ca.staff_id
GROUP BY ca.case_id;

GRANT SELECT ON gmp_case_assignees_view TO authenticated, anon;


COMMENT ON TABLE gmp_case_assignees IS
'Wielu opiekunów sprawy (max 3). System 2-kowy Pawła (pkt 8 uwag z 2026-04-20). gmp_cases.assigned_to = primary (automatyczna synchronizacja przez trigger).';
