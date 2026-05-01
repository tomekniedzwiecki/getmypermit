-- ============================================================================
-- Etap IV.1 — Enum gmp_decision_outcome
-- Cel: typ wyniku decyzji urzędowej (Pawel pkt 8/9, B7)
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'gmp_decision_outcome') THEN
        CREATE TYPE gmp_decision_outcome AS ENUM (
            'pozytywna',
            'negatywna',
            'czesciowo_pozytywna',
            'umorzenie',
            'odmowa',
            'inna'
        );
    END IF;
END$$;

COMMENT ON TYPE gmp_decision_outcome IS 'Wynik decyzji urzędowej (sub-status zakończenia sprawy). Decision D1 z roadmap v3.';
