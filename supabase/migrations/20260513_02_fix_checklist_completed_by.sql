-- ============================================================================
-- Etap II-B BUG FIX — gmp_checklist_auto_complete trigger
-- ============================================================================
-- Problem: trigger ustawiał completed_by = auth.uid() (user_id z auth.users),
-- ale FK wymaga gmp_staff.id (inny UUID). Kazdy klik checkboxa = 409 Conflict.
--
-- Fix: zmapować auth.uid() na gmp_staff.id przez SELECT.
-- ============================================================================

CREATE OR REPLACE FUNCTION gmp_checklist_auto_complete() RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'done' AND (OLD.status IS NULL OR OLD.status != 'done') THEN
        NEW.completed_at = NOW();
        IF NEW.completed_by IS NULL THEN
            -- BUG FIX: auth.uid() jest user_id, nie staff.id
            -- Mapowanie: znajdź gmp_staff.id powiązany z aktualnym user_id
            NEW.completed_by = (SELECT id FROM gmp_staff WHERE user_id = auth.uid() LIMIT 1);
        END IF;
    ELSIF NEW.status != 'done' AND OLD.status = 'done' THEN
        NEW.completed_at = NULL;
        NEW.completed_by = NULL;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger już istnieje, ale CREATE OR REPLACE FUNCTION powyżej go aktualizuje
