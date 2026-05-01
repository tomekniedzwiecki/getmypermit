-- ============================================================================
-- Etap IV.1 — Pola proceduralne na gmp_cases
-- Cel: dane przebiegu sprawy (Pawel pkt 8 + 9 + B7)
-- ============================================================================

ALTER TABLE gmp_cases
    ADD COLUMN IF NOT EXISTS date_fingerprints DATE,
    ADD COLUMN IF NOT EXISTS date_summon DATE,
    ADD COLUMN IF NOT EXISTS date_decision DATE,
    ADD COLUMN IF NOT EXISTS decision_outcome gmp_decision_outcome,
    ADD COLUMN IF NOT EXISTS decision_outcome_notes TEXT,
    ADD COLUMN IF NOT EXISTS braki_formalne_status TEXT
        CHECK (braki_formalne_status IN ('brak', 'sa', 'uzupelnione')),
    ADD COLUMN IF NOT EXISTS odciski_status TEXT
        CHECK (odciski_status IN ('nie_dotyczy', 'do_pobrania', 'pobrane')),
    ADD COLUMN IF NOT EXISTS oplata_status TEXT
        CHECK (oplata_status IN ('brak', 'wniesiona', 'do_zwrotu'));

CREATE INDEX IF NOT EXISTS idx_cases_date_decision
    ON gmp_cases(date_decision DESC) WHERE date_decision IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cases_decision_outcome
    ON gmp_cases(decision_outcome) WHERE decision_outcome IS NOT NULL;

COMMENT ON COLUMN gmp_cases.date_fingerprints IS 'Data uzupełnienia odcisków (po osobistym stawiennictwie)';
COMMENT ON COLUMN gmp_cases.date_summon IS 'Data wezwania urzędu (różne od deadline_response)';
COMMENT ON COLUMN gmp_cases.date_decision IS 'Data wydania decyzji';
COMMENT ON COLUMN gmp_cases.decision_outcome IS 'Wynik decyzji - pozytywna/negatywna/czesciowo/umorzenie/odmowa/inna';
COMMENT ON COLUMN gmp_cases.decision_outcome_notes IS 'Notatki / uzasadnienie decyzji';
COMMENT ON COLUMN gmp_cases.braki_formalne_status IS 'Status braków formalnych wniosku';
COMMENT ON COLUMN gmp_cases.odciski_status IS 'Status odcisków (dla niektórych typów spraw)';
COMMENT ON COLUMN gmp_cases.oplata_status IS 'Status opłaty urzędowej';
