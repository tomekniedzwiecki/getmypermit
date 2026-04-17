-- Rozszerzenia schema wg uwag Pawła (sekcje 5, 6, 8, 10 z CRM.docx)

-- 1. Pole "kierownik" w karcie sprawy (organ nadrzędny nad inspektorem)
ALTER TABLE gmp_cases
    ADD COLUMN IF NOT EXISTS kierownik TEXT;

-- 2. Rozróżnienie przyczyny braku aktywności
DO $$ BEGIN
    CREATE TYPE gmp_inactivity_reason AS ENUM (
        'none',              -- sprawa aktywna, brak zaleglosci
        'brak_pracownika',   -- pracownik kancelarii nic nie robi
        'brak_urzedu',       -- urzad nie reaguje
        'brak_klienta',      -- klient nie dostarcza dokumentow
        'brak_dokumentow',   -- sprawa czeka na konkretne dokumenty
        'inne'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE gmp_cases
    ADD COLUMN IF NOT EXISTS inactivity_reason gmp_inactivity_reason DEFAULT 'none',
    ADD COLUMN IF NOT EXISTS inactivity_note TEXT;

-- 3. Ostatnia notatka - generowany widok na podstawie activities
-- (nie potrzebne kolumny - zrobimy SQL JOIN w UI)

-- 4. Document templates UI - tabela juz jest (gmp_document_templates),
-- ale dodajemy link do sprawy (template_id w gmp_documents)
ALTER TABLE gmp_documents
    ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES gmp_document_templates(id);

-- 5. Faktura automatyczna przy pracodawcy - kolumna auto_invoice_on_close
-- Zamiast tego: triggery ktore beda dodawac fakture gdy sprawa z pracodawca ma status=zakonczona
-- Na razie zostawiamy ręczne dodawanie w UI.

-- 6. View z rozszerzonym alertem - inactivity_reason
DROP VIEW IF EXISTS gmp_case_alerts;
CREATE VIEW gmp_case_alerts AS
SELECT
    c.id AS case_id,
    c.case_number,
    c.client_id,
    c.assigned_to,
    c.status,
    c.stage,
    c.inactivity_reason,
    c.inactivity_note,
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

COMMENT ON COLUMN gmp_cases.kierownik IS 'Kierownik urzedu/oddzialu (organ nadrzedny nad inspektorem)';
COMMENT ON COLUMN gmp_cases.inactivity_reason IS 'Powod braku aktywnosci: pracownik/urzad/klient/dokumenty';
