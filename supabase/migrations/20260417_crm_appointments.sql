-- Nowa, czysta tabela appointments dla CRM
-- Stara gmp_appointments zostawiamy dla stronkowego widgetu (ma NOT NULL lawyer_id/scheduled_time)

CREATE TABLE IF NOT EXISTS gmp_crm_appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_type gmp_appointment_type DEFAULT 'konsultacja',

    -- Kiedy
    scheduled_date DATE,
    scheduled_time TIME,
    duration_minutes INTEGER DEFAULT 30,

    -- Z kim
    client_id UUID REFERENCES gmp_clients(id) ON DELETE SET NULL,
    case_id UUID REFERENCES gmp_cases(id) ON DELETE SET NULL,
    staff_id UUID REFERENCES gmp_staff(id),

    -- Gdzie
    office_id UUID REFERENCES gmp_offices(id),
    location TEXT,

    -- Szczegoly
    title TEXT,
    notes TEXT,
    transport_type TEXT,
    ticket_number TEXT,
    status TEXT DEFAULT 'scheduled'
        CHECK (status IN ('scheduled', 'confirmed', 'completed', 'cancelled', 'no_show')),

    -- Kontakt gdy brak client_id
    contact_name TEXT,
    contact_phone TEXT,
    contact_email TEXT,

    -- Reminder
    reminder_sent BOOLEAN DEFAULT FALSE,
    reminder_sent_at TIMESTAMPTZ,

    -- Meta
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    cancelled_at TIMESTAMPTZ,
    created_by UUID REFERENCES gmp_staff(id),

    -- Import tracking
    import_source TEXT,
    import_raw JSONB
);

CREATE INDEX IF NOT EXISTS idx_crm_appt_date ON gmp_crm_appointments(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_crm_appt_client ON gmp_crm_appointments(client_id);
CREATE INDEX IF NOT EXISTS idx_crm_appt_case ON gmp_crm_appointments(case_id);
CREATE INDEX IF NOT EXISTS idx_crm_appt_staff ON gmp_crm_appointments(staff_id);
CREATE INDEX IF NOT EXISTS idx_crm_appt_type ON gmp_crm_appointments(appointment_type);
CREATE INDEX IF NOT EXISTS idx_crm_appt_status ON gmp_crm_appointments(status);

ALTER TABLE gmp_crm_appointments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authenticated_crud" ON gmp_crm_appointments;
CREATE POLICY "authenticated_crud" ON gmp_crm_appointments
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Trigger: automatyczny update updated_at
CREATE OR REPLACE FUNCTION gmp_crm_appt_bump_updated() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_crm_appt_bump ON gmp_crm_appointments;
CREATE TRIGGER trg_crm_appt_bump BEFORE UPDATE ON gmp_crm_appointments
    FOR EACH ROW EXECUTE FUNCTION gmp_crm_appt_bump_updated();

COMMENT ON TABLE gmp_crm_appointments IS
'CRM appointments - konsultacje, odciski, stawiennictwa. Osobne od gmp_appointments (ta jest dla widgetu strony)';
