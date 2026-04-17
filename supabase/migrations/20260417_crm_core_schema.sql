-- ============================================================
-- CRM getmypermit - Core schema (Faza 1)
-- Zgodny z CRM_PLAN.md sekcja 2
-- ============================================================

-- ============ CUSTOM TYPES ============
DO $$ BEGIN
    CREATE TYPE gmp_case_status AS ENUM ('lead', 'zlecona', 'aktywna', 'zakonczona', 'archiwum');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE gmp_case_stage AS ENUM (
        'weryfikacja_dokumentow', 'zlozenie_wniosku', 'oczekiwanie_na_osobiste',
        'wyznaczono_termin', 'po_osobistym', 'oczekiwanie_na_decyzje',
        'zakonczenie', 'odwolanie', 'umorzenie', 'przystapienie'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE gmp_case_kind AS ENUM ('nowa_sprawa', 'przystapienie_do_sprawy');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE gmp_submission_method AS ENUM ('osobiscie', 'elektronicznie', 'pocztowo', 'przeniesienie');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE gmp_activity_type AS ENUM (
        'status_change', 'stage_change', 'note', 'document_added',
        'task_assigned', 'email_sent', 'whatsapp_sent',
        'payment_received', 'appointment_created', 'decision_received'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE gmp_task_status AS ENUM ('pending', 'in_progress', 'done', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE gmp_payment_method AS ENUM ('gotowka', 'przelew', 'karta', 'faktura', 'inne');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE gmp_payer_type AS ENUM ('client', 'employer');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE gmp_payment_kind AS ENUM ('fee', 'admin_fee');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE gmp_invoice_status AS ENUM ('to_issue', 'issued', 'sent', 'paid', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE gmp_appointment_type AS ENUM (
        'konsultacja', 'follow_up', 'osobiste_odciski', 'osobiste_inne', 'hearing'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ============ SLOWNIKI: OFFICES / DEPARTMENTS / INSPECTORS ============
CREATE TABLE IF NOT EXISTS gmp_offices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    city TEXT,
    code TEXT UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS gmp_office_departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    office_id UUID REFERENCES gmp_offices(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (office_id, code)
);

CREATE TABLE IF NOT EXISTS gmp_inspectors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    office_id UUID REFERENCES gmp_offices(id),
    department_id UUID REFERENCES gmp_office_departments(id),
    full_name TEXT NOT NULL,
    full_name_normalized TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_inspector_name
    ON gmp_inspectors(full_name_normalized);
CREATE INDEX IF NOT EXISTS idx_inspectors_office ON gmp_inspectors(office_id);


-- ============ STAFF (pracownicy kancelarii) ============
-- Nowa tabela, NIE modyfikujemy gmp_lawyers (wsteczna kompatybilnosc starych HTML)
CREATE TABLE IF NOT EXISTS gmp_staff (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    full_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    role TEXT DEFAULT 'staff' CHECK (role IN ('admin', 'lawyer', 'assistant', 'staff')),
    color TEXT DEFAULT '#3b82f6',
    is_active BOOLEAN DEFAULT TRUE,
    aliases TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_staff_full_name
    ON gmp_staff(lower(full_name));


-- ============ EMPLOYERS (pracodawcy) ============
CREATE TABLE IF NOT EXISTS gmp_employers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    name_normalized TEXT,
    nip TEXT,
    address TEXT,
    contact_person TEXT,
    contact_phone TEXT,
    contact_email TEXT,
    invoice_data JSONB,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_employers_name_normalized ON gmp_employers(name_normalized);
CREATE UNIQUE INDEX IF NOT EXISTS uq_employers_name_norm
    ON gmp_employers(name_normalized)
    WHERE name_normalized IS NOT NULL;


-- ============ CLIENTS (klienci) ============
CREATE TABLE IF NOT EXISTS gmp_clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    last_name TEXT NOT NULL,
    first_name TEXT NOT NULL,
    full_name_normalized TEXT,
    birth_date DATE,
    nationality TEXT,
    phone TEXT,
    email TEXT,
    employer_id UUID REFERENCES gmp_employers(id),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- Dedup: (nazwisko+imie znormalizowane, data urodzenia) tylko gdy jest data
CREATE UNIQUE INDEX IF NOT EXISTS uq_client_dedup
    ON gmp_clients(full_name_normalized, birth_date)
    WHERE birth_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_clients_employer ON gmp_clients(employer_id);
CREATE INDEX IF NOT EXISTS idx_clients_phone ON gmp_clients(phone);
CREATE INDEX IF NOT EXISTS idx_clients_name_norm ON gmp_clients(full_name_normalized);


-- ============ CASES (glowna tabela - karta sprawy) ============
CREATE TABLE IF NOT EXISTS gmp_cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_number TEXT,                     -- "26/0232" - NIE unique, bo duplikaty miedzy arkuszami
    znak_sprawy TEXT,                     -- "SOC-OCII.6151.1.7289.2024"

    -- Relacje
    client_id UUID REFERENCES gmp_clients(id) ON DELETE RESTRICT,
    employer_id UUID REFERENCES gmp_employers(id) ON DELETE SET NULL,
    assigned_to UUID REFERENCES gmp_staff(id),
    office_id UUID REFERENCES gmp_offices(id),
    department_id UUID REFERENCES gmp_office_departments(id),
    inspector_id UUID REFERENCES gmp_inspectors(id),

    -- Klasyfikacja
    status gmp_case_status DEFAULT 'lead',
    status_notes TEXT,
    stage gmp_case_stage,
    stage_notes TEXT,                     -- wolnotekstowy stage gdy nie pasuje do enum
    kind gmp_case_kind DEFAULT 'nowa_sprawa',
    case_type TEXT,
    case_type_notes TEXT,
    submission_method gmp_submission_method,
    category TEXT,

    -- Daty
    date_accepted DATE,
    date_submitted DATE,
    date_joined DATE,
    date_transfer_request DATE,
    date_transferred DATE,
    date_last_activity DATE,

    -- Czynnosci proceduralne
    ponaglenie_date DATE,
    skarga_date DATE,
    wszczecie_postepowania BOOLEAN DEFAULT FALSE,

    -- Finanse
    fee_amount NUMERIC(10,2),
    fee_notes TEXT,
    paragon BOOLEAN DEFAULT FALSE,

    -- Meta
    extra_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Import tracking
    import_source TEXT,
    import_source_row INTEGER,
    import_raw JSONB
);
CREATE INDEX IF NOT EXISTS idx_cases_client ON gmp_cases(client_id);
CREATE INDEX IF NOT EXISTS idx_cases_employer ON gmp_cases(employer_id);
CREATE INDEX IF NOT EXISTS idx_cases_assigned ON gmp_cases(assigned_to);
CREATE INDEX IF NOT EXISTS idx_cases_status ON gmp_cases(status);
CREATE INDEX IF NOT EXISTS idx_cases_stage ON gmp_cases(stage);
CREATE INDEX IF NOT EXISTS idx_cases_category ON gmp_cases(category);
CREATE INDEX IF NOT EXISTS idx_cases_date_last_activity ON gmp_cases(date_last_activity);
CREATE INDEX IF NOT EXISTS idx_cases_case_number ON gmp_cases(case_number);
CREATE INDEX IF NOT EXISTS idx_cases_znak_sprawy ON gmp_cases(znak_sprawy);


-- ============ CASE ACTIVITIES (historia dzialan) ============
CREATE TABLE IF NOT EXISTS gmp_case_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID REFERENCES gmp_cases(id) ON DELETE CASCADE,
    activity_type gmp_activity_type NOT NULL,
    content TEXT,
    metadata JSONB,
    created_by UUID REFERENCES gmp_staff(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_activities_case ON gmp_case_activities(case_id);
CREATE INDEX IF NOT EXISTS idx_activities_created_at ON gmp_case_activities(created_at DESC);

-- Trigger aktualizujacy cases.date_last_activity
CREATE OR REPLACE FUNCTION gmp_bump_case_last_activity() RETURNS TRIGGER AS $$
BEGIN
    UPDATE gmp_cases SET
        date_last_activity = NEW.created_at::date,
        updated_at = NOW()
    WHERE id = NEW.case_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_gmp_bump_case_last_activity ON gmp_case_activities;
CREATE TRIGGER trg_gmp_bump_case_last_activity
    AFTER INSERT ON gmp_case_activities
    FOR EACH ROW EXECUTE FUNCTION gmp_bump_case_last_activity();


-- ============ ORPHAN DECISIONS (decyzje bez dopasowanej sprawy) ============
CREATE TABLE IF NOT EXISTS gmp_orphan_decisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    raw_full_name TEXT,
    raw_birth_date TEXT,
    date_issued DATE,
    date_received DATE,
    date_delivered_to_client DATE,
    extra_notes TEXT,
    resolved_case_id UUID REFERENCES gmp_cases(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);


-- ============ TASKS ============
CREATE TABLE IF NOT EXISTS gmp_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID REFERENCES gmp_cases(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    assigned_to UUID REFERENCES gmp_staff(id),
    due_date DATE,
    status gmp_task_status DEFAULT 'pending',
    completion_note TEXT,
    created_by UUID REFERENCES gmp_staff(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_tasks_case ON gmp_tasks(case_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned ON gmp_tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date
    ON gmp_tasks(due_date) WHERE status != 'done';


-- ============ PAYMENTS + PLANS + INVOICES ============
CREATE TABLE IF NOT EXISTS gmp_payment_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID UNIQUE REFERENCES gmp_cases(id) ON DELETE CASCADE,
    total_amount NUMERIC(10,2) NOT NULL,
    payer_type gmp_payer_type NOT NULL,
    client_id UUID REFERENCES gmp_clients(id),
    employer_id UUID REFERENCES gmp_employers(id),
    installments_planned INTEGER DEFAULT 1,
    due_date DATE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS gmp_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID REFERENCES gmp_cases(id) ON DELETE CASCADE,
    payer_type gmp_payer_type NOT NULL,
    client_id UUID REFERENCES gmp_clients(id),
    employer_id UUID REFERENCES gmp_employers(id),

    kind gmp_payment_kind DEFAULT 'fee',
    amount NUMERIC(10,2) NOT NULL,
    method gmp_payment_method,
    payment_date DATE,
    installment_number INTEGER,
    total_installments INTEGER,

    paragon_issued BOOLEAN DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    import_source TEXT,
    import_raw JSONB
);
CREATE INDEX IF NOT EXISTS idx_payments_case ON gmp_payments(case_id);
CREATE INDEX IF NOT EXISTS idx_payments_payment_date ON gmp_payments(payment_date);

CREATE TABLE IF NOT EXISTS gmp_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID REFERENCES gmp_cases(id) ON DELETE SET NULL,
    employer_id UUID REFERENCES gmp_employers(id),
    client_id UUID REFERENCES gmp_clients(id),
    invoice_number TEXT,
    issue_date DATE,
    amount NUMERIC(10,2) NOT NULL,
    description TEXT,
    status gmp_invoice_status DEFAULT 'to_issue',
    sent_to TEXT,
    sent_at DATE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    import_source TEXT,
    import_raw JSONB
);
CREATE INDEX IF NOT EXISTS idx_invoices_employer ON gmp_invoices(employer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON gmp_invoices(status);


-- ============ SUBMISSIONS QUEUE (kolejka skladanych wnioskow) ============
CREATE TABLE IF NOT EXISTS gmp_submissions_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID REFERENCES gmp_cases(id) ON DELETE SET NULL,
    client_id UUID REFERENCES gmp_clients(id),
    office_id UUID REFERENCES gmp_offices(id),
    status TEXT DEFAULT 'pending',
    mos_number TEXT,
    pio_number TEXT,
    date_notification_sent DATE,
    scheduled_at TIMESTAMPTZ,
    ticket_number TEXT,
    transport_type TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    import_source TEXT,
    import_raw JSONB
);


-- ============ APPOINTMENTS - rozszerzenie istniejacej tabeli ============
ALTER TABLE gmp_appointments
    ADD COLUMN IF NOT EXISTS appointment_type gmp_appointment_type DEFAULT 'konsultacja';
ALTER TABLE gmp_appointments
    ADD COLUMN IF NOT EXISTS case_id UUID REFERENCES gmp_cases(id) ON DELETE SET NULL;
ALTER TABLE gmp_appointments
    ADD COLUMN IF NOT EXISTS office_id UUID REFERENCES gmp_offices(id);
ALTER TABLE gmp_appointments
    ADD COLUMN IF NOT EXISTS transport_type TEXT;
ALTER TABLE gmp_appointments
    ADD COLUMN IF NOT EXISTS ticket_number TEXT;
ALTER TABLE gmp_appointments
    ADD COLUMN IF NOT EXISTS staff_id UUID REFERENCES gmp_staff(id);
ALTER TABLE gmp_appointments
    ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES gmp_clients(id) ON DELETE SET NULL;


-- ============ DOCUMENTS ============
CREATE TABLE IF NOT EXISTS gmp_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID REFERENCES gmp_cases(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    storage_path TEXT,
    mime_type TEXT,
    file_size INTEGER,
    uploaded_by UUID REFERENCES gmp_staff(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS gmp_document_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    storage_path TEXT,
    category TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);


-- ============ TRUSTED PROFILE CREDENTIALS (gov.pl) ============
-- Dane EKSTREMALNIE wrazliwe. Osobna tabela + scisle RLS.
CREATE TABLE IF NOT EXISTS gmp_trusted_profile_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID UNIQUE REFERENCES gmp_clients(id) ON DELETE CASCADE,
    case_id UUID REFERENCES gmp_cases(id),
    -- TODO Faza 5: szyfrowanie via Supabase Vault/pgsodium
    -- Na razie plaintext ale RLS = tylko admin
    trusted_profile_login TEXT,
    trusted_profile_password TEXT,
    last_accessed_at TIMESTAMPTZ,
    last_accessed_by UUID REFERENCES gmp_staff(id),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
COMMENT ON TABLE gmp_trusted_profile_credentials IS
'DANE EKSTREMALNIE WRAZLIWE. Login/haslo gov.pl profilu zaufanego. RLS: tylko admin. UI: wymaga potwierdzenia przed wyswietleniem. Faza 5: szyfrowanie via pgsodium.';

CREATE TABLE IF NOT EXISTS gmp_credentials_access_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    credential_id UUID REFERENCES gmp_trusted_profile_credentials(id) ON DELETE CASCADE,
    accessed_by UUID REFERENCES gmp_staff(id),
    action TEXT CHECK (action IN ('view', 'create', 'update', 'delete')),
    accessed_at TIMESTAMPTZ DEFAULT NOW(),
    ip_address TEXT,
    user_agent TEXT
);


-- ============ VIEW: ALERTY BEZCZYNNOSCI ============
CREATE OR REPLACE VIEW gmp_case_alerts AS
SELECT
    c.id AS case_id,
    c.case_number,
    c.client_id,
    c.assigned_to,
    c.status,
    c.stage,
    c.date_last_activity,
    CURRENT_DATE - c.date_last_activity AS days_inactive,
    CASE
        WHEN c.date_last_activity IS NULL THEN 'never_active'
        WHEN CURRENT_DATE - c.date_last_activity > 30 THEN 'inactive_30'
        WHEN CURRENT_DATE - c.date_last_activity > 14 THEN 'inactive_14'
        ELSE 'ok'
    END AS inactivity_level
FROM gmp_cases c
WHERE c.status IN ('zlecona', 'aktywna');


-- ============ RLS (development mode: authenticated CRUD) ============
-- Zgodnie z P1 - otwarte dla dev, zakrecimy przed prod

DO $$
DECLARE
    t TEXT;
    policy_name TEXT;
BEGIN
    FOR t IN SELECT tablename FROM pg_tables
             WHERE schemaname='public'
               AND tablename IN (
                'gmp_offices', 'gmp_office_departments', 'gmp_inspectors',
                'gmp_staff', 'gmp_employers', 'gmp_clients',
                'gmp_cases', 'gmp_case_activities', 'gmp_orphan_decisions',
                'gmp_tasks', 'gmp_payments', 'gmp_payment_plans', 'gmp_invoices',
                'gmp_submissions_queue', 'gmp_documents', 'gmp_document_templates'
               )
    LOOP
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
        -- Drop if exists i utworz policy
        policy_name := 'authenticated_crud';
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', policy_name, t);
        EXECUTE format(
            'CREATE POLICY %I ON %I FOR ALL TO authenticated USING (true) WITH CHECK (true)',
            policy_name, t
        );
    END LOOP;
END $$;

-- Trusted profile credentials - scisle RLS
ALTER TABLE gmp_trusted_profile_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE gmp_trusted_profile_credentials FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_only_credentials" ON gmp_trusted_profile_credentials;
CREATE POLICY "admin_only_credentials" ON gmp_trusted_profile_credentials
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM gmp_staff s
            WHERE s.user_id = auth.uid() AND s.role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM gmp_staff s
            WHERE s.user_id = auth.uid() AND s.role = 'admin'
        )
    );

ALTER TABLE gmp_credentials_access_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_read_log" ON gmp_credentials_access_log;
CREATE POLICY "admin_read_log" ON gmp_credentials_access_log
    FOR SELECT TO authenticated
    USING (
        EXISTS (SELECT 1 FROM gmp_staff s WHERE s.user_id = auth.uid() AND s.role = 'admin')
    );
DROP POLICY IF EXISTS "auth_insert_log" ON gmp_credentials_access_log;
CREATE POLICY "auth_insert_log" ON gmp_credentials_access_log
    FOR INSERT TO authenticated WITH CHECK (true);


-- ============ COMMENTS ============
COMMENT ON TABLE gmp_cases IS 'Centralna tabela CRM - karta sprawy. Agreguje status, etap, strony, finanse, historie.';
COMMENT ON TABLE gmp_clients IS 'Cudzoziemcy - klienci kancelarii. Dedup po nazwisko+imie+data_urodzenia.';
COMMENT ON TABLE gmp_employers IS 'Pracodawcy. Dedup po name_normalized (lower+trim).';
COMMENT ON TABLE gmp_staff IS 'Pracownicy kancelarii. Aliasy dla matchowania imion z arkuszy Pawla.';
COMMENT ON TABLE gmp_case_activities IS 'Chronologiczna historia dzialan w sprawie. Trigger aktualizuje cases.date_last_activity.';
COMMENT ON TABLE gmp_orphan_decisions IS 'Historyczne decyzje bez dopasowanej sprawy (po imporcie z arkusza Odebrane decyzje).';
COMMENT ON VIEW gmp_case_alerts IS 'Alerty bezczynnosci: sprawy bez aktywnosci 14/30 dni.';
