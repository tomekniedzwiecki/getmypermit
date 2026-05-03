-- 2026-05-03 prewencja: eliminacja root cause "new row violates RLS for gmp_clients".
--
-- Geneza: 25+ tabel gmp_* ma policies typu `WHERE gmp_staff.user_id = auth.uid()`.
-- Gdy konto auth.users powstaje ale `gmp_staff.user_id` zostanie NULL,
-- user moze sie zalogowac, ale wszystkie INSERT/UPDATE/DELETE → RLS deny.
-- Incydent 2026-05-03 (Pawel Stachurski) zostal naprawiony recznie; ten fix
-- zapobiega nawrotowi niezaleznie od drogi tworzenia konta (Dashboard, edge fn, manual SQL).

-- =====================================================
-- 1. Auto-link trigger AFTER INSERT/UPDATE OF email ON auth.users
-- =====================================================
-- SECURITY DEFINER + ograniczony search_path. Idempotentny — UPDATE z WHERE
-- zaaplikuje tylko na osierocone gmp_staff (user_id IS NULL) z matchujacym email.

CREATE OR REPLACE FUNCTION public.gmp_link_staff_on_auth_user_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE public.gmp_staff
    SET user_id = NEW.id
    WHERE user_id IS NULL
      AND email IS NOT NULL
      AND LOWER(email) = LOWER(NEW.email);
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_link_staff ON auth.users;
CREATE TRIGGER on_auth_user_link_staff
    AFTER INSERT OR UPDATE OF email ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.gmp_link_staff_on_auth_user_change();

COMMENT ON FUNCTION public.gmp_link_staff_on_auth_user_change() IS
'2026-05-03: auto-link gmp_staff.user_id po email match przy INSERT/UPDATE auth.users. Idempotentny.';

-- =====================================================
-- 2. RPC diagnostyczny — gmp_my_staff_status()
-- =====================================================
-- User moze samodzielnie sprawdzic czy ma poprawny linkup. Frontend wywolaje
-- to po loginie, zeby pokazac banner gdy `is_linked=false`.

CREATE OR REPLACE FUNCTION public.gmp_my_staff_status()
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT jsonb_build_object(
        'auth_uid', auth.uid(),
        'auth_email', (SELECT email FROM auth.users WHERE id = auth.uid()),
        'staff_id', (SELECT id FROM gmp_staff WHERE user_id = auth.uid()),
        'staff_email', (SELECT email FROM gmp_staff WHERE user_id = auth.uid()),
        'staff_full_name', (SELECT full_name FROM gmp_staff WHERE user_id = auth.uid()),
        'role', (SELECT role FROM gmp_staff WHERE user_id = auth.uid()),
        'is_active', COALESCE((SELECT is_active FROM gmp_staff WHERE user_id = auth.uid()), false),
        'is_linked', EXISTS (SELECT 1 FROM gmp_staff WHERE user_id = auth.uid()),
        'orphaned_staff_for_my_email', (
            SELECT jsonb_agg(jsonb_build_object(
                'staff_id', id,
                'email', email,
                'full_name', full_name,
                'role', role
            ))
            FROM gmp_staff
            WHERE user_id IS NULL
              AND email IS NOT NULL
              AND LOWER(email) = LOWER((SELECT email FROM auth.users WHERE id = auth.uid()))
        )
    );
$$;

GRANT EXECUTE ON FUNCTION public.gmp_my_staff_status() TO authenticated;

COMMENT ON FUNCTION public.gmp_my_staff_status() IS
'2026-05-03: zwraca status zalogowanego usera — czy gmp_staff.user_id jest poprawnie zlinkowane. Frontend healthcheck po loginie.';
