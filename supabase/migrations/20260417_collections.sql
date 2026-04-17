-- Modul windykacji (Accounts Receivable)

-- Poziomy eskalacji
DO $$ BEGIN CREATE TYPE gmp_collection_level AS ENUM (
    'new',              -- nowa, nie rozpoczeto windykacji
    'reminder_soft',    -- miekkie przypomnienie (T+7)
    'reminder_firm',    -- stanowcze przypomnienie (T+14)
    'demand_1',         -- wezwanie #1 (T+21)
    'demand_final',     -- ostateczne wezwanie (T+30)
    'pre_court',        -- przygotowanie do sadu (T+45)
    'epu',              -- w e-sadzie (EPU)
    'court',            -- sprawa w sadzie
    'settled',          -- odzyskane
    'write_off'         -- odpisane
); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE gmp_collection_status AS ENUM (
    'active',           -- aktywna windykacja
    'paused',           -- wstrzymana (np. chory klient, obietnica)
    'paid',             -- zaplacono w calosci
    'partial_paid',     -- czesc zaplacona
    'written_off',      -- odpisane jako strata
    'litigation',       -- w sadzie
    'recovered_external' -- odzyskane przez firme zewnetrzna (cesja)
); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE gmp_collection_activity_type AS ENUM (
    'phone_call',        -- telefon
    'email',             -- wyslany email
    'sms',               -- wyslany SMS
    'whatsapp',          -- whatsapp
    'letter',            -- list polecony
    'letter_certified',  -- list polecony za zwrotnym potwierdzeniem
    'meeting',           -- spotkanie
    'note',              -- notatka ogolna
    'promise_to_pay',    -- klient obiecal zaplacic
    'payment_plan',      -- ustalono plan platnosci
    'escalation',        -- zmiana poziomu eskalacji
    'court_filing',      -- wniesienie pozwu
    'info_request'       -- prosba o info/dokumenty
); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE gmp_collection_activity_result AS ENUM (
    'no_answer',         -- brak odpowiedzi
    'contact_made',      -- udalo sie skontaktowac
    'promised',          -- obiecal zaplacic
    'refused',           -- odmowa
    'paid_partial',      -- zaplacono czesc
    'paid_full',         -- zaplacono calosc
    'disputed',          -- klient kwestionuje
    'wrong_contact',     -- zly telefon/email
    'deceased',          -- klient nie zyje
    'other'
); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Tabela gmp_collections - 1 rekord per sprawa w windykacji
CREATE TABLE IF NOT EXISTS gmp_collections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID UNIQUE NOT NULL REFERENCES gmp_cases(id) ON DELETE CASCADE,

    status gmp_collection_status NOT NULL DEFAULT 'active',
    level gmp_collection_level NOT NULL DEFAULT 'new',

    -- Przypisanie
    assigned_to UUID REFERENCES gmp_staff(id),

    -- Kluczowe daty
    first_due_date DATE,           -- kiedy powinno byc zaplacone (obliczane z ewidencji)
    last_contact_at TIMESTAMPTZ,
    next_action_at TIMESTAMPTZ,    -- kiedy nastepna proba
    promise_to_pay_date DATE,
    promise_to_pay_amount NUMERIC(10,2),
    promise_broken_count INTEGER DEFAULT 0,

    -- Metryki
    total_due NUMERIC(10,2) NOT NULL,         -- snapshot w momencie wejscia
    amount_recovered NUMERIC(10,2) DEFAULT 0, -- ile odzyskano od wejscia
    interest_accrued NUMERIC(10,2) DEFAULT 0, -- narosle odsetki
    probability_score INTEGER DEFAULT 50 CHECK (probability_score BETWEEN 0 AND 100),
    priority_score INTEGER DEFAULT 50,        -- aging x kwota x probability

    -- Akcje
    attempted_calls INTEGER DEFAULT 0,
    attempted_emails INTEGER DEFAULT 0,
    attempted_letters INTEGER DEFAULT 0,

    -- Flaga EPU
    epu_eligible BOOLEAN DEFAULT FALSE,
    epu_filed_at DATE,
    epu_case_number TEXT,

    -- Ton komunikacji
    tone TEXT DEFAULT 'neutral' CHECK (tone IN ('friendly', 'neutral', 'firm', 'severe')),

    -- Notatki windykatora
    internal_notes TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_collections_case ON gmp_collections(case_id);
