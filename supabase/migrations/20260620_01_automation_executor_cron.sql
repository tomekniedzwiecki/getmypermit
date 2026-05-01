-- ============================================================================
-- Etap VII.2 — pg_cron HTTP call na edge function automation-executor
-- Cel: bez tego automation-executor wywoływany tylko ręcznie z UI
-- Wywołanie: co 2 min HTTP POST do edge function
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pg_net;

-- Pobierz secret z vault (Supabase) — service role key potrzebny do wywołania edge fn
-- UWAGA: service_role_key musi być ustawiony w vault.secrets jako 'service_role_key'
-- lub hardcoded poniżej (RYZYKO bezpieczeństwa, lepiej vault).
-- Production: SELECT vault.create_secret('eyJ...', 'service_role_key');

CREATE OR REPLACE FUNCTION gmp_call_automation_executor() RETURNS BIGINT AS $$
DECLARE
    v_url TEXT := 'https://gfwsdrbywgmceateubyq.supabase.co/functions/v1/automation-executor';
    v_key TEXT;
    v_request_id BIGINT;
BEGIN
    -- Pobierz key z vault
    SELECT decrypted_secret INTO v_key
    FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1;

    IF v_key IS NULL THEN
        RAISE WARNING 'service_role_key not found in vault.secrets. automation-executor cron skipped.';
        RETURN NULL;
    END IF;

    -- HTTP POST do edge function
    SELECT net.http_post(
        url := v_url,
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || v_key
        ),
        body := '{}'::jsonb
    ) INTO v_request_id;

    RETURN v_request_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Schedule cron — co 2 minuty
DO $$
BEGIN
    -- Usuń stary job jeśli istnieje
    PERFORM cron.unschedule('gmp_automation_executor_2min')
    WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'gmp_automation_executor_2min');

    PERFORM cron.schedule(
        'gmp_automation_executor_2min',
        '*/2 * * * *',
        $cmd$ SELECT gmp_call_automation_executor() $cmd$
    );
END$$;

COMMENT ON FUNCTION gmp_call_automation_executor() IS 'Pawel VII.2 — wywołanie edge function automation-executor przez pg_cron co 2 min. Wymaga vault.secrets z service_role_key.';
