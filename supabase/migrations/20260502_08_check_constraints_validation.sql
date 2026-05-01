-- CRIT-8: CHECK constraints walidujące PESEL/NIP/email DB-side (defense-in-depth).
-- Przed: walidacja TYLKO JS-side w validators.js, bypass przez bezpośredni REST call.
-- Po: NOT VALID constraints blokują nowe bad data; istniejące rekordy (47 bad emails
--      np. "ODCISKI"/"OD SANGITY" - dane testowe staff w niewłaściwej kolumnie) zostawiamy
--      bez VALIDATE, naprawimy ręcznie post-launch.

-- gmp_clients.pesel - 11 cyfr
ALTER TABLE public.gmp_clients
    DROP CONSTRAINT IF EXISTS gmp_clients_pesel_format;
ALTER TABLE public.gmp_clients
    ADD CONSTRAINT gmp_clients_pesel_format
    CHECK (pesel IS NULL OR pesel ~ '^[0-9]{11}$') NOT VALID;

-- gmp_clients.email - basic email regex
ALTER TABLE public.gmp_clients
    DROP CONSTRAINT IF EXISTS gmp_clients_email_format;
ALTER TABLE public.gmp_clients
    ADD CONSTRAINT gmp_clients_email_format
    CHECK (email IS NULL OR email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$') NOT VALID;

-- gmp_clients.phone - akceptujemy +/cyfry/spacje/myślniki/nawiasy (luźno bo różne kraje)
ALTER TABLE public.gmp_clients
    DROP CONSTRAINT IF EXISTS gmp_clients_phone_format;
ALTER TABLE public.gmp_clients
    ADD CONSTRAINT gmp_clients_phone_format
    CHECK (phone IS NULL OR phone ~ '^[+0-9 ()\-]{6,30}$') NOT VALID;

-- gmp_employers.nip - 10 cyfr
ALTER TABLE public.gmp_employers
    DROP CONSTRAINT IF EXISTS gmp_employers_nip_format;
ALTER TABLE public.gmp_employers
    ADD CONSTRAINT gmp_employers_nip_format
    CHECK (nip IS NULL OR nip ~ '^[0-9]{10}$') NOT VALID;

-- permit_leads.email - basic email regex
ALTER TABLE public.permit_leads
    DROP CONSTRAINT IF EXISTS permit_leads_email_format;
ALTER TABLE public.permit_leads
    ADD CONSTRAINT permit_leads_email_format
    CHECK (email IS NULL OR email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$') NOT VALID;

-- permit_leads.phone
ALTER TABLE public.permit_leads
    DROP CONSTRAINT IF EXISTS permit_leads_phone_format;
ALTER TABLE public.permit_leads
    ADD CONSTRAINT permit_leads_phone_format
    CHECK (phone IS NULL OR phone ~ '^[+0-9 ()\-]{6,30}$') NOT VALID;

COMMENT ON CONSTRAINT gmp_clients_pesel_format ON public.gmp_clients IS
'CRIT-8 fix 2026-05-02: NOT VALID - blokuje NEW PESEL inny niż 11 cyfr. Stare rekordy nie sprawdzane (validate po ręcznym czyszczeniu).';
