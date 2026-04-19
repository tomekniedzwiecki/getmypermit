-- E5 (req Pawel): per-pracownik overrides uprawnien ponad default z roli.
-- Struktura: { "<permission_key>": true|false, ... }. Brak klucza = uzyj defaultu z roli.
-- Przyklad: lawyer z overridem { "view_global_finance": true } widzi finanse mimo ze rola normalnie nie ma.

ALTER TABLE gmp_staff ADD COLUMN IF NOT EXISTS permission_overrides JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN gmp_staff.permission_overrides IS
    'Mapa overrides: { "permission_key": true|false }. Puste = uzyj defaultu z roli.';
