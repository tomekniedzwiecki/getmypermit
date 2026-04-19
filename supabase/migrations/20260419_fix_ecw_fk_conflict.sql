-- Fix: PostgREST widzial 2 sciezki gmp_cases -> gmp_clients (bezposrednia +
-- przez gmp_employer_case_workers), co powodowalo blad przy embedowaniu.
-- Usuwamy FK constraints z junction table - relacja logiczna zachowana (client_id UUID).
-- Integralnosc enforcowana na poziomie aplikacji (addWorkerToCase / removeWorker).

ALTER TABLE gmp_employer_case_workers
    DROP CONSTRAINT IF EXISTS gmp_employer_case_workers_case_id_fkey;
ALTER TABLE gmp_employer_case_workers
    DROP CONSTRAINT IF EXISTS gmp_employer_case_workers_client_id_fkey;

-- Czyscimy osierocone wpisy (gdyby juz byly - na wszelki wypadek)
DELETE FROM gmp_employer_case_workers
    WHERE case_id NOT IN (SELECT id FROM gmp_cases);
DELETE FROM gmp_employer_case_workers
    WHERE client_id NOT IN (SELECT id FROM gmp_clients);
