-- ============================================================================
-- Etap II-B — § II-B.1 — Tabele gmp_checklist_definitions + gmp_case_checklists
-- ============================================================================

-- Wzorce — definicje per kategoria + sekcja
CREATE TABLE IF NOT EXISTS gmp_checklist_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_code TEXT NOT NULL REFERENCES gmp_case_categories(code) ON DELETE CASCADE,
    section TEXT NOT NULL,                    -- 'braki_formalne', 'braki_merytoryczne', 'dokumenty_wymagane', 'obliczenia_srodkow', 'elektroniczne_zlozenie_minimum'
    label TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0,
    is_required BOOLEAN DEFAULT TRUE,         -- TRUE = standardowy; FALSE = "+ DODATKOWE"
    parent_label TEXT,                        -- dla zagnieżdżeń: "Załącznik nr 1" → "Cz. III.5"
    helper_text TEXT,                         -- np. "ZUS P ZZA lub ZUA"
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_checklist_def_category
    ON gmp_checklist_definitions(category_code, section, sort_order);
CREATE INDEX IF NOT EXISTS idx_checklist_def_active
    ON gmp_checklist_definitions(category_code) WHERE is_active;

-- Konkretne pozycje sprawy
CREATE TABLE IF NOT EXISTS gmp_case_checklists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES gmp_cases ON DELETE CASCADE,
    definition_id UUID REFERENCES gmp_checklist_definitions ON DELETE SET NULL,
    section TEXT NOT NULL,
    label TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0,
    parent_label TEXT,
    helper_text TEXT,
    status gmp_checklist_status DEFAULT 'pending',
    notes TEXT,
    completed_at TIMESTAMPTZ,
    completed_by UUID REFERENCES gmp_staff,
    document_id UUID REFERENCES gmp_documents ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_case_checklist_case
    ON gmp_case_checklists(case_id, section, sort_order);
CREATE INDEX IF NOT EXISTS idx_case_checklist_status
    ON gmp_case_checklists(case_id, status);
CREATE INDEX IF NOT EXISTS idx_case_checklist_pending
    ON gmp_case_checklists(case_id, sort_order) WHERE status = 'pending';

-- RLS
ALTER TABLE gmp_checklist_definitions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "staff_read_def" ON gmp_checklist_definitions;
CREATE POLICY "staff_read_def" ON gmp_checklist_definitions
    FOR SELECT USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "admin_write_def" ON gmp_checklist_definitions;
CREATE POLICY "admin_write_def" ON gmp_checklist_definitions
    FOR ALL USING (
        EXISTS (SELECT 1 FROM gmp_staff WHERE user_id = auth.uid() AND role IN ('owner','admin'))
    );

ALTER TABLE gmp_case_checklists ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "staff_all_checklists" ON gmp_case_checklists;
CREATE POLICY "staff_all_checklists" ON gmp_case_checklists
    FOR ALL USING (auth.uid() IS NOT NULL);

-- Trigger: auto-completed_at gdy status zmieni się na 'done'
CREATE OR REPLACE FUNCTION gmp_checklist_auto_complete() RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'done' AND (OLD.status IS NULL OR OLD.status != 'done') THEN
        NEW.completed_at = NOW();
        IF NEW.completed_by IS NULL THEN
            NEW.completed_by = auth.uid();
        END IF;
    ELSIF NEW.status != 'done' AND OLD.status = 'done' THEN
        NEW.completed_at = NULL;
        NEW.completed_by = NULL;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_checklist_auto_complete ON gmp_case_checklists;
CREATE TRIGGER trg_checklist_auto_complete BEFORE UPDATE OF status ON gmp_case_checklists
    FOR EACH ROW EXECUTE FUNCTION gmp_checklist_auto_complete();
