-- ============================================================================
-- Etap IV.3 — View gmp_case_completeness (D5)
-- Cel: % kompletności danych sprawy (REGULAR view, plan B = MV jeśli wolne)
-- ============================================================================

CREATE OR REPLACE VIEW gmp_case_completeness AS
SELECT
    c.id AS case_id,
    -- Dane przy przyjęciu
    (c.client_id IS NOT NULL) AS has_client,
    (c.assigned_to IS NOT NULL) AS has_owner,
    (cl.phone IS NOT NULL OR cl.email IS NOT NULL) AS has_contact,
    (c.category IS NOT NULL) AS has_category,
    (c.kind IS NOT NULL) AS has_kind,
    -- Dane proceduralne (głównie dla przystąpień)
    (c.date_joined IS NOT NULL) AS has_date_joined,
    (c.znak_sprawy IS NOT NULL) AS has_znak,
    (c.office_id IS NOT NULL) AS has_office,
    (c.date_submitted IS NOT NULL) AS has_date_submitted,
    (c.date_decision IS NOT NULL) AS has_date_decision,
    -- Total %
    CASE
        WHEN c.kind::text LIKE 'przystapienie%' OR c.kind::text = 'przejeta_do_dalszego_prowadzenia' THEN
            (CASE WHEN c.date_joined IS NOT NULL THEN 1 ELSE 0 END +
             CASE WHEN c.znak_sprawy IS NOT NULL THEN 1 ELSE 0 END +
             CASE WHEN c.office_id IS NOT NULL THEN 1 ELSE 0 END +
             CASE WHEN c.date_submitted IS NOT NULL THEN 1 ELSE 0 END)::FLOAT / 4 * 100
        ELSE
            (CASE WHEN c.client_id IS NOT NULL THEN 1 ELSE 0 END +
             CASE WHEN c.assigned_to IS NOT NULL THEN 1 ELSE 0 END +
             CASE WHEN c.category IS NOT NULL THEN 1 ELSE 0 END)::FLOAT / 3 * 100
    END AS completeness_percent
FROM gmp_cases c
LEFT JOIN gmp_clients cl ON cl.id = c.client_id;

GRANT SELECT ON gmp_case_completeness TO authenticated;

COMMENT ON VIEW gmp_case_completeness IS 'Pawel D5 — % wypełnienia danych sprawy. REGULAR view, plan B: MATERIALIZED jeśli p95>200ms.';
