-- ============================================================================
-- Etap II-B — § II-B.2 — RPC gmp_instantiate_checklist + auto-trigger
-- ============================================================================

CREATE OR REPLACE FUNCTION gmp_instantiate_checklist(p_case_id UUID, p_force BOOLEAN DEFAULT FALSE)
RETURNS INT AS $$
DECLARE
    v_category TEXT;
    v_count INT;
BEGIN
    SELECT category INTO v_category FROM gmp_cases WHERE id = p_case_id;
    IF v_category IS NULL THEN RETURN 0; END IF;

    -- Jeśli force, usuń istniejące pending wpisy które jeszcze nie były tknięte
    IF p_force THEN
        DELETE FROM gmp_case_checklists
        WHERE case_id = p_case_id AND status = 'pending' AND notes IS NULL AND completed_at IS NULL;
    END IF;

    INSERT INTO gmp_case_checklists (
        case_id, definition_id, section, label, sort_order, parent_label, helper_text
    )
    SELECT
        p_case_id, def.id, def.section, def.label, def.sort_order, def.parent_label, def.helper_text
    FROM gmp_checklist_definitions def
    WHERE def.category_code = v_category AND def.is_active
      AND NOT EXISTS (
          SELECT 1 FROM gmp_case_checklists cc
          WHERE cc.case_id = p_case_id AND cc.definition_id = def.id
      );

    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION gmp_instantiate_checklist TO authenticated;

-- Trigger: auto-instantiate przy zmianie kategorii sprawy
CREATE OR REPLACE FUNCTION gmp_auto_instantiate_checklist() RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT' AND NEW.category IS NOT NULL) OR
       (TG_OP = 'UPDATE' AND NEW.category IS DISTINCT FROM OLD.category AND NEW.category IS NOT NULL) THEN
        PERFORM gmp_instantiate_checklist(NEW.id, FALSE);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_auto_instantiate_checklist ON gmp_cases;
CREATE TRIGGER trg_auto_instantiate_checklist
    AFTER INSERT OR UPDATE OF category ON gmp_cases
    FOR EACH ROW EXECUTE FUNCTION gmp_auto_instantiate_checklist();
