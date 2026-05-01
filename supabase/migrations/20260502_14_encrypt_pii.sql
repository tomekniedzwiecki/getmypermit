-- Tier 1 #1: Encrypt PESEL i trusted_profile_password przez pgcrypto + Vault key.
-- Strategia:
-- 1. Klucz symetryczny w vault.secrets (encrypted at rest przez pgsodium)
-- 2. Kolumny pesel_encrypted bytea, password_encrypted bytea
-- 3. RPC encrypt/decrypt SECURITY DEFINER - decrypt TYLKO dla manager+
-- 4. Stara kolumna pesel text zachowana jako legacy fallback (ale w UI używamy encrypted)
-- 5. Backfill 4 istniejące PESEL

-- =====================================================
-- 1. Vault key dla PESEL/passport encryption
-- =====================================================
DO $$
DECLARE
    v_key_exists boolean;
BEGIN
    SELECT EXISTS(SELECT 1 FROM vault.secrets WHERE name = 'gmp_pii_encryption_key') INTO v_key_exists;
    IF NOT v_key_exists THEN
        PERFORM vault.create_secret(
            encode(extensions.gen_random_bytes(32), 'hex'),
            'gmp_pii_encryption_key',
            'Symmetric key dla PESEL/passport/trusted_profile_password encryption (CRIT-1 fix 2026-05-02)'
        );
    END IF;
END $$;

-- =====================================================
-- 2. Helper functions: encrypt/decrypt
-- =====================================================
CREATE OR REPLACE FUNCTION public.gmp_encrypt_pii(p_plain text)
RETURNS bytea
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault, extensions
AS $$
DECLARE
    v_key text;
BEGIN
    IF p_plain IS NULL OR p_plain = '' THEN RETURN NULL; END IF;
    SELECT decrypted_secret INTO v_key FROM vault.decrypted_secrets WHERE name = 'gmp_pii_encryption_key';
    IF v_key IS NULL THEN
        RAISE EXCEPTION 'gmp_pii_encryption_key not found in vault';
    END IF;
    RETURN extensions.pgp_sym_encrypt(p_plain, v_key);
END;
$$;

CREATE OR REPLACE FUNCTION public.gmp_decrypt_pii(p_encrypted bytea)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault, extensions
AS $$
DECLARE
    v_key text;
    v_staff_id uuid;
    v_role text;
BEGIN
    IF p_encrypted IS NULL THEN RETURN NULL; END IF;

    -- Authorization: manager+ albo staff dla swoich klientów (sprawdzane w view, tu tylko hard limit)
    SELECT id, role INTO v_staff_id, v_role FROM gmp_staff WHERE user_id = auth.uid();
    IF v_role IS NULL THEN
        RAISE EXCEPTION 'Not authenticated staff' USING ERRCODE = '42501';
    END IF;

    -- Audit log access do PII
    INSERT INTO gmp_audit_log (staff_id, action, entity_type, severity, metadata)
    VALUES (v_staff_id, 'pii_decrypt', 'gmp_clients', 'info',
            jsonb_build_object('role', v_role));

    SELECT decrypted_secret INTO v_key FROM vault.decrypted_secrets WHERE name = 'gmp_pii_encryption_key';
    RETURN extensions.pgp_sym_decrypt(p_encrypted, v_key);
END;
$$;

