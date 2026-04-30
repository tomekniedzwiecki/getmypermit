-- ============================================================================
-- Etap II-A — § II-A.1 — gmp_documents.status enum (B1)
-- Split: TYLKO CREATE TYPE (nie używamy w tej samej transakcji)
-- ============================================================================

CREATE TYPE gmp_document_status AS ENUM (
    'draft',                  -- szkic (np. wygenerowany ale wymaga edycji)
    'ready',                  -- gotowy do pobrania/wydruku
    'awaiting_signature',     -- czeka na podpis (klient/pracodawca)
    'signed',                 -- podpisany
    'sent',                   -- wysłany (do urzędu / klienta)
    'archived'                -- archiwum (sprawa zakończona)
);
