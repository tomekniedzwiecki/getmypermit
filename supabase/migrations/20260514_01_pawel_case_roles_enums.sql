-- ============================================================================
-- Etap II-C — § II-C.2 — Enum'y dla ról w sprawie (split: tylko CREATE TYPE)
-- ============================================================================
-- Pawel pkt 12: 7 ról w sprawie (strona/zlecający/płatnik/podpisujący/odbiorca raportu)
-- Defaulty wyliczane on-the-fly (jeśli brak wpisu, bierzemy z gmp_cases.client_id/employer_id).
-- Override = wpis do gmp_case_role_assignments.
-- ============================================================================

CREATE TYPE gmp_case_role AS ENUM (
    'strona',                                  -- strona sprawy (default: client lub employer)
    'zlecajacy',                               -- kto zleca prowadzenie sprawy
    'platnik',                                 -- kto płaci
    'osoba_kontaktowa',                        -- osoba do kontaktu (może być różna od klienta)
    'podpisujacy_pelnomocnictwo_klienta',      -- klient (default = strona dla individual)
    'podpisujacy_zalacznik_nr_1',              -- pracodawca (kluczowe dla pkt 10.F Pawła)
    'odbiorca_raportu'                         -- kto dostaje raport po złożeniu (wielowartościowa)
);

CREATE TYPE gmp_case_role_party_type AS ENUM (
    'client',     -- gmp_clients.id
    'employer',   -- gmp_employers.id
    'staff',      -- gmp_staff.id (np. członek kancelarii)
    'external'    -- bez powiązania w bazie (wpisz dane ręcznie)
);
