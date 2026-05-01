-- ============================================================================
-- Etap V.1 — Enum gmp_case_group_type
-- Cel: typ grupy spraw (pracodawca / rodzina / projekt / rozliczenie / inna)
-- Pawel pkt 12, 13, 14 + B11
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'gmp_case_group_type') THEN
        CREATE TYPE gmp_case_group_type AS ENUM (
            'pracodawca',
            'rodzina',
            'projekt',
            'rozliczenie_zbiorcze',
            'inna'
        );
    END IF;
END$$;

COMMENT ON TYPE gmp_case_group_type IS 'Typ grupy spraw — łączy 2+ spraw związanych ze sobą (pracodawca/rodzina/etc).';
