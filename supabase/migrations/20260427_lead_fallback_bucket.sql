-- =====================================================
-- LEAD FALLBACK: prywatny bucket dla leadow gdy DB padnie
-- =====================================================
-- Cel: gdy edge function permit-lead-save nie moze zapisac do tabeli
-- permit_leads (Postgres/PostgREST down jak w incidencie 2026-04-27),
-- serializujemy payload do Storage. Cron replay potem przepisuje do leadow.
--
-- Storage Postgres ma osobna instancje od PostgREST - przezywa wieksza
-- czesc incidentow (potwierdzone 2026-04-27: storage 200, rest 503).

-- 1. Bucket prywatny
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'lead-fallback',
  'lead-fallback',
  false,
  1048576,
  ARRAY['application/json']
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 1048576,
  allowed_mime_types = ARRAY['application/json'];

-- 2. RLS: tylko service_role
DROP POLICY IF EXISTS "lead_fallback_service_only" ON storage.objects;

CREATE POLICY "lead_fallback_service_only"
ON storage.objects
FOR ALL
TO service_role
USING (bucket_id = 'lead-fallback')
WITH CHECK (bucket_id = 'lead-fallback');

COMMENT ON POLICY "lead_fallback_service_only" ON storage.objects IS
'Lead fallback bucket: tylko edge functions (service_role) maja dostep.';

-- =============================================
-- KROK MANUALNY: cron co 5 min do replay
-- =============================================
-- Po deployu edge functions, uruchom w SQL Editor (zamien YOUR_SERVICE_ROLE_KEY):
--
-- SELECT cron.schedule_in_time_zone(
--     'lead-fallback-replay',
--     '*/5 * * * *',
--     'Europe/Warsaw',
--     $$
--     SELECT net.http_post(
--         url := 'https://gfwsdrbywgmceateubyq.supabase.co/functions/v1/lead-fallback-replay',
--         headers := '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb,
--         body := '{}'::jsonb
--     );
--     $$
-- );
