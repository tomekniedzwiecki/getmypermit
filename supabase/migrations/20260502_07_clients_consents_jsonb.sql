-- CRIT-6: gmp_clients.consents jsonb (RODO consent management)
-- Przed: brak kolumny do tracking zgód RODO klientów (marketing, dane, profil, itp.)
-- Po: kolumna `consents jsonb` z default '{}' + CHECK że to JSON object (nie array)
-- Format docelowy: {"marketing":{"granted":true,"at":"2026-05-02T10:00:00Z","ip":"1.2.3.4"},
--                   "data_processing":{"granted":true,"at":"..."},
--                   "profile":{"granted":false}}

ALTER TABLE public.gmp_clients
    ADD COLUMN IF NOT EXISTS consents jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.gmp_clients
    DROP CONSTRAINT IF EXISTS gmp_clients_consents_is_object;

ALTER TABLE public.gmp_clients
    ADD CONSTRAINT gmp_clients_consents_is_object
    CHECK (jsonb_typeof(consents) = 'object');

CREATE INDEX IF NOT EXISTS idx_gmp_clients_consents_marketing
    ON public.gmp_clients ((consents->'marketing'->>'granted'))
    WHERE consents ? 'marketing';

COMMENT ON COLUMN public.gmp_clients.consents IS
'CRIT-6 fix 2026-05-02: RODO consent tracking jsonb. Klucze: marketing, data_processing, profile, whatsapp itd. Każdy z polami {granted: bool, at: timestamptz, ip: text, version: text}.';
