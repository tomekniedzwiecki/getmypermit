-- ============================================================
-- Uwagi Pawła 2026-04-20: Słowniki v2
-- Źródło: uwagi-pawla-2026-04-20.md (pkt 3, 4, 5, 6, 7)
-- ============================================================

-- =================================================================
-- 1) ETAPY SPRAWY (pkt 3) — dodać 6 nowych wartości do enum
-- =================================================================
DO $$ BEGIN
    ALTER TYPE gmp_case_stage ADD VALUE IF NOT EXISTS 'wezwanie';
EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN
    ALTER TYPE gmp_case_stage ADD VALUE IF NOT EXISTS 'uzupelnienie_dokumentow';
EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN
    ALTER TYPE gmp_case_stage ADD VALUE IF NOT EXISTS 'przyspieszenie';
EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN
    ALTER TYPE gmp_case_stage ADD VALUE IF NOT EXISTS 'wydluzenie_terminu';
EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN
    ALTER TYPE gmp_case_stage ADD VALUE IF NOT EXISTS 'przeniesienie_z_innego_wojewodztwa';
EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN
    ALTER TYPE gmp_case_stage ADD VALUE IF NOT EXISTS 'wniosek_przeniesiony';
EXCEPTION WHEN others THEN NULL; END $$;


-- =================================================================
-- 2) KATEGORIE (pkt 5) — nowa tabela słownika + seed pełnej listy
-- =================================================================
CREATE TABLE IF NOT EXISTS gmp_case_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    label TEXT NOT NULL,
    group_label TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE gmp_case_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "case_categories_read" ON gmp_case_categories;
CREATE POLICY "case_categories_read" ON gmp_case_categories FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "case_categories_admin_write" ON gmp_case_categories;
CREATE POLICY "case_categories_admin_write" ON gmp_case_categories FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM gmp_staff s WHERE s.user_id = auth.uid() AND s.role IN ('owner','admin','manager')))
    WITH CHECK (EXISTS (SELECT 1 FROM gmp_staff s WHERE s.user_id = auth.uid() AND s.role IN ('owner','admin','manager')));

GRANT SELECT ON gmp_case_categories TO authenticated, anon;

-- Seed kategorii wg uwag Pawła pkt 5
INSERT INTO gmp_case_categories (code, label, group_label, sort_order) VALUES
    -- POBYT CZASOWY
    ('pobyt_praca',                 'Pobyt — praca',                       'Pobyt czasowy', 10),
    ('pobyt_inne_urzedy',           'Pobyt — inne urzędy',                 'Pobyt czasowy', 20),
    ('pobyt_laczenie_rodzina',      'Pobyt — łączenie z rodziną',          'Pobyt czasowy', 30),
    ('pobyt_poza_rp',               'Pobyt — poza RP',                     'Pobyt czasowy', 40),
    ('pobyt_laczenie_ob_rp',        'Pobyt — łączenie z ob. RP',           'Pobyt czasowy', 50),
    ('pobyt_jdg_ukr',               'Pobyt — JDG UKR',                     'Pobyt czasowy', 60),
    ('pobyt_jdg',                   'Pobyt — JDG',                         'Pobyt czasowy', 70),
    ('pobyt_spolka',                'Pobyt — spółka',                      'Pobyt czasowy', 80),
    ('pobyt_blue_card',             'Pobyt — blue card',                   'Pobyt czasowy', 90),
    ('pobyt_konkubinat',            'Pobyt — konkubinat',                  'Pobyt czasowy', 100),
    ('pobyt_studia',                'Pobyt — studia',                      'Pobyt czasowy', 110),

    -- POBYT STAŁY
    ('pobyt_staly_malzenstwo',      'Pobyt stały — małżeństwo',            'Pobyt stały',   200),
    ('pobyt_staly_karta_polaka',    'Pobyt stały — karta polaka',          'Pobyt stały',   210),
    ('pobyt_staly_polskie_pochodzenie', 'Pobyt stały — polskie pochodzenie', 'Pobyt stały', 220),
    ('pobyt_staly_dziecko',         'Pobyt stały — dziecko',               'Pobyt stały',   230),

    -- INNE
    ('rezydent',                    'Rezydent',                            'Inne',          300),
    ('obywatelstwo_nadanie',        'Obywatelstwo — nadanie',              'Inne',          310),
    ('obywatelstwo_uznanie',        'Obywatelstwo — uznanie',              'Inne',          320),
    ('zaproszenie',                 'Zaproszenie',                         'Inne',          330),
    ('wymiana_karty',               'Wymiana karty',                       'Inne',          340),
    ('zmiana_decyzji',              'Zmiana decyzji',                      'Inne',          350),
    ('ochrona_miedzynarodowa',      'Ochrona międzynarodowa',              'Inne',          360),
    ('deportacja',                  'Deportacja',                          'Inne',          370),
    ('transkrypcja',                'Transkrypcja',                        'Inne',          380),
    ('odwolanie_kategoria',         'Odwołanie',                           'Inne',          390)
ON CONFLICT (code) DO UPDATE SET
    label = EXCLUDED.label,
    group_label = EXCLUDED.group_label,
    sort_order = EXCLUDED.sort_order;

