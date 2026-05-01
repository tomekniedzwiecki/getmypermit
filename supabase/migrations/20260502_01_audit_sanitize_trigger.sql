-- BLK-4: Trigger podpinajacy gmp_sanitize_audit_jsonb przed INSERT-em do gmp_audit_log
-- Funkcja gmp_sanitize_audit_jsonb(p_data) istnieje od wczesniejszych migracji (sprawdzone 2026-05-01).
-- Brak triggera = sensitive klucze (pesel, passport_number, trusted_profile_*) leca do logu.

CREATE OR REPLACE FUNCTION public.gmp_audit_log_sanitize_tg()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.before_data := public.gmp_sanitize_audit_jsonb(NEW.before_data);
    NEW.after_data  := public.gmp_sanitize_audit_jsonb(NEW.after_data);
    NEW.metadata    := public.gmp_sanitize_audit_jsonb(NEW.metadata);
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_sanitize ON public.gmp_audit_log;

CREATE TRIGGER trg_audit_sanitize
BEFORE INSERT ON public.gmp_audit_log
FOR EACH ROW
EXECUTE FUNCTION public.gmp_audit_log_sanitize_tg();

COMMENT ON TRIGGER trg_audit_sanitize ON public.gmp_audit_log IS
'BLK-4 fix 2026-05-02: usuwa pesel/passport_number/trusted_profile_* z before_data/after_data/metadata przed zapisem audytu.';
