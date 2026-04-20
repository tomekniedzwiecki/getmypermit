-- ============================================================
-- Uwagi Pawła 2026-04-20: Finanse — ENUMs (część 1 z 2)
-- Źródło: uwagi-pawla-2026-04-20.md
--
-- UWAGA: ALTER TYPE ADD VALUE musi być w OSOBNEJ transakcji
-- przed użyciem wartości w innych instrukcjach (PG restriction).
-- ============================================================

DO $$ BEGIN
    ALTER TYPE gmp_payment_kind ADD VALUE IF NOT EXISTS 'stamp_fee';
EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN
    ALTER TYPE gmp_payment_kind ADD VALUE IF NOT EXISTS 'client_advance';
EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN
    ALTER TYPE gmp_payment_kind ADD VALUE IF NOT EXISTS 'client_advance_repayment';
EXCEPTION WHEN others THEN NULL; END $$;
