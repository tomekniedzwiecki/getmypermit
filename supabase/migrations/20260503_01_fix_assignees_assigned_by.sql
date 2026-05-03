-- 2026-05-03: Fix gmp_sync_assigned_to_to_assignees — wstawia auth.uid() do FK assigned_by.
--
-- Problem: trigger sync mial `auth.uid()::uuid` wprost do gmp_case_assignees.assigned_by,
-- ktore jest FK do gmp_staff.id (NIE auth.users.id). FK violation byla cicha bo
-- "EXCEPTION WHEN others THEN RAISE NOTICE" wszystko polykal — primary assignee
-- nie powstawal, ale UI nie dostawal bledu.
--
-- Fix: mapujemy auth.uid() -> staff.id tak jak w innych funkcjach (gmp_set_client_created_by,
-- gmp_checklist_auto_complete itd.). Spojnie z konwencja projektu.

CREATE OR REPLACE FUNCTION public.gmp_sync_assigned_to_to_assignees()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
    v_assigned_by uuid;
BEGIN
    IF COALESCE(NEW.assigned_to::text,'') = COALESCE(OLD.assigned_to::text,'') THEN
        RETURN NEW;
    END IF;

    IF NEW.assigned_to IS NULL THEN
        UPDATE gmp_case_assignees
        SET role_type = 'secondary'
        WHERE case_id = NEW.id AND role_type = 'primary';
        RETURN NEW;
    END IF;

    IF EXISTS (SELECT 1 FROM gmp_case_assignees
               WHERE case_id = NEW.id AND staff_id = NEW.assigned_to) THEN
        UPDATE gmp_case_assignees SET role_type = 'primary'
        WHERE case_id = NEW.id AND staff_id = NEW.assigned_to;
    ELSE
        DELETE FROM gmp_case_assignees WHERE case_id = NEW.id AND role_type = 'primary';

        SELECT id INTO v_assigned_by FROM gmp_staff WHERE user_id = auth.uid() LIMIT 1;

        INSERT INTO gmp_case_assignees (case_id, staff_id, role_type, assigned_by)
        VALUES (NEW.id, NEW.assigned_to, 'primary', v_assigned_by);
    END IF;
    RETURN NEW;
EXCEPTION WHEN others THEN
    RAISE NOTICE 'sync_assigned_to_to_assignees: %', SQLERRM;
    RETURN NEW;
END;
$function$;

COMMENT ON FUNCTION public.gmp_sync_assigned_to_to_assignees() IS
'2026-05-03 fix: assigned_by -> staff_id (przez user_id mapping), nie auth.uid() bezposrednio. FK do gmp_staff.id.';