CREATE INDEX IF NOT EXISTS idx_collections_assigned ON gmp_collections(assigned_to);
CREATE INDEX IF NOT EXISTS idx_collections_status ON gmp_collections(status);
CREATE INDEX IF NOT EXISTS idx_collections_level ON gmp_collections(level);
CREATE INDEX IF NOT EXISTS idx_collections_next_action ON gmp_collections(next_action_at) WHERE status='active';
CREATE INDEX IF NOT EXISTS idx_collections_promise ON gmp_collections(promise_to_pay_date) WHERE promise_to_pay_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_collections_priority ON gmp_collections(priority_score DESC) WHERE status='active';


-- Activities - log wszystkich kontaktow/prob
CREATE TABLE IF NOT EXISTS gmp_collection_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    collection_id UUID NOT NULL REFERENCES gmp_collections(id) ON DELETE CASCADE,
    case_id UUID NOT NULL REFERENCES gmp_cases(id) ON DELETE CASCADE,

    activity_type gmp_collection_activity_type NOT NULL,
    direction TEXT CHECK (direction IN ('outbound', 'inbound')) DEFAULT 'outbound',

    subject TEXT,         -- tytul (dla email/letter)
    content TEXT,         -- tresc lub notatka z rozmowy
    result gmp_collection_activity_result,

    -- Promise-to-pay details
    promise_amount NUMERIC(10,2),
    promise_date DATE,

    -- Nastepny follow-up
    followup_at TIMESTAMPTZ,

    -- Metadane
    template_used UUID,                        -- reference to template
    metadata JSONB,                            -- kwoty odsetek, PDF path itp.

    created_by UUID REFERENCES gmp_staff(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_col_act_collection ON gmp_collection_activities(collection_id);
CREATE INDEX IF NOT EXISTS idx_col_act_case ON gmp_collection_activities(case_id);
CREATE INDEX IF NOT EXISTS idx_col_act_created ON gmp_collection_activities(created_at DESC);


-- Szablony komunikatow (email/sms/list)
CREATE TABLE IF NOT EXISTS gmp_collection_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    escalation_level gmp_collection_level NOT NULL,
    channel TEXT CHECK (channel IN ('email', 'sms', 'letter', 'letter_certified')) NOT NULL,
    tone TEXT DEFAULT 'neutral' CHECK (tone IN ('friendly', 'neutral', 'firm', 'severe')),

    subject TEXT,
    body_template TEXT NOT NULL,  -- placeholdery: {client_name} {amount} {due_date} {case_number} {days_overdue} {interest}

    is_active BOOLEAN DEFAULT TRUE,
    language TEXT DEFAULT 'pl',

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);


-- RLS
ALTER TABLE gmp_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE gmp_collection_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE gmp_collection_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_crud" ON gmp_collections;
CREATE POLICY "authenticated_crud" ON gmp_collections FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "authenticated_crud" ON gmp_collection_activities;
CREATE POLICY "authenticated_crud" ON gmp_collection_activities FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "authenticated_crud" ON gmp_collection_templates;
CREATE POLICY "authenticated_crud" ON gmp_collection_templates FOR ALL TO authenticated USING (true) WITH CHECK (true);


-- Widok zbiorczy
CREATE OR REPLACE VIEW gmp_collection_overview AS
SELECT
    c.id AS collection_id,
    c.case_id,
    c.status,
    c.level,
    c.assigned_to,
    c.last_contact_at,
    c.next_action_at,
    c.promise_to_pay_date,
    c.promise_to_pay_amount,
    c.total_due,
    c.amount_recovered,
    c.probability_score,
    c.priority_score,
    c.tone,
    ca.case_number,
    ca.znak_sprawy,
    ca.client_id,
    ca.employer_id,
    ca.fee_amount,
    ca.date_accepted,
    ca.date_last_activity,
    ca.status AS case_status,
    cl.last_name,
    cl.first_name,
    cl.phone,
    cl.email,
    cl.birth_date,
    em.name AS employer_name,
    em.nip AS employer_nip,
    em.contact_phone AS employer_phone,
    em.contact_email AS employer_email,
    s.full_name AS assigned_name,
    COALESCE((SELECT SUM(amount) FROM gmp_payments WHERE case_id = c.case_id), 0) AS total_paid,
    (c.total_due - COALESCE((SELECT SUM(amount) FROM gmp_payments WHERE case_id = c.case_id), 0)) AS remaining_amount,
    (CURRENT_DATE - ca.date_accepted) AS days_since_accepted
FROM gmp_collections c
JOIN gmp_cases ca ON ca.id = c.case_id
LEFT JOIN gmp_clients cl ON cl.id = ca.client_id
LEFT JOIN gmp_employers em ON em.id = ca.employer_id
LEFT JOIN gmp_staff s ON s.id = c.assigned_to;


