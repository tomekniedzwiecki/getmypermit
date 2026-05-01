-- ============================================================================
-- Etap V.3 — Backfill: auto-grupy 'pracodawca' z istniejących pracodawców
-- Cel: dla każdego pracodawcy z >=2 sprawami utwórz grupę typu pracodawca
-- ============================================================================

-- Krok 1: utwórz grupy
INSERT INTO gmp_case_groups (name, type, employer_id, is_active)
SELECT e.name, 'pracodawca'::gmp_case_group_type, e.id, TRUE
FROM gmp_employers e
WHERE EXISTS (
    SELECT 1 FROM gmp_cases
    WHERE employer_id = e.id
    GROUP BY employer_id HAVING COUNT(*) >= 2
)
AND NOT EXISTS (
    SELECT 1 FROM gmp_case_groups g
    WHERE g.employer_id = e.id AND g.type = 'pracodawca'
);

-- Krok 2: dodaj członków (sprawy z employer_id wskazującym na grupę)
INSERT INTO gmp_case_group_members (group_id, case_id)
SELECT g.id, c.id
FROM gmp_case_groups g
JOIN gmp_cases c ON c.employer_id = g.employer_id
WHERE g.type = 'pracodawca'
ON CONFLICT DO NOTHING;
