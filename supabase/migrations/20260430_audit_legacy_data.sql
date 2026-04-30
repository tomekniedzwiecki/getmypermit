-- ============================================================================
-- AUDIT RAPORT — Pawel Roadmap v3.2 — Etap 0.5.3
-- ============================================================================
-- READ-ONLY raport stanu istniejących danych przed migracjami Etapu I.
-- Cel: zorientować się w mappingu legacy `case_type` → nowego `category`.
--
-- Wykonanie: w SQL Editor Supabase. Wszystkie SELECT, brak UPDATE/DELETE.
--    https://gfwsdrbywgmceateubyq.supabase.co/project/_/sql
--
-- Po wykonaniu: na podstawie wyników zaprojektować migrację 20260501_06_backfill_categories.sql
-- ============================================================================

-- ============================================================================
-- 1. Liczność spraw per status / kind / party_type
-- ============================================================================
\echo '=== 1.1 Sprawy per status ==='
SELECT status, COUNT(*) AS n FROM gmp_cases GROUP BY status ORDER BY n DESC;

\echo ''
\echo '=== 1.2 Sprawy per kind ==='
SELECT kind, COUNT(*) AS n FROM gmp_cases GROUP BY kind ORDER BY n DESC NULLS LAST;

\echo ''
\echo '=== 1.3 Sprawy per party_type ==='
SELECT party_type, COUNT(*) AS n FROM gmp_cases GROUP BY party_type ORDER BY n DESC NULLS LAST;

-- ============================================================================
-- 2. Brakujące kluczowe pola
-- ============================================================================
\echo ''
\echo '=== 2.1 Brakujące pola krytyczne ==='
SELECT
    'kind=NULL' AS field,
    COUNT(*) FILTER (WHERE kind IS NULL) AS n,
    COUNT(*) AS total,
    ROUND(COUNT(*) FILTER (WHERE kind IS NULL)::numeric / COUNT(*) * 100, 1) AS pct
FROM gmp_cases
UNION ALL
SELECT 'category=NULL', COUNT(*) FILTER (WHERE category IS NULL), COUNT(*),
    ROUND(COUNT(*) FILTER (WHERE category IS NULL)::numeric / COUNT(*) * 100, 1)
FROM gmp_cases
UNION ALL
SELECT 'case_type ale NULL category',
    COUNT(*) FILTER (WHERE category IS NULL AND case_type IS NOT NULL), COUNT(*),
    ROUND(COUNT(*) FILTER (WHERE category IS NULL AND case_type IS NOT NULL)::numeric / COUNT(*) * 100, 1)
FROM gmp_cases
UNION ALL
SELECT 'submission_method=NULL', COUNT(*) FILTER (WHERE submission_method IS NULL), COUNT(*),
    ROUND(COUNT(*) FILTER (WHERE submission_method IS NULL)::numeric / COUNT(*) * 100, 1)
FROM gmp_cases
UNION ALL
SELECT 'date_accepted=NULL', COUNT(*) FILTER (WHERE date_accepted IS NULL), COUNT(*),
    ROUND(COUNT(*) FILTER (WHERE date_accepted IS NULL)::numeric / COUNT(*) * 100, 1)
FROM gmp_cases
UNION ALL
SELECT 'legal_stay_end_date=NULL', COUNT(*) FILTER (WHERE legal_stay_end_date IS NULL), COUNT(*),
    ROUND(COUNT(*) FILTER (WHERE legal_stay_end_date IS NULL)::numeric / COUNT(*) * 100, 1)
FROM gmp_cases;

-- ============================================================================
-- 3. Legacy case_type → mapping na category
-- ============================================================================
\echo ''
\echo '=== 3.1 Top 30 wartości case_type (gdzie category=NULL) — DO MAPPINGU ==='
SELECT case_type, COUNT(*) AS n
FROM gmp_cases
WHERE category IS NULL AND case_type IS NOT NULL
GROUP BY case_type
ORDER BY n DESC
LIMIT 30;

\echo ''
\echo '=== 3.2 Wartości case_type które MAJĄ category — kontrola spójności ==='
SELECT case_type, category, COUNT(*) AS n
FROM gmp_cases
WHERE case_type IS NOT NULL AND category IS NOT NULL
GROUP BY case_type, category
ORDER BY n DESC
LIMIT 30;

