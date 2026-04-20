-- ============================================================
-- pg_cron — codzienne zadania dla planu rat
-- Odpowiedź Pawła z 2026-04-20: "zrób cron"
-- ============================================================

-- Extensions — Supabase: pg_cron schemuje do `cron`, pg_net do `net`
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
-- pg_net zostawiam niewłączony — nie używam HTTP w cronie

-- Harmonogram: każdego ranka 07:00 Europe/Warsaw = 05:00 UTC (zima) / 06:00 UTC (lato)
-- pg_cron operuje w UTC, więc odpalamy o 05:00 UTC — codziennie trafi między 6 a 7 lokalnie.
-- To bezpieczne okno: opiekunowie nie zaczynają wcześniej, a wszystko przed godziną pracy.

-- USUŃ stare jeśli istnieją (idempotent)
DO $$
DECLARE
    v_jobid BIGINT;
BEGIN
    FOR v_jobid IN
        SELECT jobid FROM cron.job WHERE jobname IN ('gmp_daily_installment_tasks', 'gmp_daily_mark_overdue')
    LOOP
        PERFORM cron.unschedule(v_jobid);
    END LOOP;
END $$;

-- 1) Codziennie 05:00 UTC — generuj zadania dla rat w dniu dzisiejszym
SELECT cron.schedule(
    'gmp_daily_installment_tasks',
    '0 5 * * *',
    $$SELECT public.gmp_generate_installment_tasks();$$
);

-- 2) Codziennie 05:05 UTC — oznacz przeterminowane raty
SELECT cron.schedule(
    'gmp_daily_mark_overdue',
    '5 5 * * *',
    $$SELECT public.gmp_mark_overdue_installments();$$
);

-- Dla pewności wywołaj teraz raz (żeby raty już dziś przeterminowane były oznaczone)
SELECT public.gmp_mark_overdue_installments();

COMMENT ON EXTENSION pg_cron IS 'pg_cron — codzienne zadania CRM (generowanie zadań-alertów o ratach + oznaczanie przeterminowanych). Wymagane przez uwagi Pawła 2026-04-20 pkt 1.1.';
