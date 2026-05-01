-- ============================================================================
-- Etap VI.1 — Enum gmp_legal_status
-- Cel: status legalności pobytu/pracy: zielony / żółty / czerwony / brak (Pawel pkt 11/B6)
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'gmp_legal_status') THEN
        CREATE TYPE gmp_legal_status AS ENUM ('zielony', 'zolty', 'czerwony', 'brak');
    END IF;
END$$;

COMMENT ON TYPE gmp_legal_status IS 'Status legalności (pobyt/praca): zielony=ok, zolty=kończy się 30d, czerwony=przeterminowany, brak=nieznany';
