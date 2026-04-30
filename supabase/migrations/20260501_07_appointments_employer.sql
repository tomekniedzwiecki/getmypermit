-- ============================================================================
-- Etap I — § 1.9 — Dodanie employer_id do gmp_crm_appointments (B3)
-- ============================================================================
-- Paweł pkt 10.E: spotkanie ma flagę "powiąż z pracodawcą". Aktualnie
-- gmp_crm_appointments ma case_id, ale nie employer_id direct → dodajemy.
-- ============================================================================

ALTER TABLE gmp_crm_appointments
    ADD COLUMN IF NOT EXISTS employer_id UUID REFERENCES gmp_employers ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_crm_appt_employer ON gmp_crm_appointments(employer_id)
    WHERE employer_id IS NOT NULL;

-- Backfill z case_id → employer_id (jeśli sprawa ma pracodawcę)
UPDATE gmp_crm_appointments appt
SET employer_id = c.employer_id
FROM gmp_cases c
WHERE c.id = appt.case_id
  AND c.employer_id IS NOT NULL
  AND appt.employer_id IS NULL;

COMMENT ON COLUMN gmp_crm_appointments.employer_id IS
'Bezpośrednie powiązanie z pracodawcą. Dla nowych spotkań — auto-fill z case.employer_id, ale można nadpisać (np. spotkanie tylko z pracodawcą bez konkretnej sprawy).';
