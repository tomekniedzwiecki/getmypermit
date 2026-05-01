-- CRIT-NEW-2: gmp_client_offers RLS hardening
-- Przed: anon SELECT qual=true (widzi wszystkie oferty), anon UPDATE qual=true with_check=true
--        (modyfikuje DOWOLNĄ kolumnę DOWOLNEJ oferty: custom_price, status itd.).
-- Po:    anon SELECT/UPDATE wymaga matching X-Offer-Token w nagłówku, plus column-level
--        GRANT ogranicza UPDATE do view_count/viewed_at/view_history/status. Status
--        zachowuje istniejący CHECK constraint (whitelist 5 wartości).

DROP POLICY IF EXISTS "Anon can view gmp_client_offers by token" ON public.gmp_client_offers;
DROP POLICY IF EXISTS "Anon can update gmp_client_offers view tracking" ON public.gmp_client_offers;

CREATE POLICY "Anon can view gmp_client_offers by token" ON public.gmp_client_offers
FOR SELECT TO anon
USING (
    unique_token IS NOT NULL
    AND unique_token = (current_setting('request.headers', true)::json ->> 'x-offer-token')
);

CREATE POLICY "Anon can update gmp_client_offers view tracking" ON public.gmp_client_offers
FOR UPDATE TO anon
USING (
    unique_token IS NOT NULL
    AND unique_token = (current_setting('request.headers', true)::json ->> 'x-offer-token')
)
WITH CHECK (
    unique_token IS NOT NULL
    AND unique_token = (current_setting('request.headers', true)::json ->> 'x-offer-token')
);

-- Column-level: anon może UPDATE tylko view_count/viewed_at/view_history/status.
REVOKE UPDATE ON public.gmp_client_offers FROM anon;
GRANT UPDATE (view_count, viewed_at, view_history, status) ON public.gmp_client_offers TO anon;
GRANT SELECT ON public.gmp_client_offers TO anon;

COMMENT ON POLICY "Anon can update gmp_client_offers view tracking" ON public.gmp_client_offers IS
'CRIT-NEW-2 fix 2026-05-02: wymaga X-Offer-Token header + column-level GRANT ogranicza do view_count/viewed_at/view_history/status.';
