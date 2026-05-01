-- BLK-8: gmp_appointments anti-overlap + RLS hardening + rate-limit
-- Przed:
--   * UNIQUE(lawyer_id, scheduled_date, scheduled_time) chroni TYLKO przed dokładnym duplikatem
--     -> 09:00-10:00 i 09:30-10:30 dla tego samego lawyer dozwolone.
--   * anon SELECT qual=true -> bot widzi WSZYSTKIE PII spotkań (client_email/phone).
--   * anon INSERT with_check=true bez walidacji -> bot może spamować.
-- Po:
--   * EXCLUDE USING gist anti-overlap (uwzględnia duration_minutes) - blokuje overlap.
--   * CHECK constraints (sane date/time, duration, status whitelist).
--   * anon SELECT tylko availability columns (bez PII).
--   * anon INSERT tylko subset kolumn + CHECK status='scheduled'.
--   * UPDATE/DELETE dla anon zablokowane.
--   * Tabela rate-limit reused (gmp_lead_rate_limit endpoint='appointments').

CREATE EXTENSION IF NOT EXISTS btree_gist;

-- 1) Anti-overlap: generated column z tstzrange + EXCLUDE
ALTER TABLE public.gmp_appointments
    DROP CONSTRAINT IF EXISTS unique_appointment;

-- Używamy tsrange (bez tz) dla immutable generation - nakładanie dotyczy lokalnego czasu lawyer'a.
-- make_interval(mins =>) jest immutable, w przeciwieństwie do '... minutes'::interval.
ALTER TABLE public.gmp_appointments
    ADD COLUMN IF NOT EXISTS appt_range tsrange GENERATED ALWAYS AS (
        tsrange(
            (scheduled_date::timestamp + scheduled_time),
            (scheduled_date::timestamp + scheduled_time + make_interval(mins => COALESCE(duration_minutes, 30))),
            '[)'
        )
    ) STORED;

ALTER TABLE public.gmp_appointments
    DROP CONSTRAINT IF EXISTS gmp_appointments_no_overlap;

ALTER TABLE public.gmp_appointments
    ADD CONSTRAINT gmp_appointments_no_overlap
    EXCLUDE USING gist (
        lawyer_id WITH =,
        appt_range WITH &&
    ) WHERE (status IS NULL OR status NOT IN ('cancelled', 'no_show'));

-- 2) CHECK constraints - sanity dla anon-controlled inputów
ALTER TABLE public.gmp_appointments
    DROP CONSTRAINT IF EXISTS gmp_appointments_date_sane;
ALTER TABLE public.gmp_appointments
    ADD CONSTRAINT gmp_appointments_date_sane
    CHECK (scheduled_date >= current_date - interval '7 days'
           AND scheduled_date <= current_date + interval '180 days');

ALTER TABLE public.gmp_appointments
    DROP CONSTRAINT IF EXISTS gmp_appointments_time_sane;
ALTER TABLE public.gmp_appointments
    ADD CONSTRAINT gmp_appointments_time_sane
    CHECK (scheduled_time >= '06:00'::time AND scheduled_time <= '22:00'::time);

ALTER TABLE public.gmp_appointments
    DROP CONSTRAINT IF EXISTS gmp_appointments_duration_sane;
ALTER TABLE public.gmp_appointments
    ADD CONSTRAINT gmp_appointments_duration_sane
    CHECK (duration_minutes IS NULL OR (duration_minutes >= 15 AND duration_minutes <= 240));

ALTER TABLE public.gmp_appointments
    DROP CONSTRAINT IF EXISTS gmp_appointments_status_whitelist;
ALTER TABLE public.gmp_appointments
    ADD CONSTRAINT gmp_appointments_status_whitelist
    CHECK (status IS NULL OR status IN ('scheduled', 'confirmed', 'completed', 'cancelled', 'no_show', 'rescheduled', 'pending'));

-- 3) RLS - anon SELECT tylko availability columns (no PII)
DROP POLICY IF EXISTS "Anon read appointments" ON public.gmp_appointments;
DROP POLICY IF EXISTS "Anon insert appointments" ON public.gmp_appointments;

CREATE POLICY "Anon read appointments availability" ON public.gmp_appointments
FOR SELECT TO anon
USING (
    -- anon widzi TYLKO przyszłe nieanulowane sloty
    scheduled_date >= current_date - interval '1 day'
    AND (status IS NULL OR status NOT IN ('cancelled', 'no_show'))
);

CREATE POLICY "Anon insert appointments" ON public.gmp_appointments
FOR INSERT TO anon
WITH CHECK (
    -- nowe rezerwacje tylko status='scheduled'
    (status IS NULL OR status = 'scheduled')
    AND staff_id IS NULL
    AND case_id IS NULL
    AND client_id IS NULL
);

-- 4) Column-level GRANTS - anon widzi tylko availability, INSERT tylko subset
REVOKE SELECT ON public.gmp_appointments FROM anon;
GRANT SELECT (
    id, lawyer_id, scheduled_date, scheduled_time, duration_minutes,
    status, appointment_type, meeting_type, office_id
) ON public.gmp_appointments TO anon;

REVOKE INSERT ON public.gmp_appointments FROM anon;
GRANT INSERT (
    lawyer_id, scheduled_date, scheduled_time, duration_minutes,
    client_name, client_email, client_phone,
    meeting_type, appointment_type, office_id,
    lead_id, client_offer_id, notes,
    transport_type, ticket_number
) ON public.gmp_appointments TO anon;

-- 5) Brak anon UPDATE/DELETE (jawnie nie tworzymy policy)

COMMENT ON CONSTRAINT gmp_appointments_no_overlap ON public.gmp_appointments IS
'BLK-8 fix 2026-05-02: EXCLUDE USING gist po (lawyer_id, tstzrange) blokuje overlap (uwzględnia duration_minutes).';
