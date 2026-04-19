-- D: Nowy model spraw (req Pawel pkt 10-12)
-- 1) Typ strony sprawy: individual / employer / other
-- 2) PESEL na karcie klienta
-- 3) Terminy dla spraw "innych" (cywilnych, karnych itd.)
-- 4) Wiele osob w sprawie pracodawcy (lista pracownikow)

-- 1. Typ strony sprawy
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'gmp_party_type') THEN
        CREATE TYPE gmp_party_type AS ENUM ('individual', 'employer', 'other');
    END IF;
END $$;

ALTER TABLE gmp_cases ADD COLUMN IF NOT EXISTS party_type gmp_party_type NOT NULL DEFAULT 'individual';

-- 2. PESEL klienta
ALTER TABLE gmp_clients ADD COLUMN IF NOT EXISTS pesel TEXT;
CREATE INDEX IF NOT EXISTS idx_clients_pesel ON gmp_clients(pesel) WHERE pesel IS NOT NULL;

-- 3. Terminy dla spraw "innych"
ALTER TABLE gmp_cases ADD COLUMN IF NOT EXISTS deadline_response DATE;
ALTER TABLE gmp_cases ADD COLUMN IF NOT EXISTS deadline_hearing DATE;

-- 4. Lista pracownikow w sprawie pracodawcy (zezwolenia na prace)
CREATE TABLE IF NOT EXISTS gmp_employer_case_workers (
    case_id UUID REFERENCES gmp_cases(id) ON DELETE CASCADE,
    client_id UUID REFERENCES gmp_clients(id) ON DELETE CASCADE,
    added_at TIMESTAMPTZ DEFAULT NOW(),
    notes TEXT,
    PRIMARY KEY (case_id, client_id)
);
CREATE INDEX IF NOT EXISTS idx_ecw_case ON gmp_employer_case_workers(case_id);
CREATE INDEX IF NOT EXISTS idx_ecw_client ON gmp_employer_case_workers(client_id);

ALTER TABLE gmp_employer_case_workers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authenticated_crud" ON gmp_employer_case_workers;
CREATE POLICY "authenticated_crud" ON gmp_employer_case_workers
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 5. Migracja istniejacych danych: sprawy z employer + bez client = employer type
UPDATE gmp_cases
SET party_type = 'employer'
WHERE employer_id IS NOT NULL
  AND client_id IS NULL
  AND party_type = 'individual';

-- Konwencja:
--   party_type='individual' -> case_type = dowolne zezwolenie cudzoziemca
--   party_type='employer'   -> case_type IN ('work_permit', 'audit')
--   party_type='other'      -> case_type IN ('civil', 'criminal', 'commercial', 'legal_opinion')