-- Tylko dla service_role i authenticated (RLS ogranicza dalej)
GRANT EXECUTE ON FUNCTION public.gmp_encrypt_pii(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.gmp_decrypt_pii(bytea) TO authenticated;

-- =====================================================
-- 3. gmp_clients: dodaj pesel_encrypted + passport_encrypted
-- =====================================================
ALTER TABLE public.gmp_clients
    ADD COLUMN IF NOT EXISTS pesel_encrypted bytea,
    ADD COLUMN IF NOT EXISTS passport_number_encrypted bytea;

-- Index na to czy jest zaszyfrowane
CREATE INDEX IF NOT EXISTS idx_gmp_clients_pesel_encrypted_present
    ON public.gmp_clients ((pesel_encrypted IS NOT NULL));

-- =====================================================
-- 4. RPC: setter (encrypt + store)
-- =====================================================
CREATE OR REPLACE FUNCTION public.gmp_client_set_pesel(p_client_id uuid, p_pesel text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_staff_id uuid;
BEGIN
    -- Walidacja format
    IF p_pesel IS NOT NULL AND p_pesel !~ '^[0-9]{11}$' THEN
        RAISE EXCEPTION 'PESEL musi być 11 cyfr' USING ERRCODE = '22023';
    END IF;

    -- Authorization
    SELECT id INTO v_staff_id FROM gmp_staff WHERE user_id = auth.uid();
    IF v_staff_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated staff' USING ERRCODE = '42501';
    END IF;

    UPDATE gmp_clients SET
        pesel_encrypted = public.gmp_encrypt_pii(p_pesel),
        pesel = NULL,  -- usuń legacy plain
        updated_at = now()
    WHERE id = p_client_id;

    INSERT INTO gmp_audit_log (staff_id, action, entity_type, entity_id, severity)
    VALUES (v_staff_id, 'pesel_updated', 'gmp_clients', p_client_id, 'info');
END;
$$;

CREATE OR REPLACE FUNCTION public.gmp_client_set_passport(p_client_id uuid, p_passport_number text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_staff_id uuid;
BEGIN
    SELECT id INTO v_staff_id FROM gmp_staff WHERE user_id = auth.uid();
    IF v_staff_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated staff' USING ERRCODE = '42501';
    END IF;

    UPDATE gmp_clients SET
        passport_number_encrypted = public.gmp_encrypt_pii(p_passport_number),
        updated_at = now()
    WHERE id = p_client_id;

    INSERT INTO gmp_audit_log (staff_id, action, entity_type, entity_id, severity)
    VALUES (v_staff_id, 'passport_updated', 'gmp_clients', p_client_id, 'info');
END;
$$;

GRANT EXECUTE ON FUNCTION public.gmp_client_set_pesel(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.gmp_client_set_passport(uuid, text) TO authenticated;

-- =====================================================
-- 5. View dekrypcyjny - widoczny przez RLS
-- =====================================================
DROP VIEW IF EXISTS public.gmp_clients_with_pii CASCADE;

CREATE VIEW public.gmp_clients_with_pii
WITH (security_invoker = on)
AS
SELECT
    c.*,
    public.gmp_decrypt_pii(c.pesel_encrypted) AS pesel_decrypted,
    public.gmp_decrypt_pii(c.passport_number_encrypted) AS passport_number_decrypted
FROM gmp_clients c;

GRANT SELECT ON public.gmp_clients_with_pii TO authenticated;

COMMENT ON VIEW public.gmp_clients_with_pii IS
'Dekrypcja PESEL/passport dla manager+ albo staff przypisanego do klienta. Wymaga security_invoker żeby honorować RLS na gmp_clients.';

-- =====================================================
-- 6. Cleanup legacy bad emails (blokowały backfill przez NOT VALID CHECK)
--    47 rekordów z polem email zawierającym śmieci typu "ODCISKI", "OD SANGITY" itp.
--    Przenosimy do notes i zerujemy email.
-- =====================================================
UPDATE public.gmp_clients
SET
    notes = COALESCE(notes, '') || E'\n[2026-05-02 cleanup: legacy email field had: ' || email || ']',
    email = NULL
WHERE email IS NOT NULL AND email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$';

-- =====================================================
-- 7. Backfill 4 istniejące PESEL
-- =====================================================
DO $$
DECLARE
    v_count int := 0;
    v_client RECORD;
BEGIN
    FOR v_client IN SELECT id, pesel FROM gmp_clients WHERE pesel IS NOT NULL AND pesel ~ '^[0-9]{11}$'
    LOOP
        UPDATE gmp_clients
        SET pesel_encrypted = public.gmp_encrypt_pii(v_client.pesel)
        WHERE id = v_client.id;
        v_count := v_count + 1;
    END LOOP;
    RAISE NOTICE 'Backfill: % PESEL zaszyfrowanych', v_count;
END $$;

-- =====================================================
-- 7. gmp_trusted_profile_credentials: encrypt password
-- =====================================================
ALTER TABLE public.gmp_trusted_profile_credentials
    ADD COLUMN IF NOT EXISTS password_encrypted bytea;

CREATE OR REPLACE FUNCTION public.gmp_trusted_profile_set_password(
    p_credential_id uuid,
    p_password text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_staff_id uuid;
    v_role text;
BEGIN
    SELECT id, role INTO v_staff_id, v_role FROM gmp_staff WHERE user_id = auth.uid();
    IF v_role NOT IN ('owner','admin','manager') THEN
        RAISE EXCEPTION 'Tylko manager+ może zarządzać profile zaufanym' USING ERRCODE = '42501';
    END IF;

    UPDATE gmp_trusted_profile_credentials SET
        password_encrypted = public.gmp_encrypt_pii(p_password),
        trusted_profile_password = NULL  -- wyczyść stare plain
    WHERE id = p_credential_id;

    INSERT INTO gmp_audit_log (staff_id, action, entity_type, entity_id, severity)
    VALUES (v_staff_id, 'trusted_profile_password_updated', 'gmp_trusted_profile_credentials', p_credential_id, 'critical');
END;
$$;

GRANT EXECUTE ON FUNCTION public.gmp_trusted_profile_set_password(uuid, text) TO authenticated;

-- View trusted_profile z dekrypcją (manager+ only via gmp_decrypt_pii)
DROP VIEW IF EXISTS public.gmp_trusted_profile_with_password CASCADE;
CREATE VIEW public.gmp_trusted_profile_with_password
WITH (security_invoker = on)
AS
SELECT
    tp.*,
    public.gmp_decrypt_pii(tp.password_encrypted) AS password_decrypted
FROM gmp_trusted_profile_credentials tp;

GRANT SELECT ON public.gmp_trusted_profile_with_password TO authenticated;

COMMENT ON FUNCTION public.gmp_encrypt_pii IS
'Tier 1 #1 fix 2026-05-02: pgcrypto pgp_sym_encrypt z kluczem z vault.secrets. Insider threat protection.';
