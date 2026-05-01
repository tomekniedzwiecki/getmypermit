-- ============================================================================
-- Etap VII.1 — Automatyzacje (foundation: flows + steps + executions)
-- Cel: definicje automatyzacji wyzwalanych eventami (stage_change, decision, etc.)
-- ============================================================================

-- Trigger types — które eventy mogą uruchomić flow
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'gmp_automation_trigger_type') THEN
        CREATE TYPE gmp_automation_trigger_type AS ENUM (
            'stage_changed',           -- gmp_cases.stage zmieniony
            'status_changed',          -- gmp_cases.status zmieniony
            'decision_received',       -- decision_outcome wypełnione
            'document_added',          -- nowy gmp_documents
            'task_overdue',            -- task po terminie
            'inactivity_alert',        -- gmp_case_alerts inactive_30
            'legal_stay_expiring',     -- legal_stay_status zmienia na czerwony
            'manual'                   -- ręczne uruchomienie
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'gmp_automation_action_type') THEN
        CREATE TYPE gmp_automation_action_type AS ENUM (
            'create_task',             -- utworzy gmp_tasks
            'create_appointment',      -- utworzy gmp_crm_appointments
            'send_notification',       -- gmp_notify_admins
            'set_field',               -- ustaw kolumnę na sprawie
            'add_to_group',            -- dodaj do grupy
            'add_checklist_item'       -- dodaj checklist
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'gmp_automation_status') THEN
        CREATE TYPE gmp_automation_status AS ENUM ('pending', 'running', 'success', 'failed', 'skipped');
    END IF;
END$$;

-- ============================================================================
-- gmp_automation_flows — definicje
-- ============================================================================
CREATE TABLE IF NOT EXISTS gmp_automation_flows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    trigger_type gmp_automation_trigger_type NOT NULL,
    -- Filtr triggera (JSON): np. {"to_stage": "decyzja", "category": "praca"}
    trigger_filter JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES gmp_staff,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_automation_flows_trigger
    ON gmp_automation_flows(trigger_type, is_active) WHERE is_active = TRUE;

-- ============================================================================
-- gmp_automation_steps — kroki w ramach flow
-- ============================================================================
CREATE TABLE IF NOT EXISTS gmp_automation_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    flow_id UUID NOT NULL REFERENCES gmp_automation_flows ON DELETE CASCADE,
    step_order INT NOT NULL,
    action_type gmp_automation_action_type NOT NULL,
    -- Parametry akcji (JSON): np. {"title": "Sprawdź dokumenty", "due_in_days": 3}
    action_params JSONB DEFAULT '{}'::jsonb,
    -- Opóźnienie wykonania (sekundy) — 0 = natychmiast
    delay_seconds INT DEFAULT 0,
    UNIQUE (flow_id, step_order)
);

CREATE INDEX IF NOT EXISTS idx_automation_steps_flow ON gmp_automation_steps(flow_id, step_order);

-- ============================================================================
-- gmp_automation_executions — log wykonań
-- ============================================================================
CREATE TABLE IF NOT EXISTS gmp_automation_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    flow_id UUID NOT NULL REFERENCES gmp_automation_flows ON DELETE CASCADE,
    case_id UUID REFERENCES gmp_cases ON DELETE CASCADE,
    triggered_at TIMESTAMPTZ DEFAULT NOW(),
    -- Kontekst triggera (JSON) — co spowodowało uruchomienie
    trigger_context JSONB DEFAULT '{}'::jsonb,
    status gmp_automation_status DEFAULT 'pending',
    -- Step do wykonania (NULL = wszystkie skończone)
    next_step_order INT DEFAULT 1,
    -- Kiedy wykonać następny krok (uwzględniając delay)
    next_run_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    error_message TEXT,
    -- Log akcji (JSONB array): {step_order, action_type, result, ts}
    log JSONB DEFAULT '[]'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_automation_executions_pending
    ON gmp_automation_executions(next_run_at) WHERE status IN ('pending', 'running');
CREATE INDEX IF NOT EXISTS idx_automation_executions_case
    ON gmp_automation_executions(case_id, triggered_at DESC) WHERE case_id IS NOT NULL;

-- ============================================================================
-- RLS
-- ============================================================================
ALTER TABLE gmp_automation_flows ENABLE ROW LEVEL SECURITY;
ALTER TABLE gmp_automation_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE gmp_automation_executions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_automation_flows" ON gmp_automation_flows;
CREATE POLICY "staff_automation_flows" ON gmp_automation_flows FOR ALL USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "staff_automation_steps" ON gmp_automation_steps;
CREATE POLICY "staff_automation_steps" ON gmp_automation_steps FOR ALL USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "staff_automation_executions" ON gmp_automation_executions;
CREATE POLICY "staff_automation_executions" ON gmp_automation_executions FOR ALL USING (auth.uid() IS NOT NULL);

-- ============================================================================
-- Trigger na gmp_cases — wyzwala stage_changed
-- ============================================================================
CREATE OR REPLACE FUNCTION gmp_automation_trigger_stage_change() RETURNS TRIGGER AS $$
BEGIN
    IF NEW.stage IS DISTINCT FROM OLD.stage THEN
        INSERT INTO gmp_automation_executions (flow_id, case_id, trigger_context)
        SELECT
            f.id,
            NEW.id,
            jsonb_build_object(
                'from_stage', OLD.stage,
                'to_stage', NEW.stage,
                'category', NEW.category,
                'kind', NEW.kind
            )
        FROM gmp_automation_flows f
        WHERE f.is_active = TRUE
          AND f.trigger_type = 'stage_changed'
          AND (
              f.trigger_filter = '{}'::jsonb
              OR (f.trigger_filter ->> 'to_stage' IS NULL OR f.trigger_filter ->> 'to_stage' = NEW.stage::text)
          );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_automation_stage_change ON gmp_cases;
CREATE TRIGGER trg_automation_stage_change AFTER UPDATE OF stage ON gmp_cases
    FOR EACH ROW EXECUTE FUNCTION gmp_automation_trigger_stage_change();

-- ============================================================================
-- Trigger na decision_outcome
-- ============================================================================
CREATE OR REPLACE FUNCTION gmp_automation_trigger_decision() RETURNS TRIGGER AS $$
BEGIN
    IF NEW.decision_outcome IS DISTINCT FROM OLD.decision_outcome AND NEW.decision_outcome IS NOT NULL THEN
        INSERT INTO gmp_automation_executions (flow_id, case_id, trigger_context)
        SELECT
            f.id,
            NEW.id,
            jsonb_build_object(
                'decision_outcome', NEW.decision_outcome,
                'category', NEW.category,
                'date_decision', NEW.date_decision
            )
        FROM gmp_automation_flows f
        WHERE f.is_active = TRUE AND f.trigger_type = 'decision_received';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_automation_decision ON gmp_cases;
CREATE TRIGGER trg_automation_decision AFTER UPDATE OF decision_outcome ON gmp_cases
    FOR EACH ROW EXECUTE FUNCTION gmp_automation_trigger_decision();

COMMENT ON TABLE gmp_automation_flows IS 'Pawel VII.1 — definicje automatyzacji (event-driven flows)';
COMMENT ON TABLE gmp_automation_steps IS 'Kroki flow — sequence of actions (create_task/notification/etc)';
COMMENT ON TABLE gmp_automation_executions IS 'Log wykonań flow per case + status + retry data';
