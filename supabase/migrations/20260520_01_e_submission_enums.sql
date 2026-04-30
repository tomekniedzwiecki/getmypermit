-- ============================================================================
-- Etap III — § III.1 — Enums dla elektronicznego złożenia wniosku
-- ============================================================================
-- Pawel pkt 10: 8 podsekcji A-H (minimum dokumentów, profil zaufany, ankieta,
-- opłaty, spotkanie, załącznik nr 1, podpis, UPO, raport)
-- ============================================================================

CREATE TYPE gmp_e_submission_step AS ENUM (
    'dokumenty_minimum',
    'profil_zaufany',
    'ankieta',
    'oplaty_admin',
    'spotkanie',
    'zalacznik_nr_1',
    'podpis_klienta',
    'wysylka',
    'upo',
    'raport'
);

CREATE TYPE gmp_e_submission_step_status AS ENUM (
    'pending', 'in_progress', 'done', 'blocked', 'n_a'
);

-- 3 modele załącznika nr 1 (pkt 10.F)
CREATE TYPE gmp_zalacznik_nr_1_model AS ENUM (
    'pracodawca_pelnomocnictwo',   -- ⭐ preferowany
    'pracodawca_samodzielnie',     -- wymaga koordynacji
    'do_ustalenia',                -- alert "pilne"
    'nie_dotyczy'                  -- gdy nie pc_praca
);

-- Status opłaty (pkt 10.D — rozdzielone wniosek + karta)
CREATE TYPE gmp_oplata_status AS ENUM (
    'do_oplaty',
    'klient_przekazal',           -- klient przekazał środki kancelarii
    'kancelaria_oplacila',        -- kancelaria opłaciła z własnych
    'klient_oplaci_sam',          -- klient sam dokonuje płatności
    'oplacono',                   -- finalnie opłacono
    'nie_dotyczy'
);