-- Oznacz stare kategorie (niezgodne z listą Pawła) jako nieaktywne — ale zostaw w słowniku
-- żeby historyczne sprawy miały label. Pobierane będą tylko is_active=TRUE w dropdownach.
INSERT INTO gmp_case_categories (code, label, group_label, sort_order, is_active) VALUES
    ('pobyt',                       '[LEGACY] Pobyt (stara)',              'Legacy', 9000, FALSE),
    ('pozostale',                   '[LEGACY] Pozostałe (stara)',          'Legacy', 9010, FALSE),
    ('zezwolenie_a',                '[LEGACY] Zezwolenie typ A',           'Legacy', 9020, FALSE),
    ('smart_work',                  '[LEGACY] Smart Work',                 'Legacy', 9030, FALSE),
    ('lead_ewidencja',              '[LEGACY] Z ewidencji spotkań',        'Legacy', 9040, FALSE),
    ('rozliczenie_historyczne',     '[LEGACY] Historyczne (rozliczenia)',  'Legacy', 9050, FALSE),
    ('decyzja_historyczna',         '[LEGACY] Odebrane decyzje',           'Legacy', 9060, FALSE)
ON CONFLICT (code) DO NOTHING;


-- =================================================================
-- 3) TAGI (pkt 4) — dodanie 8 nowych do gmp_tags
-- =================================================================
INSERT INTO gmp_tags (name, color, description) VALUES
    ('czeka-na-przeniesienie',    '#8b5cf6', 'Sprawa oczekuje na przeniesienie z innego województwa'),
    ('czeka-na-dok-pracodawcy',   '#f59e0b', 'Oczekuje na dokumenty od pracodawcy'),
    ('APT',                       '#06b6d4', 'Oznaczenie: APT'),
    ('OUTSOURCING',               '#3b82f6', 'Oznaczenie: OUTSOURCING'),
    ('problematyczny',            '#dc2626', 'Problematyczna sprawa'),
    ('pretensje',                 '#f97316', 'Klient zgłosił pretensje'),
    ('brak-reakcji-urzedu',       '#ef4444', 'Brak reakcji ze strony urzędu'),
    ('zaleglosci-finansowe',      '#be123c', 'Sprawa z zaległościami finansowymi')
ON CONFLICT (name) DO UPDATE SET
    description = EXCLUDED.description,
    color = EXCLUDED.color;


-- =================================================================
-- 4) ODDZIAŁY (pkt 7)
-- Usunąć: OCII, OCI, OBYWATELSTWO, DUE (tj. rezydent)
-- Zostawić / dodać: PC 1, PC 2, PC 3, PC 4, OP — OBYWATELSTWO
-- =================================================================

-- Bezpieczne usunięcie: najpierw odepnij z gmp_cases (ustaw NULL), potem usuń z tabeli
DO $$
DECLARE
    v_duw_office_id UUID;
BEGIN
    -- Najpierw upewnij się że DUW Wrocław istnieje (główny urząd dla wszystkich PC)
    INSERT INTO gmp_offices (name, city, code)
    VALUES ('Dolnośląski Urząd Wojewódzki we Wrocławiu', 'WROCŁAW', 'DUW_WROCLAW')
    ON CONFLICT (code) DO NOTHING;

    SELECT id INTO v_duw_office_id FROM gmp_offices WHERE code = 'DUW_WROCLAW';

    -- Usuń z gmp_cases FK do oddziałów które mamy usunąć
    UPDATE gmp_cases SET department_id = NULL
    WHERE department_id IN (
        SELECT id FROM gmp_office_departments
        WHERE code IN ('OCII', 'OC II', 'OCI', 'OBYWATELSTWO', 'DUE')
    );

    -- Usuń stare oddziały wg uwag pkt 7 (OCII, OCI, OBYWATELSTWO, DUE-rezydent)
    DELETE FROM gmp_office_departments
    WHERE code IN ('OCII', 'OC II', 'OCI', 'OBYWATELSTWO', 'DUE');

    -- Dodaj / zaktualizuj pożądane oddziały (w DUW Wrocław)
    IF v_duw_office_id IS NOT NULL THEN
        INSERT INTO gmp_office_departments (office_id, code, name) VALUES
            (v_duw_office_id, 'PC 1',            'Punkt Cudzoziemców 1'),
            (v_duw_office_id, 'PC 2',            'Punkt Cudzoziemców 2'),
            (v_duw_office_id, 'PC 3',            'Punkt Cudzoziemców 3'),
            (v_duw_office_id, 'PC 4',            'Punkt Cudzoziemców 4'),
            (v_duw_office_id, 'OP — OBYWATELSTWO', 'Oddział Pobytu — Obywatelstwo')
        ON CONFLICT (office_id, code) DO UPDATE SET name = EXCLUDED.name;
    END IF;
END $$;


-- =================================================================
-- 5) OPIEKUNOWIE (pkt 6) — oznaczyć nieaktywnych
-- NIE DELETE — żeby nie zepsuć FK do istniejących spraw/aktywności
-- =================================================================
UPDATE gmp_staff
SET is_active = FALSE
WHERE lower(full_name) IN (
    'mateusz lis',
    'olha kovalova',
    'konto testowe',
    'michał',
    'michal',
    'natalia'
);


-- =================================================================
-- 6) INDEKS na gmp_case_categories
-- =================================================================
CREATE INDEX IF NOT EXISTS idx_case_categories_active
    ON gmp_case_categories(is_active, sort_order) WHERE is_active = TRUE;


COMMENT ON TABLE gmp_case_categories IS
'Słownik kategorii spraw — zgodny z listą Pawła z 2026-04-20 (uwagi pkt 5). Legacy kategorie oznaczone is_active=FALSE.';
