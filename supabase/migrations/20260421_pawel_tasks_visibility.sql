-- ============================================================
-- Uwagi Pawła 2026-04-20: Terminy + toggle widoczność
-- Źródło: uwagi-pawla-2026-04-20.md (pkt 9, 13)
-- ============================================================

-- =================================================================
-- 1) Pola na gmp_tasks
-- =================================================================
ALTER TABLE gmp_tasks
    ADD COLUMN IF NOT EXISTS task_type TEXT,
    ADD COLUMN IF NOT EXISTS show_in_calendar BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS visibility TEXT
        NOT NULL DEFAULT 'team'
        CHECK (visibility IN ('private','team'));

COMMENT ON COLUMN gmp_tasks.task_type IS
'Typ terminu: uzupelnienie_brakow_formalnych, uzupelnienie_dokumentow_merytorycznych, osobiste_stawiennictwo, platnosc_rata, ...';
COMMENT ON COLUMN gmp_tasks.show_in_calendar IS
'Czy zadanie ma być widoczne w kalendarzu (pkt 9 uwag Pawła).';
COMMENT ON COLUMN gmp_tasks.visibility IS
'private = tylko dla created_by, team = widoczne dla wszystkich (pkt 13 uwag Pawła).';

CREATE INDEX IF NOT EXISTS idx_tasks_calendar
    ON gmp_tasks(due_date) WHERE show_in_calendar = TRUE AND status != 'done';
CREATE INDEX IF NOT EXISTS idx_tasks_visibility
    ON gmp_tasks(visibility, created_by);


-- =================================================================
-- 2) Słownik typów terminów (dla dropdowna w UI)
-- =================================================================
CREATE TABLE IF NOT EXISTS gmp_task_types (
    code TEXT PRIMARY KEY,
    label TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0,
    icon TEXT,
    is_active BOOLEAN DEFAULT TRUE
);

ALTER TABLE gmp_task_types ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "task_types_read" ON gmp_task_types;
CREATE POLICY "task_types_read" ON gmp_task_types FOR SELECT TO authenticated USING (true);
GRANT SELECT ON gmp_task_types TO authenticated, anon;

INSERT INTO gmp_task_types (code, label, sort_order, icon) VALUES
    ('uzupelnienie_brakow_formalnych',      'Uzupełnienie braków formalnych',      10, 'ph-file-dashed'),
    ('uzupelnienie_dokumentow_merytorycznych', 'Uzupełnienie dok. merytorycznych', 20, 'ph-file-search'),
    ('osobiste_stawiennictwo',              'Osobiste stawiennictwo',              30, 'ph-user-check'),
    ('platnosc_rata',                        'Płatność — rata',                    40, 'ph-coins'),
    ('rozmowa_klient',                       'Rozmowa z klientem',                 50, 'ph-phone'),
    ('rozmowa_pracodawca',                   'Rozmowa z pracodawcą',               60, 'ph-buildings'),
    ('kontakt_urzad',                        'Kontakt z urzędem',                  70, 'ph-bank'),
    ('odbior_decyzji',                       'Odbiór decyzji',                     80, 'ph-seal-check'),
    ('inne',                                 'Inne',                               900, 'ph-dots-three')
ON CONFLICT (code) DO UPDATE SET
    label = EXCLUDED.label,
    sort_order = EXCLUDED.sort_order,
    icon = EXCLUDED.icon;
