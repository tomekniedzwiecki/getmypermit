-- ============================================================================
-- Pre-condition Etap III (B6) — szyfrowanie hasła Profilu Zaufanego (PZ)
-- Strategia: Supabase Vault (zamiast pgsodium) — każde hasło to osobny vault.secret
--   - Kolumna password_secret_id wskazuje na vault.secrets.id
--   - Dostęp przez vault.decrypted_secrets (RLS na vault, dostępny tylko service_role)
--   - UI wywołuje edge function która jako jedyna może czytać/pisać
-- ============================================================================

-- Dodaj kolumnę secret_id (FK do vault.secrets — bez constraint bo vault to inny schema)
ALTER TABLE gmp_trusted_profile_credentials
    ADD COLUMN IF NOT EXISTS password_secret_id UUID;

CREATE INDEX IF NOT EXISTS idx_pz_password_secret_id
    ON gmp_trusted_profile_credentials(password_secret_id) WHERE password_secret_id IS NOT NULL;

-- Stara kolumna trusted_profile_password — zostaje (NULLABLE) jako fallback dla legacy.
-- Po migracji wszystkie nowe wpisy idą przez password_secret_id.
-- Stara można dropować po pełnej migracji (sprawdzić: SELECT count(*) WHERE trusted_profile_password IS NOT NULL = 0)

COMMENT ON COLUMN gmp_trusted_profile_credentials.password_secret_id IS
'Pre-condition III/B6 — UUID vault.secrets z zaszyfrowanym hasłem PZ. Dostęp tylko przez edge function pz-credentials-read z logowaniem do gmp_credentials_access_log.';
COMMENT ON COLUMN gmp_trusted_profile_credentials.trusted_profile_password IS
'DEPRECATED — legacy plaintext password. Nie używać. Nowe wpisy idą przez password_secret_id (vault).';

-- RLS: tylko admin może SELECT (login + secret_id) bezpośrednio z DB
-- (czytanie hasła i tak wymaga edge function która ma service_role)
DROP POLICY IF EXISTS "staff_pz_credentials" ON gmp_trusted_profile_credentials;
DROP POLICY IF EXISTS "admin_pz_credentials_read" ON gmp_trusted_profile_credentials;
CREATE POLICY "admin_pz_credentials_read" ON gmp_trusted_profile_credentials
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM gmp_staff
            WHERE user_id = auth.uid() AND role IN ('admin', 'partner', 'owner')
        )
    );
DROP POLICY IF EXISTS "admin_pz_credentials_write" ON gmp_trusted_profile_credentials;
CREATE POLICY "admin_pz_credentials_write" ON gmp_trusted_profile_credentials
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM gmp_staff
            WHERE user_id = auth.uid() AND role IN ('admin', 'partner', 'owner')
        )
    );
