-- Super admin (owner) role + unified audit log + last_login tracking
-- Dla panelu /admin.html (super admin dla Pawła)

-- 1) Rola 'owner' (najwyższa)
ALTER TABLE gmp_staff DROP CONSTRAINT IF EXISTS gmp_staff_role_check;
ALTER TABLE gmp_staff ADD CONSTRAINT gmp_staff_role_check
    CHECK (role IN ('owner', 'admin', 'lawyer', 'assistant', 'staff'));

-- 2) Login tracking na gmp_staff
ALTER TABLE gmp_staff ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;
ALTER TABLE gmp_staff ADD COLUMN IF NOT EXISTS login_count INT DEFAULT 0;

-- 3) Unified audit log dla sensitive/destrukcyjnych akcji
CREATE TABLE IF NOT EXISTS gmp_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID REFERENCES gmp_staff(id) ON DELETE SET NULL,
    staff_name TEXT,              -- snapshot — żeby audit nie znikał po usunięciu staffu
    action TEXT NOT NULL,         -- np. 'case_delete', 'intake_delete', 'credential_view', 'role_change', 'export_data'
    entity_type TEXT,             -- 'case', 'client', 'intake', 'credential', 'staff', 'invoice'
    entity_id UUID,
    entity_label TEXT,            -- "Sprawa #234 — Rajesh Kumar"
    severity TEXT DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical')),
    before_data JSONB,
    after_data JSONB,
    metadata JSONB DEFAULT '{}',
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_staff ON gmp_audit_log(staff_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON gmp_audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON gmp_audit_log(action, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_created ON gmp_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_severity ON gmp_audit_log(severity, created_at DESC) WHERE severity IN ('warning', 'critical');

-- RLS: tylko owner/admin czyta
ALTER TABLE gmp_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS audit_log_read ON gmp_audit_log;
CREATE POLICY audit_log_read ON gmp_audit_log FOR SELECT
    USING (EXISTS (SELECT 1 FROM gmp_staff WHERE user_id = auth.uid() AND role IN ('owner', 'admin')));

DROP POLICY IF EXISTS audit_log_insert ON gmp_audit_log;
CREATE POLICY audit_log_insert ON gmp_audit_log FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

-- Nikt nie może modyfikować ani usuwać rekordów audit (integralność)
-- (brak UPDATE/DELETE policies — niedostępne nawet dla ownera z UI)

-- 4) Auto-purge > 2 lata (cron via pg_cron jeśli dostępny, inaczej manualnie)
CREATE OR REPLACE FUNCTION gmp_audit_log_purge() RETURNS INT AS $$
DECLARE
    deleted_count INT;
BEGIN
    DELETE FROM gmp_audit_log WHERE created_at < NOW() - INTERVAL '2 years';
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION gmp_audit_log_purge() IS 'RODO: usuwa wpisy starsze niż 2 lata. Wywoływać raz w miesiącu (cron albo manualnie).';

-- 5) Helper: dodaj wpis audit (używany z JS przez RPC)
CREATE OR REPLACE FUNCTION gmp_audit_log_add(
    p_action TEXT,
    p_entity_type TEXT DEFAULT NULL,
    p_entity_id UUID DEFAULT NULL,
    p_entity_label TEXT DEFAULT NULL,
    p_severity TEXT DEFAULT 'info',
    p_before JSONB DEFAULT NULL,
    p_after JSONB DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'::jsonb
) RETURNS UUID AS $$
DECLARE
    v_staff_id UUID;
    v_staff_name TEXT;
    v_id UUID;
BEGIN
    SELECT id, COALESCE(full_name, email) INTO v_staff_id, v_staff_name
    FROM gmp_staff WHERE user_id = auth.uid() LIMIT 1;

    INSERT INTO gmp_audit_log (
        staff_id, staff_name, action, entity_type, entity_id, entity_label,
        severity, before_data, after_data, metadata
    ) VALUES (
        v_staff_id, v_staff_name, p_action, p_entity_type, p_entity_id, p_entity_label,
        p_severity, p_before, p_after, p_metadata
    ) RETURNING id INTO v_id;

    RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION gmp_audit_log_add TO authenticated;

-- 6) Helper: login tracking
CREATE OR REPLACE FUNCTION gmp_staff_touch_login() RETURNS VOID AS $$
BEGIN
    UPDATE gmp_staff
    SET last_login_at = NOW(),
        login_count = COALESCE(login_count, 0) + 1
    WHERE user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION gmp_staff_touch_login TO authenticated;

-- 7) View: live activity stream (unifikuje case + collection + intake + audit)
CREATE OR REPLACE VIEW gmp_live_activity AS
SELECT
    ca.id,
    'case_activity' AS source,
    ca.activity_type::text AS action,
    ca.created_by AS staff_id,
    s.full_name AS staff_name,
    ca.content AS content,
    ca.case_id AS entity_id,
    'case' AS entity_type,
    c.case_number AS entity_label,
    ca.created_at
FROM gmp_case_activities ca
LEFT JOIN gmp_staff s ON s.id = ca.created_by
LEFT JOIN gmp_cases c ON c.id = ca.case_id
UNION ALL
SELECT
    al.id,
    'audit' AS source,
    al.action,
    al.staff_id,
    al.staff_name,
    NULL AS content,
    al.entity_id,
    al.entity_type,
    al.entity_label,
    al.created_at
FROM gmp_audit_log al
UNION ALL
SELECT
    it.id,
    'intake' AS source,
    'intake_' || it.status AS action,
    COALESCE(it.reviewed_by, it.created_by) AS staff_id,
    s.full_name AS staff_name,
    NULL AS content,
    it.case_id AS entity_id,
    'case' AS entity_type,
    c.case_number AS entity_label,
    COALESCE(it.reviewed_at, it.submitted_at, it.created_at) AS created_at
FROM gmp_intake_tokens it
LEFT JOIN gmp_staff s ON s.id = COALESCE(it.reviewed_by, it.created_by)
LEFT JOIN gmp_cases c ON c.id = it.case_id;

COMMENT ON VIEW gmp_live_activity IS 'Unified stream aktywności: case activities + audit + intake events. Używane w /admin.html Live Pulse.';
