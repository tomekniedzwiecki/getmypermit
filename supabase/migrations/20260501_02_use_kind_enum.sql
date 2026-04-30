-- ============================================================================
-- Etap I — § 1.2 — Użycie nowych wartości enum + kind_variant + backfill
-- ============================================================================
-- Wymaga wcześniejszego wykonania 20260501_01_extend_kind_enum.sql.
-- ============================================================================

-- Dodaj nullable pole kind_variant (np. przystapienie_kompletne, przystapienie_z_brakami)
ALTER TABLE gmp_cases ADD COLUMN IF NOT EXISTS kind_variant TEXT;

CREATE INDEX IF NOT EXISTS idx_cases_kind_variant ON gmp_cases(kind_variant)
    WHERE kind_variant IS NOT NULL;

COMMENT ON COLUMN gmp_cases.kind_variant IS
'Wariant trybu sprawy. Dla kind=przystapienie_do_sprawy: przystapienie_kompletne / przystapienie_z_brakami. Wolne pole.';

-- Backfill istniejących spraw bez kind (R7)
-- Założenie: jeśli sprawa była zaakceptowana (date_accepted IS NOT NULL), to była "nowa_sprawa"
UPDATE gmp_cases SET kind = 'nowa_sprawa'
    WHERE kind IS NULL AND date_accepted IS NOT NULL;

-- Sprawdzenie po wykonaniu (komentarz informacyjny):
-- SELECT kind, COUNT(*) FROM gmp_cases GROUP BY kind ORDER BY 2 DESC;
