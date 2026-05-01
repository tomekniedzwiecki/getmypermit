-- ============================================================
-- CZYSZCZENIE STAREGO PROJEKTU (yxmavwkwnfuphjqbelws)
-- Usuwa WYLACZNIE 9 tabel getmypermit + ich wlasne policies/triggery
-- Nie rusza: auth.*, storage.*, zadnych tabel tn-crm, workflow_*, products,
--   customer_*, biznes_*, automation_*, funkcji wspoldzielonych jak update_updated_at_column()
-- ============================================================

-- Nasze tabele (dokladna lista, bez wildcardow w DROP):
--   1. permit_leads            (getmypermit: leady z formularza)
--   2. gmp_lawyers             (prawnicy)
--   3. gmp_offers              (szablony ofert)
--   4. gmp_client_offers       (oferty wyslane do klientow)
--   5. gmp_calendar_events     (kalendarz spotkan)
--   6. gmp_lawyer_availability (dostepnosc prawnikow)
--   7. gmp_lawyer_blocked_dates (zablokowane dni)
--   8. gmp_appointments        (rezerwacje)

-- ============================================================
-- SEKCJA A: WERYFIKACJA (nic nie usuwa) - URUCHOM NAJPIERW
-- ============================================================

-- A1. Lista naszych tabel (musi byc dokladnie 8 lub 9 - permit_leads + 7-8 gmp_*)
SELECT tablename FROM pg_tables
WHERE schemaname='public'
  AND (tablename LIKE 'gmp_%' OR tablename='permit_leads')
ORDER BY tablename;

-- A2. Czy jakas INNA tabela ma FK do naszych 9? Musi zwrocic 0 wierszy.
SELECT
  tc.table_name AS referencing_table,
  kcu.column_name AS referencing_column,
  ccu.table_name AS references_our_table
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu
  ON tc.constraint_name = ccu.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND ccu.table_schema = 'public'
  AND ccu.table_name IN (
    'permit_leads','gmp_lawyers','gmp_calendar_events','gmp_offers',
    'gmp_client_offers','gmp_lawyer_availability','gmp_lawyer_blocked_dates','gmp_appointments'
  )
  AND tc.table_name NOT IN (
    'permit_leads','gmp_lawyers','gmp_calendar_events','gmp_offers',
    'gmp_client_offers','gmp_lawyer_availability','gmp_lawyer_blocked_dates','gmp_appointments'
  );

-- A3. Czy jakas funkcja w public odwoluje sie do tych tabel? (getmypermit NIE ma wlasnych funkcji, ale sprawdzmy)
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema='public'
  AND routine_definition ~* '(permit_leads|gmp_lawyers|gmp_calendar_events|gmp_offers|gmp_client_offers|gmp_lawyer_availability|gmp_lawyer_blocked_dates|gmp_appointments)';

-- A4. Czy istnieja widoki/materialized views w public odwolujace sie do naszych tabel?
SELECT table_name, 'VIEW' as typ FROM information_schema.views
WHERE table_schema='public'
  AND view_definition ~* '(permit_leads|gmp_lawyers|gmp_calendar_events|gmp_offers|gmp_client_offers|gmp_lawyer_availability|gmp_lawyer_blocked_dates|gmp_appointments)'
UNION ALL
SELECT matviewname, 'MATVIEW' FROM pg_matviews
WHERE schemaname='public'
  AND definition ~* '(permit_leads|gmp_lawyers|gmp_calendar_events|gmp_offers|gmp_client_offers|gmp_lawyer_availability|gmp_lawyer_blocked_dates|gmp_appointments)';

-- A5. Czy ktoras z naszych 9 tabel nie zostala czasem przypisana do publikacji logical replication?
-- (Jesli tak, moze trzeba najpierw wyjac ALTER PUBLICATION)
SELECT pubname, tablename FROM pg_publication_tables
WHERE tablename IN (
  'permit_leads','gmp_lawyers','gmp_calendar_events','gmp_offers',
  'gmp_client_offers','gmp_lawyer_availability','gmp_lawyer_blocked_dates','gmp_appointments'
);


-- ============================================================
-- SEKCJA B: DROP BEZ CASCADE
-- Uruchom DOPIERO gdy A2=0 i A4=0.
-- Jesli A5 zwrocil rzedy: NIE urchamiaj B. Pokaz wynik Claude.
-- Jesli A3 zwrocil jakies funkcje: pokaz Claude zanim usuniesz.
--
-- NIE UZYWAMY CASCADE - jesli cos nieoczekiwanego zalezy od tabeli, DROP sie wywali
-- z czytelnym bledem zamiast milczaco usunac zaleznosci.
-- FK miedzy naszymi 9 tabelami obslugujemy przez kolejnosc (child -> parent).
-- ============================================================

BEGIN;

-- 1. Najpierw tabele ktore odwoluja sie do innych (child)
DROP TABLE IF EXISTS public.gmp_appointments;          -- FK -> lawyers, leads, client_offers
DROP TABLE IF EXISTS public.gmp_lawyer_blocked_dates;  -- FK -> lawyers
DROP TABLE IF EXISTS public.gmp_lawyer_availability;   -- FK -> lawyers
DROP TABLE IF EXISTS public.gmp_client_offers;         -- FK -> leads, offers, lawyers
DROP TABLE IF EXISTS public.gmp_calendar_events;       -- FK -> leads, lawyers

-- 2. Teraz tabele posrednie
-- permit_leads ma FK do gmp_lawyers (assigned_to) i gmp_offers (offer_id) -
-- ale dzieci (gmp_calendar_events, gmp_client_offers, gmp_appointments) juz usuniete,
-- wiec nic nie wskazuje juz na permit_leads.
DROP TABLE IF EXISTS public.permit_leads;              -- FK -> lawyers, offers
DROP TABLE IF EXISTS public.gmp_offers;                -- brak FK (parent)
DROP TABLE IF EXISTS public.gmp_lawyers;               -- FK -> auth.users (zostaje nienaruszone)

-- Weryfikacja koncowa - powinno zwrocic 0 wierszy
SELECT tablename FROM pg_tables
WHERE schemaname='public'
  AND (tablename LIKE 'gmp_%' OR tablename='permit_leads');

COMMIT;

-- Po COMMIT - upewnij sie ze zadne inne tabele nie zostaly dotkniete (opcjonalny sanity check)
-- SELECT COUNT(*) FROM workflows;          -- powinno dzialac
-- SELECT COUNT(*) FROM automation_flows;   -- powinno dzialac