-- ============================================================================
-- 4. Sprawdzenie czy istnieją kategorie (z gmp_case_categories)
-- ============================================================================
\echo ''
\echo '=== 4.1 Lista istniejących kategorii ==='
SELECT code, label, group_label, is_active, sort_order
FROM gmp_case_categories
ORDER BY sort_order, code;

\echo ''
\echo '=== 4.2 Sprawy z category nieistniejącą w gmp_case_categories (orphan) ==='
SELECT c.category, COUNT(*) AS n
FROM gmp_cases c
LEFT JOIN gmp_case_categories cat ON cat.code = c.category
WHERE c.category IS NOT NULL AND cat.code IS NULL
GROUP BY c.category
ORDER BY n DESC;

-- ============================================================================
-- 5. Sprawy elektroniczne — backfill candidates dla Etapu III (A2)
-- ============================================================================
\echo ''
\echo '=== 5.1 Sprawy z submission_method=elektronicznie ==='
SELECT submission_method, COUNT(*) AS n
FROM gmp_cases
WHERE submission_method IS NOT NULL
GROUP BY submission_method
ORDER BY n DESC;

-- ============================================================================
-- 6. Pracodawcy i ich liczność spraw — backfill auto-grup (V.3)
-- ============================================================================
\echo ''
\echo '=== 6.1 Pracodawcy z >=2 sprawami (kandydaci do auto-grupy) ==='
SELECT e.id, e.name, e.nip, COUNT(c.id) AS spraw_count
FROM gmp_employers e
JOIN gmp_cases c ON c.employer_id = e.id
GROUP BY e.id, e.name, e.nip
HAVING COUNT(c.id) >= 2
ORDER BY COUNT(c.id) DESC
LIMIT 20;

-- ============================================================================
-- 7. Sprawdzenie istniejących views które używają gmp_tasks.case_id (A9)
-- ============================================================================
\echo ''
\echo '=== 7.1 Views/Functions używające gmp_tasks.case_id (sprawdz NOT NULL handling) ==='
SELECT n.nspname || '.' || c.relname AS object_name,
       CASE c.relkind WHEN 'v' THEN 'view' WHEN 'm' THEN 'matview' ELSE c.relkind::text END AS kind
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relkind IN ('v', 'm')
  AND n.nspname = 'public'
  AND pg_get_viewdef(c.oid) LIKE '%gmp_tasks%'
ORDER BY object_name;

\echo ''
\echo '=== 7.2 Funkcje używające gmp_tasks ==='
SELECT n.nspname || '.' || p.proname AS function_name
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname LIKE 'gmp_%'
  AND pg_get_functiondef(p.oid) LIKE '%gmp_tasks%'
ORDER BY function_name;

-- ============================================================================
-- 8. Sprawdzenie zgodności RODO — BEZPIECZENSTWO_RODO_DO_NAPRAWY.md
-- ============================================================================
\echo ''
\echo '=== 8.1 Profil zaufany — czy plaintext (Pre-condition 2) ==='
SELECT
    COUNT(*) AS total,
    COUNT(trusted_profile_password) AS with_password,
    COUNT(*) FILTER (WHERE trusted_profile_password IS NOT NULL
                     AND length(trusted_profile_password) BETWEEN 4 AND 50) AS likely_plaintext
FROM gmp_trusted_profile_credentials;

\echo ''
\echo '=== 8.2 RLS na intake-docs bucket (Pre-condition 1) ==='
SELECT name, definition
FROM pg_policies
WHERE tablename = 'objects' AND schemaname = 'storage'
  AND definition LIKE '%intake-docs%';

-- ============================================================================
-- KONIEC RAPORTU
-- ============================================================================
\echo ''
\echo '=== Audit zakończony. ==='
\echo 'Następny krok:'
\echo '  1. Na podstawie sekcji 3.1 — zaprojektować mapping legacy case_type → category'
\echo '  2. Wpisać UPDATE statements do migracji 20260501_06_backfill_categories.sql'
\echo '  3. Jeśli sekcja 7 zwróciła views z INNER JOIN po gmp_tasks.case_id — naprawić przed Etapem V'
\echo '  4. Jeśli sekcja 8.1 pokazuje plaintext w PZ — wykonać Pre-condition 2 przed Etapem III'
