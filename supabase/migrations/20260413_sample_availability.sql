-- Sample availability data for demo
-- Run this after 20260413_availability_appointments.sql

-- Add Monday-Friday 9:00-17:00 availability for all active lawyers
-- with 30 minute slots

INSERT INTO gmp_lawyer_availability (lawyer_id, day_of_week, start_time, end_time, slot_duration, is_active)
SELECT
    l.id as lawyer_id,
    d.day_of_week,
    '09:00:00'::TIME as start_time,
    '17:00:00'::TIME as end_time,
    30 as slot_duration,
    true as is_active
FROM gmp_lawyers l
CROSS JOIN (
    SELECT 1 as day_of_week UNION ALL  -- Monday
    SELECT 2 UNION ALL                  -- Tuesday
    SELECT 3 UNION ALL                  -- Wednesday
    SELECT 4 UNION ALL                  -- Thursday
    SELECT 5                            -- Friday
) d
WHERE l.is_active = true
ON CONFLICT (lawyer_id, day_of_week, start_time) DO NOTHING;

-- Optional: Add some afternoon slots on Saturday for selected lawyers
-- INSERT INTO gmp_lawyer_availability (lawyer_id, day_of_week, start_time, end_time, slot_duration, is_active)
-- SELECT
--     l.id as lawyer_id,
--     6 as day_of_week,  -- Saturday
--     '10:00:00'::TIME as start_time,
--     '14:00:00'::TIME as end_time,
--     30 as slot_duration,
--     true as is_active
-- FROM gmp_lawyers l
-- WHERE l.is_active = true
-- LIMIT 1
-- ON CONFLICT (lawyer_id, day_of_week, start_time) DO NOTHING;

-- Verify inserted data
SELECT
    l.name as lawyer_name,
    CASE a.day_of_week
        WHEN 0 THEN 'Niedziela'
        WHEN 1 THEN 'Poniedzialek'
        WHEN 2 THEN 'Wtorek'
        WHEN 3 THEN 'Sroda'
        WHEN 4 THEN 'Czwartek'
        WHEN 5 THEN 'Piatek'
        WHEN 6 THEN 'Sobota'
    END as day_name,
    a.start_time,
    a.end_time,
    a.slot_duration
FROM gmp_lawyer_availability a
JOIN gmp_lawyers l ON l.id = a.lawyer_id
ORDER BY l.name, a.day_of_week;
