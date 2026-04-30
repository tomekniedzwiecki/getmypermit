-- ============================================================================
-- Etap I — § 1.2 — Rozszerzenie gmp_case_kind (split: ALTER TYPE only)
-- ============================================================================
-- WAŻNE: Postgres nie pozwala używać nowej wartości enum w tej samej transakcji.
-- Dlatego ten plik MUSI być wykonany OSOBNO przed 20260501_02_use_kind_enum.sql.
-- (Supabase CLI wykonuje każdy plik migracji w osobnej transakcji — OK.)
-- ============================================================================

ALTER TYPE gmp_case_kind ADD VALUE IF NOT EXISTS 'przejeta_do_dalszego_prowadzenia';
ALTER TYPE gmp_case_kind ADD VALUE IF NOT EXISTS 'kontrola_legalnosci_pobytu_pracy';
