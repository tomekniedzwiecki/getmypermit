-- ============================================================================
-- Etap I — § 1.3 — Cleanup kategorii: pawel_group + 2 nowe kategorie
-- ============================================================================
-- POPRAWKA po audycie 2026-04-30: nazwy kategorii w bazie są INNE niż
-- początkowo zakładał roadmap (pobyt_praca zamiast pc_praca itp.).
-- ============================================================================

-- Nowa kolumna pawel_group
ALTER TABLE gmp_case_categories ADD COLUMN IF NOT EXISTS pawel_group TEXT;

UPDATE gmp_case_categories SET pawel_group = CASE
    -- Pobyt czasowy + praca
    WHEN code = 'pobyt_praca' THEN 'pobyt_praca'
    -- Pobyt czasowy z rodziną
    WHEN code IN ('pobyt_laczenie_rodzina', 'pobyt_laczenie_ob_rp', 'pobyt_konkubinat') THEN 'pobyt_rodzina'
    -- Pobyt stały
    WHEN code IN ('pobyt_staly_malzenstwo', 'pobyt_staly_karta_polaka',
                  'pobyt_staly_polskie_pochodzenie', 'pobyt_staly_dziecko') THEN 'pobyt_staly'
    -- Rezydent UE
    WHEN code = 'rezydent' THEN 'rezydent_ue'
    -- Zezwolenie na pracę
    WHEN code IN ('pobyt_blue_card') THEN 'zezwolenie_praca'
    -- Legacy — trzymamy w 'inna_sprawa' (są is_active=FALSE)
    WHEN code IN ('pobyt', 'pozostale', 'zezwolenie_a', 'smart_work',
                  'lead_ewidencja', 'rozliczenie_historyczne', 'decyzja_historyczna') THEN 'inna_sprawa'
    -- Pozostałe (obywatelstwo, zaproszenie, wymiana_karty, ochrona_*, deportacja, transkrypcja, odwolanie_kategoria, pobyt_*, pobyt_studia, pobyt_jdg/spolka)
    ELSE 'inna_sprawa'
END
WHERE pawel_group IS NULL;

CREATE INDEX IF NOT EXISTS idx_categories_pawel_group ON gmp_case_categories(pawel_group, is_active);

COMMENT ON COLUMN gmp_case_categories.pawel_group IS
'Grupa kategorii wg mappingu Pawła v3 (7 grup): pobyt_praca, pobyt_rodzina, pobyt_staly, rezydent_ue, zezwolenie_praca, kontrola_legalnosci, inna_sprawa. Używana w filtrach Kanban i raportach.';

-- Nowe kategorie wprowadzane z wymagań Pawła
INSERT INTO gmp_case_categories (code, label, group_label, pawel_group, sort_order, is_active)
VALUES
    ('kontrola_legalnosci_zatrudnienia', 'Kontrola legalności zatrudnienia', 'Inne', 'kontrola_legalnosci', 100, TRUE),
    ('zez_a', 'Zezwolenie na pracę typ A', 'Zezwolenia na pracę', 'zezwolenie_praca', 50, TRUE)
ON CONFLICT (code) DO UPDATE SET pawel_group = EXCLUDED.pawel_group;

-- Sprawdzenie po wykonaniu:
-- SELECT pawel_group, COUNT(*) FROM gmp_case_categories WHERE is_active GROUP BY 1 ORDER BY 2 DESC;
