-- ============================================================================
-- Etap I — § 1.6 — Backfill legacy case_type → category (D2)
-- ============================================================================
-- Mapowanie oparte na rzeczywistych danych z audytu (2026-04-30, sekcja 3.1):
--   - Tylko 4 sprawy mają case_type bez category (work_permit×2, PRACA×1, Praca×1)
--   - 10 spraw ma category=NULL bez case_type
-- Czyli backfill jest mały — głównie "for safety".
-- ============================================================================

-- Sprawy z case_type='work_permit' (legacy import z migracji)
UPDATE gmp_cases SET category = 'pobyt_praca'
    WHERE category IS NULL
      AND (case_type ILIKE 'work_permit' OR case_type ILIKE 'praca');

-- Inne ad-hoc dopasowania na podstawie case_type (jeśli ktoś coś dodał ręcznie)
UPDATE gmp_cases SET category = 'pobyt_praca'
    WHERE category IS NULL
      AND case_type ILIKE '%pobyt%praca%';

UPDATE gmp_cases SET category = 'wymiana_karty'
    WHERE category IS NULL
      AND case_type ILIKE '%wymiana%karty%';

UPDATE gmp_cases SET category = 'pobyt_studia'
    WHERE category IS NULL
      AND (case_type ILIKE '%studia%' OR case_type ILIKE '%student%');

UPDATE gmp_cases SET category = 'pobyt_staly_malzenstwo'
    WHERE category IS NULL
      AND case_type ILIKE '%pobyt stały%małżeń%';

UPDATE gmp_cases SET category = 'pobyt_staly_karta_polaka'
    WHERE category IS NULL
      AND case_type ILIKE '%karta polaka%';

UPDATE gmp_cases SET category = 'rezydent'
    WHERE category IS NULL
      AND (case_type ILIKE '%rezydent%' OR case_type ILIKE '%długoterminow%');

UPDATE gmp_cases SET category = 'pobyt_laczenie_rodzina'
    WHERE category IS NULL
      AND case_type ILIKE '%łączenie%rodzin%';

UPDATE gmp_cases SET category = 'pobyt_blue_card'
    WHERE category IS NULL
      AND (case_type ILIKE '%blue card%' OR case_type ILIKE '%niebieska karta%');

UPDATE gmp_cases SET category = 'pobyt_konkubinat'
    WHERE category IS NULL
      AND case_type ILIKE '%konkubinat%';

-- ============================================================================
-- Sprawozdanie końcowe
-- ============================================================================
-- Po wykonaniu sprawdzić:
--   SELECT COUNT(*) FILTER (WHERE category IS NULL) AS still_null,
--          COUNT(*) AS total
--   FROM gmp_cases;
-- Spodziewane: still_null < 5 (z audytu — 6 spraw było status=lead bez nigdzie nie określonej kategorii)
