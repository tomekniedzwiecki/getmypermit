-- Saved views - zapisane kombinacje filtrów per user+page

CREATE TABLE IF NOT EXISTS gmp_saved_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID REFERENCES gmp_staff(id) ON DELETE CASCADE,
    page TEXT NOT NULL,              -- 'cases', 'leads', 'receivables', ...
    name TEXT NOT NULL,
    filters JSONB NOT NULL DEFAULT '{}'::jsonb,
    icon TEXT,                       -- phosphor icon class
    color TEXT,                      -- hex
    is_shared BOOLEAN DEFAULT false, -- widoczne dla wszystkich
    sort_order INT DEFAULT 100,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_saved_views_owner_page ON gmp_saved_views(owner_id, page, sort_order);
CREATE INDEX IF NOT EXISTS idx_saved_views_shared ON gmp_saved_views(page, is_shared) WHERE is_shared = true;

ALTER TABLE gmp_saved_views ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "saved_views_read_own_or_shared" ON gmp_saved_views;
CREATE POLICY "saved_views_read_own_or_shared" ON gmp_saved_views FOR SELECT TO authenticated
    USING (is_shared = true OR owner_id IN (SELECT id FROM gmp_staff WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "saved_views_insert_own" ON gmp_saved_views;
CREATE POLICY "saved_views_insert_own" ON gmp_saved_views FOR INSERT TO authenticated
    WITH CHECK (owner_id IN (SELECT id FROM gmp_staff WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "saved_views_update_own" ON gmp_saved_views;
CREATE POLICY "saved_views_update_own" ON gmp_saved_views FOR UPDATE TO authenticated
    USING (owner_id IN (SELECT id FROM gmp_staff WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "saved_views_delete_own" ON gmp_saved_views;
CREATE POLICY "saved_views_delete_own" ON gmp_saved_views FOR DELETE TO authenticated
    USING (owner_id IN (SELECT id FROM gmp_staff WHERE user_id = auth.uid()));
