-- ============================================================================
-- Etap IV.5 — Trigger przypomnień proceduralnych (B7 + C6)
-- Cel: gdy sprawa zmieni etap a brakuje znaku/daty przystąpienia → notyfikacja admin
-- ============================================================================

CREATE OR REPLACE FUNCTION gmp_remind_procedural_data() RETURNS TRIGGER AS $$
BEGIN
    IF NEW.stage IS DISTINCT FROM OLD.stage AND
       (NEW.kind::text LIKE 'przystapienie%' OR NEW.kind::text = 'przejeta_do_dalszego_prowadzenia') THEN
        IF NEW.znak_sprawy IS NULL OR NEW.date_joined IS NULL THEN
            PERFORM gmp_notify_admins(
                'inactivity_alert',
                'Brak danych proceduralnych',
                'Sprawa ' || COALESCE(NEW.case_number, NEW.id::text) ||
                ' przeszła do etapu ' || NEW.stage::text ||
                ' ale brakuje znaku sprawy lub daty przystąpienia',
                '/crm/case.html?id=' || NEW.id::text,
                'ph-warning', 'warn',
                'case', NEW.id,
                'remind-proc-' || NEW.id::text || '-' || NEW.stage::text
            );
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_remind_procedural_data ON gmp_cases;
CREATE TRIGGER trg_remind_procedural_data AFTER UPDATE OF stage ON gmp_cases
    FOR EACH ROW EXECUTE FUNCTION gmp_remind_procedural_data();

COMMENT ON FUNCTION gmp_remind_procedural_data() IS 'Pawel B7+C6 — alert gdy sprawa zmienia etap bez znaku sprawy/daty przystąpienia (tylko przystąpienia/przejęte).';