-- Seed 6 domyslnych szablonow (PL)
INSERT INTO gmp_collection_templates (name, escalation_level, channel, tone, subject, body_template) VALUES
(
    'Przyjazne przypomnienie (email)', 'reminder_soft', 'email', 'friendly',
    'Przypomnienie o płatności - sprawa {case_number}',
    'Szanowny/a {client_name},

Przypominamy, że termin płatności za usługi w sprawie {case_number} upłynął {due_date} (opóźnienie: {days_overdue} dni).

Kwota do zapłaty: {amount} PLN
Numer rachunku: [uzupełnij]

Jeśli płatność została już dokonana — prosimy o zignorowanie tego przypomnienia.

W razie pytań prosimy o kontakt.

Z poważaniem,
Kancelaria GetMyPermit'
),
(
    'Stanowcze przypomnienie (email)', 'reminder_firm', 'email', 'firm',
    'PILNE: Zaległa płatność za sprawę {case_number}',
    'Szanowny/a {client_name},

Uprzejmie informujemy, że do dnia dzisiejszego nie otrzymaliśmy płatności za usługi w sprawie {case_number}.

Szczegóły zaległości:
- Kwota główna: {amount} PLN
- Odsetki ustawowe za opóźnienie: {interest} PLN
- Łączna kwota: {total} PLN
- Dni opóźnienia: {days_overdue}

Prosimy o pilne uregulowanie należności w terminie 7 dni od otrzymania wiadomości.

W przypadku braku płatności będziemy zmuszeni podjąć dalsze kroki prawne.

Z poważaniem,
Kancelaria GetMyPermit'
),
(
    'Wezwanie do zapłaty #1 (list)', 'demand_1', 'letter_certified', 'firm',
    'WEZWANIE DO ZAPŁATY',
    'WEZWANIE DO ZAPŁATY

{client_name}
[adres klienta]

Kancelaria GetMyPermit wzywa Pana/Panią do zapłaty kwoty {total} PLN (słownie: {amount_words}) tytułem nieopłaconych usług prawnych w sprawie {case_number}.

Szczegóły należności:
- Należność główna: {amount} PLN
- Termin wymagalności: {due_date}
- Dni opóźnienia: {days_overdue}
- Odsetki ustawowe za opóźnienie (stawka 11,25% rocznie): {interest} PLN

Termin zapłaty: 14 dni od daty doręczenia niniejszego wezwania.

Rachunek do wpłaty: [uzupełnij]

W przypadku niezapłacenia w wyznaczonym terminie wystąpimy na drogę postępowania sądowego z kosztami procesu, które powiększą dochodzoną kwotę.

Zgodnie z art. 481 § 1 KC za czas opóźnienia naliczane są dalsze odsetki ustawowe.

[Miejscowość], {today}

..................................
Podpis'
),
(
    'Ostateczne wezwanie do zapłaty', 'demand_final', 'letter_certified', 'severe',
    'OSTATECZNE PRZEDSĄDOWE WEZWANIE DO ZAPŁATY',
    'OSTATECZNE PRZEDSĄDOWE WEZWANIE DO ZAPŁATY

{client_name}

Pomimo wcześniejszych wezwań nie otrzymaliśmy należności za sprawę {case_number}.

Łączna kwota do zapłaty:
- Należność główna: {amount} PLN
- Odsetki za opóźnienie ({days_overdue} dni): {interest} PLN
- RAZEM: {total} PLN

WYZNACZAMY OSTATECZNY 7-DNIOWY TERMIN ZAPŁATY.

Po upływie tego terminu sprawa zostanie skierowana do Sądu Rejonowego Lublin-Zachód w Lublinie (Elektroniczne Postępowanie Upominawcze) bez dalszych uprzedzeń.

Dłużnik zostanie obciążony:
- Kosztami sądowymi (1,25% wartości sporu)
- Zastępstwem procesowym
- Kosztami komornika w przypadku egzekucji
- Dalszymi odsetkami za opóźnienie

Informacja o zadłużeniu może zostać przekazana do Biur Informacji Gospodarczej (BIG).

[Miejscowość], {today}

..................................
Podpis'
),
(
    'SMS przypomnienie', 'reminder_soft', 'sms', 'friendly',
    NULL,
    'GetMyPermit: Przypominamy o płatności {amount}zł za sprawę {case_number}. Opóźnienie {days_overdue} dni. Tel. kontaktowy: [nr]. Prosimy o uregulowanie.'
),
(
    'SMS stanowczy', 'reminder_firm', 'sms', 'firm',
    NULL,
    'UWAGA: Zaległa płatność {total}zł (z odsetkami) za sprawę {case_number}. Opóźnienie {days_overdue} dni. Prosimy o PILNĄ wpłatę - groźba sprawy sądowej. GetMyPermit.'
)
ON CONFLICT DO NOTHING;
