-- Fix: PostgREST widzial 2 sciezki gmp_cases -> gmp_clients (bezposrednia
-- oraz przez gmp_employer_case_workers), co powodowalo blad przy embedowaniu.
--
-- Rozwiazanie: usuwamy FK na case_id (przerywa pass-through), zostawiamy FK
-- na client_id (potrzebny do embed workers.gmp_clients w UI).
-- Integralnosc case_id enforcowana w aplikacji (addWorkerToCase / removeWorker).

ALTER TABLE gmp_employer_case_workers
    DROP CONSTRAINT IF EXISTS gmp_employer_case_workers_case_id_fkey;

-- Czyscimy osierocone wpisy
DELETE FROM gmp_employer_case_workers
    WHERE case_id NOT IN (SELECT id FROM gmp_cases);
DELETE FROM gmp_employer_case_workers
    WHERE client_id NOT IN (SELECT id FROM gmp_clients);

-- FK na client_id zachowana (z oryginalnej migracji) - embed workers dziala
