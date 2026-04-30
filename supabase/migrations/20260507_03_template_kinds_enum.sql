-- ============================================================================
-- Etap II-A — § II-A.2 — gmp_document_template_kind enum (split)
-- ============================================================================

CREATE TYPE gmp_document_template_kind AS ENUM (
    'pelnomocnictwo_klient',
    'pelnomocnictwo_pracodawca',
    'instrukcja_klient',
    'instrukcja_pracodawca',
    'lista_dokumentow_klient',
    'lista_dokumentow_pracodawca',
    'karta_przyjecia',
    'harmonogram_platnosci',
    'oswiadczenie_siedziba',
    'oswiadczenie_zatrudnienie',
    'oswiadczenie_utrzymanie',
    'audit_checklist',
    'raport_po_zlozeniu_klient',
    'raport_po_zlozeniu_pracodawca',
    'zalacznik_nr_1',
    'zgoda_przekazywania_statusu',
    'raport_zbiorczy_grupa',
    'raport_legalnosc_pracodawca',
    'inne'
);
