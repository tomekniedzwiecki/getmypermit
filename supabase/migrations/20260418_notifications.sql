-- Notifications: proste uniwersalne powiadomienia per-user
-- Typy: new_lead, overdue_task, inactivity_alert, promise_broken, case_assigned, mention
CREATE TABLE IF NOT EXISTS gmp_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_id UUID REFERENCES gmp_staff(id) ON DELETE CASCADE,
    kind TEXT NOT NULL,                        -- 'new_lead' | 'overdue_task' | ...
    title TEXT NOT NULL,
    body TEXT,
    link_url TEXT,                             -- 'case.html?id=...'
    icon TEXT DEFAULT 'ph-bell',
    severity TEXT DEFAULT 'info',              -- 'info' | 'warn' | 'danger' | 'success'
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    -- Metadata do dedup (żeby nie wysyłać 2x tego samego)
    source_entity_type TEXT,
    source_entity_id UUID,
    dedupe_key TEXT UNIQUE
);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient_unread ON gmp_notifications(recipient_id, read_at) WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_recent ON gmp_notifications(recipient_id, created_at DESC);

ALTER TABLE gmp_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notifications_own" ON gmp_notifications;
CREATE POLICY "notifications_own" ON gmp_notifications FOR ALL TO authenticated
    USING (recipient_id IN (SELECT id FROM gmp_staff WHERE user_id = auth.uid()))
    WITH CHECK (true);

-- Funkcja: utwórz powiadomienie dla wszystkich adminów
CREATE OR REPLACE FUNCTION gmp_notify_admins(
    p_kind TEXT, p_title TEXT, p_body TEXT DEFAULT NULL,
    p_link TEXT DEFAULT NULL, p_icon TEXT DEFAULT 'ph-bell',
    p_severity TEXT DEFAULT 'info',
    p_source_type TEXT DEFAULT NULL, p_source_id UUID DEFAULT NULL,
    p_dedupe TEXT DEFAULT NULL
) RETURNS INT AS $$
DECLARE
    cnt INT := 0;
    v_staff RECORD;
BEGIN
    FOR v_staff IN SELECT id FROM gmp_staff WHERE role IN ('admin', 'partner') LOOP
        INSERT INTO gmp_notifications (recipient_id, kind, title, body, link_url, icon, severity, source_entity_type, source_entity_id, dedupe_key)
        VALUES (v_staff.id, p_kind, p_title, p_body, p_link, p_icon, p_severity, p_source_type, p_source_id,
                p_dedupe || '_' || v_staff.id::text)
        ON CONFLICT (dedupe_key) DO NOTHING;
        GET DIAGNOSTICS cnt = ROW_COUNT;
    END LOOP;
    RETURN cnt;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: nowy lead → notyfikacja
CREATE OR REPLACE FUNCTION gmp_notify_new_lead() RETURNS TRIGGER AS $$
DECLARE
    v_name TEXT;
BEGIN
    v_name := COALESCE(NEW.name, NEW.first_name || ' ' || NEW.last_name, 'anonim');
    PERFORM gmp_notify_admins(
        'new_lead',
        format('Nowy lead: %s', v_name),
        format('Typ: %s, Lokalizacja: %s, %s',
            COALESCE(NEW.permit_type, '-'),
            COALESCE(NEW.location, '-'),
            COALESCE(NEW.lead_type || ' (' || NEW.lead_score || ')', '')),
        format('lead.html?id=%s', NEW.id),
        'ph-magnet',
        CASE NEW.lead_type WHEN 'HOT' THEN 'danger' WHEN 'WARM' THEN 'warn' ELSE 'info' END,
        'lead', NEW.id,
        'new_lead_' || NEW.id::text
    );
    RETURN NEW;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_new_lead ON permit_leads;
CREATE TRIGGER trg_notify_new_lead
    AFTER INSERT ON permit_leads
    FOR EACH ROW EXECUTE FUNCTION gmp_notify_new_lead();

-- Trigger: sprawa przypisana → notyfikacja dla assignee
CREATE OR REPLACE FUNCTION gmp_notify_case_assigned() RETURNS TRIGGER AS $$
DECLARE
    v_client TEXT;
BEGIN
    -- Tylko gdy zmiana assigned_to (bez INSERT z assigned_to na początku)
    IF (TG_OP = 'UPDATE' AND NEW.assigned_to IS DISTINCT FROM OLD.assigned_to AND NEW.assigned_to IS NOT NULL) THEN
        SELECT last_name || ' ' || first_name INTO v_client FROM gmp_clients WHERE id = NEW.client_id;
        INSERT INTO gmp_notifications (recipient_id, kind, title, body, link_url, icon, severity, source_entity_type, source_entity_id, dedupe_key)
        VALUES (
            NEW.assigned_to, 'case_assigned',
            format('Przypisano Ci sprawę: %s', COALESCE(v_client, '(bez klienta)')),
            format('Nr: %s · Typ: %s', COALESCE(NEW.case_number, '—'), COALESCE(NEW.case_type, '—')),
            format('case.html?id=%s', NEW.id),
            'ph-briefcase', 'info',
            'case', NEW.id,
            'case_assigned_' || NEW.id::text || '_' || NEW.assigned_to::text || '_' || extract(epoch from now())::text
        ) ON CONFLICT (dedupe_key) DO NOTHING;
    END IF;
    RETURN NEW;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_case_assigned ON gmp_cases;
CREATE TRIGGER trg_notify_case_assigned
    AFTER INSERT OR UPDATE OF assigned_to ON gmp_cases
    FOR EACH ROW EXECUTE FUNCTION gmp_notify_case_assigned();
