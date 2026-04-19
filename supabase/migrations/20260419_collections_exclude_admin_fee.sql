-- Req Pawel pkt 3/6: oplata administracyjna to odrebna kategoria,
-- nie powinna pomniejszac wynagrodzenia ani zaleglosci wzgledem wynagrodzenia.
-- Widok gmp_collection_overview sumowal wszystkie platnosci jako spelnione,
-- wiec admin_fee zaniżał remaining_amount.

DROP VIEW IF EXISTS gmp_collection_overview;
CREATE VIEW gmp_collection_overview AS
SELECT
    c.id AS collection_id,
    c.case_id,
    c.status,
    c.level,
    c.assigned_to,
    c.last_contact_at,
    c.next_action_at,
    c.promise_to_pay_date,
    c.promise_to_pay_amount,
    c.total_due,
    c.amount_recovered,
    c.probability_score,
    c.priority_score,
    c.tone,
    c.attempted_calls,
    c.attempted_emails,
    c.attempted_letters,
    c.internal_notes,
    ca.case_number,
    ca.znak_sprawy,
    ca.client_id,
    ca.employer_id,
    ca.fee_amount,
    ca.date_accepted,
    ca.date_last_activity,
    ca.status AS case_status,
    cl.last_name,
    cl.first_name,
    cl.phone,
    cl.email,
    cl.birth_date,
    em.name AS employer_name,
    em.nip AS employer_nip,
    em.contact_phone AS employer_phone,
    em.contact_email AS employer_email,
    s.full_name AS assigned_name,
    -- Tylko platnosci za wynagrodzenie (kind != 'admin_fee')
    COALESCE((SELECT SUM(amount) FROM gmp_payments
              WHERE case_id = c.case_id AND kind IS DISTINCT FROM 'admin_fee'), 0) AS total_paid,
    GREATEST(0, COALESCE(ca.fee_amount, 0) - COALESCE(
        (SELECT SUM(amount) FROM gmp_payments
         WHERE case_id = c.case_id AND kind IS DISTINCT FROM 'admin_fee'), 0
    )) AS remaining_amount,
    (CURRENT_DATE - ca.date_accepted) AS days_since_accepted
FROM gmp_collections c
JOIN gmp_cases ca ON ca.id = c.case_id
LEFT JOIN gmp_clients cl ON cl.id = ca.client_id
LEFT JOIN gmp_employers em ON em.id = ca.employer_id
LEFT JOIN gmp_staff s ON s.id = c.assigned_to;
