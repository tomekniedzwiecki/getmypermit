-- Fix: widok z poprawna logika remaining_amount
-- Problem: total_due bylo snapshot 'fee - paid' przy init, view odejmowal payments znowu (double subtract)
-- Fix: remaining_amount = fee_amount - sum(payments)

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
    COALESCE((SELECT SUM(amount) FROM gmp_payments WHERE case_id = c.case_id), 0) AS total_paid,
    -- Poprawne: remaining = full fee - total paid (nie total_due ktore bylo juz remaining)
    GREATEST(0, COALESCE(ca.fee_amount, 0) - COALESCE((SELECT SUM(amount) FROM gmp_payments WHERE case_id = c.case_id), 0)) AS remaining_amount,
    (CURRENT_DATE - ca.date_accepted) AS days_since_accepted
FROM gmp_collections c
JOIN gmp_cases ca ON ca.id = c.case_id
LEFT JOIN gmp_clients cl ON cl.id = ca.client_id
LEFT JOIN gmp_employers em ON em.id = ca.employer_id
LEFT JOIN gmp_staff s ON s.id = c.assigned_to;

-- Usun collection recordy dla spraw juz oplaconych (lub nadplaconych)
DELETE FROM gmp_collections
WHERE case_id IN (
    SELECT c.id FROM gmp_cases c
    WHERE c.fee_amount IS NULL OR c.fee_amount <= COALESCE(
        (SELECT SUM(amount) FROM gmp_payments WHERE case_id = c.id), 0
    )
);
