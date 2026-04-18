-- Rozszerzenie permit_leads o integracje z CRM
-- Landing page (getmypermit.pl) pisze do permit_leads - tabela zostaje.
-- Dodajemy pola CRM: assigned_to, qualification_checklist, konwersja do gmp_cases.

ALTER TABLE permit_leads
    ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES gmp_staff(id),
    ADD COLUMN IF NOT EXISTS converted_case_id UUID REFERENCES gmp_cases(id),
    ADD COLUMN IF NOT EXISTS converted_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS disqualification_reason TEXT,
    ADD COLUMN IF NOT EXISTS qualification_checklist JSONB DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS last_contact_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS next_followup_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS first_name TEXT,
    ADD COLUMN IF NOT EXISTS last_name TEXT;

-- Index dla szybszego filtrowania po assignee i statusie
CREATE INDEX IF NOT EXISTS idx_permit_leads_assigned ON permit_leads(assigned_to);
CREATE INDEX IF NOT EXISTS idx_permit_leads_status_created ON permit_leads(status, created_at DESC);

-- Check constraint - rozszerzamy dozwolone statusy
-- new (swiezy z formularza) -> contacted (proba kontaktu) -> qualified (spelnia kryteria)
-- -> proposal (oferta wyslana) -> won (podpisana umowa, utworzona sprawa)
-- -> lost (brak odpowiedzi / rezygnacja) lub disqualified (nie spelnia kryteriow)
DO $$ BEGIN
    ALTER TABLE permit_leads DROP CONSTRAINT IF EXISTS permit_leads_status_check;
    ALTER TABLE permit_leads ADD CONSTRAINT permit_leads_status_check
        CHECK (status IN ('new', 'contacted', 'qualified', 'proposal', 'won', 'lost', 'disqualified', 'converted'));
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- Migracja starych statusow: 'converted' -> 'won' dla spojnosci
UPDATE permit_leads SET status = 'won' WHERE status = 'converted' AND converted_case_id IS NULL;

-- View z danymi leada + przypisany staff + link do case (dla list/kanban)
DROP VIEW IF EXISTS gmp_leads_overview;
CREATE VIEW gmp_leads_overview AS
SELECT
    l.*,
    s.full_name AS assigned_name,
    s.color AS assigned_color,
    c.case_number AS converted_case_number,
    -- Dni od utworzenia
    EXTRACT(DAY FROM NOW() - l.created_at)::INT AS days_since_created,
    -- Dni od ostatniego kontaktu
    CASE WHEN l.last_contact_at IS NOT NULL
        THEN EXTRACT(DAY FROM NOW() - l.last_contact_at)::INT
        ELSE NULL END AS days_since_contact,
    -- Szacowana wartosc dla prognozy (na podstawie permit_type)
    CASE
        WHEN l.permit_type = 'citizenship' THEN 8000
        WHEN l.permit_type = 'permanent' THEN 5000
        WHEN l.permit_type = 'eu-resident' THEN 5000
        WHEN l.permit_type IN ('temporary', 'residence', 'work') THEN 3500
        ELSE 3000
    END AS estimated_value
FROM permit_leads l
LEFT JOIN gmp_staff s ON s.id = l.assigned_to
LEFT JOIN gmp_cases c ON c.id = l.converted_case_id;

GRANT SELECT ON gmp_leads_overview TO authenticated, anon;

-- RPC: Konwersja leada do sprawy CRM
-- Tworzy gmp_clients (jesli nie istnieje juz po emailu/tel) i gmp_cases,
-- aktualizuje lead: status=won, converted_case_id, converted_at
CREATE OR REPLACE FUNCTION gmp_convert_lead_to_case(lead_id UUID)
RETURNS TABLE(case_id UUID, client_id UUID) AS $$
DECLARE
    v_lead permit_leads%ROWTYPE;
    v_client_id UUID;
    v_case_id UUID;
    v_first_name TEXT;
    v_last_name TEXT;
    v_staff_id UUID;
BEGIN
    SELECT * INTO v_lead FROM permit_leads WHERE id = lead_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Lead not found: %', lead_id; END IF;

    -- Imie/nazwisko: explicit pole albo split name
    v_first_name := COALESCE(v_lead.first_name, split_part(v_lead.name, ' ', 1), '—');
    v_last_name := COALESCE(
        v_lead.last_name,
        CASE WHEN position(' ' IN COALESCE(v_lead.name, '')) > 0
            THEN substring(v_lead.name FROM position(' ' IN v_lead.name) + 1)
            ELSE '—' END
    );

    -- Szukamy istniejacego klienta po telefonie lub emailu
    IF v_lead.phone IS NOT NULL THEN
        SELECT id INTO v_client_id FROM gmp_clients
        WHERE phone = v_lead.phone LIMIT 1;
    END IF;
    IF v_client_id IS NULL AND v_lead.email IS NOT NULL THEN
        SELECT id INTO v_client_id FROM gmp_clients
        WHERE email = v_lead.email LIMIT 1;
    END IF;

    -- Tworzymy klienta jesli nie znaleziono
    IF v_client_id IS NULL THEN
        INSERT INTO gmp_clients (last_name, first_name, phone, email, notes)
        VALUES (v_last_name, v_first_name, v_lead.phone, v_lead.email,
            format('Z formularza getmypermit.pl. Szczegoly: %s', COALESCE(v_lead.details, '')))
        RETURNING id INTO v_client_id;
    END IF;

    -- Opiekun: z leada, albo current staff
    v_staff_id := v_lead.assigned_to;

    -- Tworzymy sprawe
    INSERT INTO gmp_cases (
        client_id, assigned_to, status, kind, case_type, category,
        date_accepted, import_source, status_notes
    ) VALUES (
        v_client_id, v_staff_id, 'zlecona', 'nowa_sprawa',
        CASE v_lead.permit_type
            WHEN 'citizenship' THEN 'Obywatelstwo polskie'
            WHEN 'permanent' THEN 'Pobyt staly'
            WHEN 'eu-resident' THEN 'Rezydent dlugoterminowy UE'
            WHEN 'temporary' THEN 'Pobyt czasowy'
            WHEN 'work' THEN 'Pobyt czasowy i praca'
            WHEN 'residence' THEN 'Pobyt czasowy'
            ELSE 'Pobyt czasowy' END,
        CASE v_lead.permit_type
            WHEN 'citizenship' THEN 'pozostale'
            WHEN 'eu-resident' THEN 'rezydent'
            ELSE 'pobyt' END,
        CURRENT_DATE, 'lead_form',
        format('Lead score: %s (%s). Scenariusz: %s. Intent: %s. Details: %s',
            COALESCE(v_lead.lead_score::text, '-'),
            COALESCE(v_lead.lead_type, '-'),
            COALESCE(v_lead.situation, '-'),
            COALESCE(v_lead.intent, '-'),
            COALESCE(v_lead.details, '-'))
    ) RETURNING id INTO v_case_id;

    -- Ustaw leada jako won + przypisz case_id
    UPDATE permit_leads SET
        status = 'won',
        converted_case_id = v_case_id,
        converted_at = NOW()
    WHERE id = lead_id;

    -- Initial activity w sprawie
    INSERT INTO gmp_case_activities (case_id, activity_type, content, created_by)
    VALUES (v_case_id, 'note',
        format('Utworzono z leada (getmypermit.pl). Telefon: %s, Email: %s',
            COALESCE(v_lead.phone, '-'), COALESCE(v_lead.email, '-')),
        v_staff_id);

    RETURN QUERY SELECT v_case_id, v_client_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION gmp_convert_lead_to_case(UUID) TO authenticated;
