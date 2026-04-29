-- Soft-save dla landing form: zapisuj odpowiedz po KAZDYM kroku, nie czekaj na phone/finish.
-- Frontend wysyla partial save po kazdym Continue (step 1: situation, step 2: phone, etc).
-- Edge function robi upsert po form_session_id - kolejne kroki UPDATE'uja istniejacy rekord.
-- Jak user dotrze do konca, ten sam rekord jest update'owany do is_partial=false z full data.

ALTER TABLE permit_leads
    ADD COLUMN IF NOT EXISTS is_partial BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS form_session_id TEXT,
    ADD COLUMN IF NOT EXISTS last_step_reached TEXT;

-- phone NOT NULL blokowal partial save na step 1 (przed phone step). Soft-save robi insert
-- juz po wybraniu situation - phone jeszcze pusty. NOT NULL wymuszamy aplikacyjnie tylko
-- na full leadzie (is_partial=false).
ALTER TABLE permit_leads ALTER COLUMN phone DROP NOT NULL;

-- Unique index na form_session_id (gdy nie NULL) zeby upsert dzialal w edge function.
-- Stare leady (sprzed migracji) nie maja form_session_id -> partial unique pomija je.
CREATE UNIQUE INDEX IF NOT EXISTS uq_permit_leads_form_session_id
    ON permit_leads(form_session_id)
    WHERE form_session_id IS NOT NULL;

-- Filtrowanie po partial (CRM domyslnie pokazuje tylko full)
CREATE INDEX IF NOT EXISTS idx_permit_leads_is_partial
    ON permit_leads(is_partial, created_at DESC)
    WHERE is_partial = false;

-- Aktualizacja widoku gmp_leads_overview - dorzucamy is_partial i last_step_reached
DROP VIEW IF EXISTS gmp_leads_overview;
CREATE VIEW gmp_leads_overview AS
SELECT
    l.*,
    s.full_name AS assigned_name,
    s.color AS assigned_color,
    c.case_number AS converted_case_number,
    EXTRACT(DAY FROM NOW() - l.created_at)::INT AS days_since_created,
    CASE WHEN l.last_contact_at IS NOT NULL
        THEN EXTRACT(DAY FROM NOW() - l.last_contact_at)::INT
        ELSE NULL END AS days_since_contact,
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

COMMENT ON COLUMN permit_leads.is_partial IS
    'TRUE = lead zapisany po phone step (soft-save), nie ma jeszcze name/email/consent. Po dokonczeniu formularza upsert ustawia FALSE.';
COMMENT ON COLUMN permit_leads.form_session_id IS
    'UUID sesji formularza z sessionStorage. Klucz dedupu dla partial→full upsert. Generowany w gtag.js boot.';
COMMENT ON COLUMN permit_leads.last_step_reached IS
    'ID kroku formularza (1, 2, 3, intent, waiting-time, details, success, not-qualified, info-only) — gdzie user porzucil/skonczyl.';
