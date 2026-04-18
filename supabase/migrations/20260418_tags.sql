-- Generic tagging system: cases, leads, clients, employers

CREATE TABLE IF NOT EXISTS gmp_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    color TEXT NOT NULL DEFAULT '#6366f1',
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES gmp_staff(id)
);

CREATE TABLE IF NOT EXISTS gmp_entity_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type TEXT NOT NULL CHECK (entity_type IN ('case', 'lead', 'client', 'employer')),
    entity_id UUID NOT NULL,
    tag_id UUID REFERENCES gmp_tags(id) ON DELETE CASCADE,
    added_at TIMESTAMPTZ DEFAULT NOW(),
    added_by UUID REFERENCES gmp_staff(id),
    UNIQUE(entity_type, entity_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_entity_tags_lookup ON gmp_entity_tags(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_entity_tags_tag ON gmp_entity_tags(tag_id);

ALTER TABLE gmp_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE gmp_entity_tags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tags_all_auth" ON gmp_tags;
CREATE POLICY "tags_all_auth" ON gmp_tags FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "entity_tags_all_auth" ON gmp_entity_tags;
CREATE POLICY "entity_tags_all_auth" ON gmp_entity_tags FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- View: tagi per case w jednym JSON arrayu (efektywny query)
DROP VIEW IF EXISTS gmp_case_tags_view;
CREATE VIEW gmp_case_tags_view AS
SELECT
    et.entity_id AS case_id,
    jsonb_agg(jsonb_build_object('id', t.id, 'name', t.name, 'color', t.color) ORDER BY t.name) AS tags
FROM gmp_entity_tags et
JOIN gmp_tags t ON t.id = et.tag_id
WHERE et.entity_type = 'case'
GROUP BY et.entity_id;

GRANT SELECT ON gmp_case_tags_view TO authenticated, anon;

-- Seed domyślnych tagów kancelarii
INSERT INTO gmp_tags (name, color, description) VALUES
    ('pilne',                 '#ef4444', 'Wymagająca natychmiastowej uwagi'),
    ('VIP',                   '#f59e0b', 'Ważny klient'),
    ('konflikt-interesow',    '#f97316', 'Sprawa z konfliktem interesów'),
    ('trudny-klient',         '#dc2626', 'Klient wymagający szczególnej uwagi'),
    ('z-polecenia',           '#10b981', 'Sprawa z rekomendacji'),
    ('szybka-sciezka',        '#06b6d4', 'Sprawa priorytetowa do szybkiego załatwienia'),
    ('czeka-na-dokumenty',    '#f59e0b', 'Oczekuje na dokumenty od klienta'),
    ('czeka-na-tlumaczenie',  '#a855f7', 'Oczekuje na tłumaczenie przysięgłe'),
    ('konsulat',              '#8b5cf6', 'Wymaga wizyty w konsulacie'),
    ('odmowa-wstępna',        '#ef4444', 'Otrzymano wstępną odmowę urzędu'),
    ('bez-odciskow',          '#fb923c', 'Sprawa bez odcisków palców (priorytet wg wytycznych)'),
    ('rozliczenie-B2B',       '#3b82f6', 'Rozliczenie fakturowe z pracodawcą')
ON CONFLICT (name) DO NOTHING;
