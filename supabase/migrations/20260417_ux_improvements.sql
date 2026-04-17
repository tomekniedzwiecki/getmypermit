-- UX improvements: pinned cases, user preferences

ALTER TABLE gmp_cases
    ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT FALSE;
CREATE INDEX IF NOT EXISTS idx_cases_pinned ON gmp_cases(is_pinned) WHERE is_pinned = TRUE;

-- User preferences (per auth user) - theme, favorites itp.
CREATE TABLE IF NOT EXISTS gmp_user_prefs (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    theme TEXT DEFAULT 'dark' CHECK (theme IN ('dark', 'light', 'auto')),
    pinned_cases UUID[] DEFAULT '{}',
    dashboard_widgets JSONB DEFAULT '[]',
    notifications_enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE gmp_user_prefs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own_prefs" ON gmp_user_prefs;
CREATE POLICY "own_prefs" ON gmp_user_prefs
    FOR ALL TO authenticated
    USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
