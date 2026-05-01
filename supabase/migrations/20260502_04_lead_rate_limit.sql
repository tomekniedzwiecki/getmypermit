-- BLK-7: tabela rate-limit dla permit-lead-save (i innych public POST endpointów)
-- Przed: brak limitu. 5 POST/2.7s = wszystkie przyjęte, fallback do Storage = cost vector.

CREATE TABLE IF NOT EXISTS public.gmp_lead_rate_limit (
    id bigserial PRIMARY KEY,
    ip_address text NOT NULL,
    endpoint text NOT NULL DEFAULT 'permit-lead-save',
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gmp_lead_rate_limit_ip_time
    ON public.gmp_lead_rate_limit (ip_address, endpoint, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_gmp_lead_rate_limit_purge
    ON public.gmp_lead_rate_limit (created_at);

ALTER TABLE public.gmp_lead_rate_limit ENABLE ROW LEVEL SECURITY;
-- Brak policies dla anon/authenticated. Tylko service_role.

COMMENT ON TABLE public.gmp_lead_rate_limit IS
'BLK-7 fix 2026-05-02: rate-limit dla public form (permit-lead-save). Service-role only. Cron purge >24h.';
