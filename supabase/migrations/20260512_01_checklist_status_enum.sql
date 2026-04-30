-- ============================================================================
-- Etap II-B — § II-B.1 — Checklist status enum (split: tylko CREATE TYPE)
-- ============================================================================

CREATE TYPE gmp_checklist_status AS ENUM (
    'pending',     -- jeszcze nie sprawdzone
    'done',        -- zrobione / OK
    'n_a',         -- nie dotyczy tej sprawy
    'blocked'      -- blokada (np. czekamy na klienta)
);
