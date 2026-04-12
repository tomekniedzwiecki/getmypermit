-- Seed Test Data for GetMyPermit
-- Date: 2026-04-12
-- Run AFTER 20260412_lawyers_calendar_offers.sql

-- ============ CLEAR EXISTING DATA ============
DELETE FROM gmp_client_offers;
DELETE FROM gmp_calendar_events;
DELETE FROM permit_leads;
DELETE FROM gmp_lawyers;

-- ============ INSERT LAWYERS ============
INSERT INTO gmp_lawyers (id, name, email, phone, specialization, color, role, is_active, max_cases) VALUES
('a1111111-1111-1111-1111-111111111111', 'Marta Kowalska', 'marta@getmypermit.pl', '+48 600 111 222', ARRAY['pobyt czasowy', 'pobyt stały', 'obywatelstwo'], '#3b82f6', 'admin', TRUE, 40),
('a2222222-2222-2222-2222-222222222222', 'Jan Nowak', 'jan@getmypermit.pl', '+48 600 333 444', ARRAY['pobyt czasowy', 'odwołania', 'wizy'], '#8b5cf6', 'lawyer', TRUE, 50),
('a3333333-3333-3333-3333-333333333333', 'Anna Wiśniewska', 'anna@getmypermit.pl', '+48 600 555 666', ARRAY['pobyt stały', 'obywatelstwo', 'łączenie rodzin'], '#ec4899', 'lawyer', TRUE, 45);

-- ============ INSERT LEADS ============

-- === NEW (4 leads) ===
INSERT INTO permit_leads (id, name, email, phone, status, created_at, notes, activity_log) VALUES
('b1111111-1111-1111-1111-111111111111', 'Oleksandr Petrenko', 'oleksandr.petrenko@gmail.com', '+48 512 111 001', 'new', NOW() - INTERVAL '2 hours', 'Zgłoszenie przez formularz na stronie. Zainteresowany pozwoleniem na pobyt czasowy.', '[{"type": "lead_created", "text": "Lead utworzony z formularza", "timestamp": "2026-04-12T10:00:00Z"}]'::jsonb),
('b1111111-1111-1111-1111-111111111112', 'Natalia Kovalenko', 'natalia.koval@ukr.net', '+48 512 111 002', 'new', NOW() - INTERVAL '5 hours', 'Zapytanie o możliwość uzyskania pobytu stałego po 5 latach w Polsce.', '[{"type": "lead_created", "text": "Lead utworzony z formularza", "timestamp": "2026-04-12T07:00:00Z"}]'::jsonb),
('b1111111-1111-1111-1111-111111111113', 'Dmytro Shevchenko', 'dmytro.shev@gmail.com', '+48 512 111 003', 'new', NOW() - INTERVAL '1 day', 'Pilne - kończy się wiza za 2 tygodnie.', '[{"type": "lead_created", "text": "Lead utworzony z formularza", "timestamp": "2026-04-11T12:00:00Z"}]'::jsonb),
('b1111111-1111-1111-1111-111111111114', 'Iryna Bondarenko', 'iryna.bond@outlook.com', '+48 512 111 004', 'new', NOW() - INTERVAL '30 minutes', 'Właśnie wpłynęło zapytanie. Chce się dowiedzieć o procedurę.', '[{"type": "lead_created", "text": "Lead utworzony z formularza", "timestamp": "2026-04-12T11:30:00Z"}]'::jsonb);

-- === CONTACTED (3 leads) ===
INSERT INTO permit_leads (id, name, email, phone, status, assigned_to, created_at, notes, activity_log) VALUES
('b2222222-2222-2222-2222-222222222221', 'Viktor Melnyk', 'viktor.melnyk@gmail.com', '+48 512 222 001', 'contacted', 'a1111111-1111-1111-1111-111111111111', NOW() - INTERVAL '3 days', 'Rozmawiałam z klientem. Potrzebuje pozwolenia na pobyt czasowy w celu pracy. Ma umowę o pracę.', '[{"type": "lead_created", "text": "Lead utworzony z formularza", "timestamp": "2026-04-09T10:00:00Z"}, {"type": "status_change", "text": "Zmiana statusu: Nowy → Skontaktowany", "timestamp": "2026-04-10T11:00:00Z"}, {"type": "call", "text": "Rozmowa telefoniczna - 15 min", "timestamp": "2026-04-10T11:15:00Z"}]'::jsonb),
('b2222222-2222-2222-2222-222222222222', 'Oksana Lysenko', 'oksana.lys@ukr.net', '+48 512 222 002', 'contacted', 'a2222222-2222-2222-2222-222222222222', NOW() - INTERVAL '4 days', 'Klientka zainteresowana łączeniem rodzin. Mąż w Ukrainie, chce go sprowadzić.', '[{"type": "lead_created", "text": "Lead utworzony z formularza", "timestamp": "2026-04-08T09:00:00Z"}, {"type": "status_change", "text": "Zmiana statusu: Nowy → Skontaktowany", "timestamp": "2026-04-09T10:00:00Z"}, {"type": "email", "text": "Wysłano email z informacjami wstępnymi", "timestamp": "2026-04-09T10:30:00Z"}]'::jsonb),
('b2222222-2222-2222-2222-222222222223', 'Andriy Savchuk', 'andriy.sav@gmail.com', '+48 512 222 003', 'contacted', 'a1111111-1111-1111-1111-111111111111', NOW() - INTERVAL '2 days', 'Student, kończy studia za 3 miesiące. Chce zostać w Polsce i pracować.', '[{"type": "lead_created", "text": "Lead utworzony z formularza", "timestamp": "2026-04-10T14:00:00Z"}, {"type": "status_change", "text": "Zmiana statusu: Nowy → Skontaktowany", "timestamp": "2026-04-11T09:00:00Z"}, {"type": "call", "text": "Rozmowa telefoniczna - omówienie opcji", "timestamp": "2026-04-11T09:30:00Z"}]'::jsonb);

-- === QUALIFIED (3 leads) ===
INSERT INTO permit_leads (id, name, email, phone, status, assigned_to, created_at, notes, activity_log) VALUES
('b3333333-3333-3333-3333-333333333331', 'Tetiana Moroz', 'tetiana.moroz@gmail.com', '+48 512 333 001', 'qualified', 'a2222222-2222-2222-2222-222222222222', NOW() - INTERVAL '7 days', 'Klientka zdecydowana. Wysłano ofertę na pełną obsługę. Czekamy na decyzję.', '[{"type": "lead_created", "text": "Lead utworzony z formularza", "timestamp": "2026-04-05T10:00:00Z"}, {"type": "status_change", "text": "Zmiana statusu: Nowy → Skontaktowany", "timestamp": "2026-04-06T11:00:00Z"}, {"type": "status_change", "text": "Zmiana statusu: Skontaktowany → Zakwalifikowany", "timestamp": "2026-04-07T14:00:00Z"}, {"type": "offer", "text": "Wysłano ofertę: Pełna obsługa sprawy imigracyjnej", "timestamp": "2026-04-07T14:30:00Z"}]'::jsonb),
('b3333333-3333-3333-3333-333333333332', 'Sergiy Boyko', 'sergiy.boyko@outlook.com', '+48 512 333 002', 'qualified', 'a3333333-3333-3333-3333-333333333333', NOW() - INTERVAL '10 days', 'Przedsiębiorca, chce prowadzić działalność w Polsce. Potrzebuje pozwolenia na pobyt.', '[{"type": "lead_created", "text": "Lead utworzony z formularza", "timestamp": "2026-04-02T09:00:00Z"}, {"type": "status_change", "text": "Zmiana statusu: Nowy → Skontaktowany", "timestamp": "2026-04-03T10:00:00Z"}, {"type": "meeting", "text": "Spotkanie w biurze - 45 min", "timestamp": "2026-04-04T14:00:00Z"}, {"type": "status_change", "text": "Zmiana statusu: Skontaktowany → Zakwalifikowany", "timestamp": "2026-04-06T11:00:00Z"}, {"type": "offer", "text": "Wysłano ofertę: Pomoc w uzyskaniu pozwolenia na pobyt", "timestamp": "2026-04-06T11:30:00Z"}]'::jsonb),
('b3333333-3333-3333-3333-333333333333', 'Yulia Kravchenko', 'yulia.krav@gmail.com', '+48 512 333 003', 'qualified', 'a1111111-1111-1111-1111-111111111111', NOW() - INTERVAL '5 days', 'Odwołanie od negatywnej decyzji. Termin na odwołanie za 10 dni. PILNE!', '[{"type": "lead_created", "text": "Lead utworzony z formularza", "timestamp": "2026-04-07T08:00:00Z"}, {"type": "status_change", "text": "Zmiana statusu: Nowy → Skontaktowany", "timestamp": "2026-04-08T09:00:00Z"}, {"type": "status_change", "text": "Zmiana statusu: Skontaktowany → Zakwalifikowany", "timestamp": "2026-04-09T10:00:00Z"}, {"type": "offer", "text": "Wysłano ofertę: Odwołanie od decyzji", "timestamp": "2026-04-09T10:30:00Z"}]'::jsonb);

-- === CONVERTED (2 leads) ===
INSERT INTO permit_leads (id, name, email, phone, status, assigned_to, created_at, notes, activity_log) VALUES
('b4444444-4444-4444-4444-444444444441', 'Olena Tkachenko', 'olena.tkach@gmail.com', '+48 512 444 001', 'converted', 'a1111111-1111-1111-1111-111111111111', NOW() - INTERVAL '14 days', 'Klientka zaakceptowała ofertę! Sprawa w toku - zbieramy dokumenty.', '[{"type": "lead_created", "text": "Lead utworzony z formularza", "timestamp": "2026-03-29T10:00:00Z"}, {"type": "status_change", "text": "Zmiana statusu: Nowy → Skontaktowany", "timestamp": "2026-03-30T11:00:00Z"}, {"type": "status_change", "text": "Zmiana statusu: Skontaktowany → Zakwalifikowany", "timestamp": "2026-04-01T14:00:00Z"}, {"type": "offer", "text": "Wysłano ofertę: Pełna obsługa sprawy imigracyjnej", "timestamp": "2026-04-01T14:30:00Z"}, {"type": "offer_accepted", "text": "Klient zaakceptował ofertę!", "timestamp": "2026-04-03T16:00:00Z"}, {"type": "status_change", "text": "Zmiana statusu: Zakwalifikowany → Wygrany", "timestamp": "2026-04-03T16:05:00Z"}]'::jsonb),
('b4444444-4444-4444-4444-444444444442', 'Maksym Honchar', 'maksym.honchar@ukr.net', '+48 512 444 002', 'converted', 'a2222222-2222-2222-2222-222222222222', NOW() - INTERVAL '21 days', 'Podpisana umowa na pełną obsługę. Wniosek złożony w urzędzie 5 dni temu.', '[{"type": "lead_created", "text": "Lead utworzony z formularza", "timestamp": "2026-03-22T09:00:00Z"}, {"type": "status_change", "text": "Zmiana statusu: Nowy → Skontaktowany", "timestamp": "2026-03-23T10:00:00Z"}, {"type": "meeting", "text": "Konsultacja w biurze", "timestamp": "2026-03-25T14:00:00Z"}, {"type": "status_change", "text": "Zmiana statusu: Skontaktowany → Zakwalifikowany", "timestamp": "2026-03-26T11:00:00Z"}, {"type": "offer", "text": "Wysłano ofertę: Pełna obsługa sprawy imigracyjnej", "timestamp": "2026-03-26T11:30:00Z"}, {"type": "offer_accepted", "text": "Klient zaakceptował ofertę!", "timestamp": "2026-03-28T15:00:00Z"}, {"type": "status_change", "text": "Zmiana statusu: Zakwalifikowany → Wygrany", "timestamp": "2026-03-28T15:05:00Z"}, {"type": "document", "text": "Złożono wniosek w Urzędzie Wojewódzkim", "timestamp": "2026-04-07T10:00:00Z"}]'::jsonb);

-- === LOST (2 leads) ===
INSERT INTO permit_leads (id, name, email, phone, status, assigned_to, created_at, notes, activity_log) VALUES
('b5555555-5555-5555-5555-555555555551', 'Roman Kozak', 'roman.kozak@gmail.com', '+48 512 555 001', 'lost', 'a3333333-3333-3333-3333-333333333333', NOW() - INTERVAL '30 days', 'Klient zrezygnował - znalazł tańszą ofertę u konkurencji.', '[{"type": "lead_created", "text": "Lead utworzony z formularza", "timestamp": "2026-03-13T10:00:00Z"}, {"type": "status_change", "text": "Zmiana statusu: Nowy → Skontaktowany", "timestamp": "2026-03-15T11:00:00Z"}, {"type": "offer", "text": "Wysłano ofertę", "timestamp": "2026-03-17T14:00:00Z"}, {"type": "status_change", "text": "Zmiana statusu: Skontaktowany → Stracony", "timestamp": "2026-03-23T09:00:00Z"}, {"type": "note", "text": "Klient wybrał konkurencję - cena", "timestamp": "2026-03-23T09:05:00Z"}]'::jsonb),
('b5555555-5555-5555-5555-555555555552', 'Kateryna Rudenko', 'kateryna.rud@outlook.com', '+48 512 555 002', 'lost', 'a1111111-1111-1111-1111-111111111111', NOW() - INTERVAL '45 days', 'Brak kontaktu. Próbowaliśmy dzwonić 5 razy - nie odbiera.', '[{"type": "lead_created", "text": "Lead utworzony z formularza", "timestamp": "2026-02-26T10:00:00Z"}, {"type": "status_change", "text": "Zmiana statusu: Nowy → Skontaktowany", "timestamp": "2026-02-28T11:00:00Z"}, {"type": "call", "text": "Próba kontaktu - brak odpowiedzi", "timestamp": "2026-03-03T14:00:00Z"}, {"type": "call", "text": "Próba kontaktu - brak odpowiedzi", "timestamp": "2026-03-08T10:00:00Z"}, {"type": "status_change", "text": "Zmiana statusu: Skontaktowany → Stracony", "timestamp": "2026-03-13T09:00:00Z"}, {"type": "note", "text": "Brak kontaktu - zamykamy", "timestamp": "2026-03-13T09:05:00Z"}]'::jsonb);

-- ============ CREATE CLIENT OFFERS WITH HISTORY ============
DO $$
DECLARE
    offer_full_id UUID;
    offer_appeal_id UUID;
    offer_residence_id UUID;
BEGIN
    SELECT id INTO offer_full_id FROM gmp_offers WHERE name LIKE '%Pelna obsluga%' LIMIT 1;
    SELECT id INTO offer_appeal_id FROM gmp_offers WHERE name LIKE '%Odwolanie%' LIMIT 1;
    SELECT id INTO offer_residence_id FROM gmp_offers WHERE name LIKE '%Pomoc w uzyskaniu%' LIMIT 1;

    -- Tetiana Moroz - viewed 3x
    INSERT INTO gmp_client_offers (id, lead_id, offer_id, unique_token, valid_until, created_at, created_by, view_count, viewed_at, view_history, status, custom_price) VALUES
    ('c1111111-1111-1111-1111-111111111111', 'b3333333-3333-3333-3333-333333333331', offer_full_id, 'tok-tetiana-moroz-001', (CURRENT_DATE + 7)::date, NOW() - INTERVAL '5 days', 'a2222222-2222-2222-2222-222222222222', 3, NOW() - INTERVAL '1 day', '[{"timestamp": "2026-04-08T10:00:00Z", "userAgent": "Mozilla/5.0 (iPhone)"}, {"timestamp": "2026-04-10T14:00:00Z", "userAgent": "Mozilla/5.0 (Windows)"}, {"timestamp": "2026-04-11T09:00:00Z", "userAgent": "Mozilla/5.0 (iPhone)"}]'::jsonb, 'viewed', 8500.00);

    -- Sergiy Boyko - pending (not viewed)
    INSERT INTO gmp_client_offers (id, lead_id, offer_id, unique_token, valid_until, created_at, created_by, view_count, status, custom_price) VALUES
    ('c2222222-2222-2222-2222-222222222222', 'b3333333-3333-3333-3333-333333333332', offer_residence_id, 'tok-sergiy-boyko-001', (CURRENT_DATE + 10)::date, NOW() - INTERVAL '6 days', 'a3333333-3333-3333-3333-333333333333', 0, 'pending', 5500.00);

    -- Yulia Kravchenko - viewed 1x
    INSERT INTO gmp_client_offers (id, lead_id, offer_id, unique_token, valid_until, created_at, created_by, view_count, viewed_at, view_history, status) VALUES
    ('c3333333-3333-3333-3333-333333333333', 'b3333333-3333-3333-3333-333333333333', offer_appeal_id, 'tok-yulia-kravchenko-001', (CURRENT_DATE + 5)::date, NOW() - INTERVAL '3 days', 'a1111111-1111-1111-1111-111111111111', 1, NOW() - INTERVAL '2 days', '[{"timestamp": "2026-04-10T16:00:00Z", "userAgent": "Mozilla/5.0 (Android)"}]'::jsonb, 'viewed');

    -- Olena Tkachenko - ACCEPTED
    INSERT INTO gmp_client_offers (id, lead_id, offer_id, unique_token, valid_until, created_at, created_by, view_count, viewed_at, view_history, status, custom_price) VALUES
    ('c4444444-4444-4444-4444-444444444444', 'b4444444-4444-4444-4444-444444444441', offer_full_id, 'tok-olena-tkachenko-001', (CURRENT_DATE - 2)::date, NOW() - INTERVAL '11 days', 'a1111111-1111-1111-1111-111111111111', 2, NOW() - INTERVAL '9 days', '[{"timestamp": "2026-04-02T10:00:00Z", "userAgent": "Mozilla/5.0 (Windows)"}, {"timestamp": "2026-04-03T15:00:00Z", "userAgent": "Mozilla/5.0 (Windows)"}]'::jsonb, 'accepted', 8000.00);

    -- Maksym Honchar - ACCEPTED
    INSERT INTO gmp_client_offers (id, lead_id, offer_id, unique_token, valid_until, created_at, created_by, view_count, viewed_at, view_history, status) VALUES
    ('c5555555-5555-5555-5555-555555555555', 'b4444444-4444-4444-4444-444444444442', offer_full_id, 'tok-maksym-honchar-001', (CURRENT_DATE - 8)::date, NOW() - INTERVAL '17 days', 'a2222222-2222-2222-2222-222222222222', 3, NOW() - INTERVAL '15 days', '[{"timestamp": "2026-03-26T11:00:00Z", "userAgent": "Mozilla/5.0 (Macintosh)"}, {"timestamp": "2026-03-27T14:00:00Z", "userAgent": "Mozilla/5.0 (Macintosh)"}, {"timestamp": "2026-03-28T15:00:00Z", "userAgent": "Mozilla/5.0 (iPhone)"}]'::jsonb, 'accepted');

    -- Roman Kozak - EXPIRED (never viewed)
    INSERT INTO gmp_client_offers (id, lead_id, offer_id, unique_token, valid_until, created_at, created_by, view_count, status) VALUES
    ('c6666666-6666-6666-6666-666666666666', 'b5555555-5555-5555-5555-555555555551', offer_residence_id, 'tok-roman-kozak-001', (CURRENT_DATE - 15)::date, NOW() - INTERVAL '26 days', 'a3333333-3333-3333-3333-333333333333', 0, 'expired');

    -- Update permit_leads with offer_id
    UPDATE permit_leads SET offer_id = offer_full_id WHERE id = 'b3333333-3333-3333-3333-333333333331';
    UPDATE permit_leads SET offer_id = offer_residence_id WHERE id = 'b3333333-3333-3333-3333-333333333332';
    UPDATE permit_leads SET offer_id = offer_appeal_id WHERE id = 'b3333333-3333-3333-3333-333333333333';
    UPDATE permit_leads SET offer_id = offer_full_id WHERE id = 'b4444444-4444-4444-4444-444444444441';
    UPDATE permit_leads SET offer_id = offer_full_id WHERE id = 'b4444444-4444-4444-4444-444444444442';
    UPDATE permit_leads SET offer_id = offer_residence_id WHERE id = 'b5555555-5555-5555-5555-555555555551';
END $$;

-- ============ CALENDAR EVENTS ============
INSERT INTO gmp_calendar_events (title, description, start_time, end_time, lead_id, assigned_to, created_by, event_type, location) VALUES
('Konsultacja - Tetiana Moroz', 'Omówienie oferty i dokumentów', NOW() + INTERVAL '2 days' + INTERVAL '10 hours', NOW() + INTERVAL '2 days' + INTERVAL '11 hours', 'b3333333-3333-3333-3333-333333333331', 'a2222222-2222-2222-2222-222222222222', 'a2222222-2222-2222-2222-222222222222', 'consultation', 'Biuro - ul. Marszałkowska 100'),
('Termin odwołania - Yulia Kravchenko', 'PILNE: Ostateczny termin na złożenie odwołania', NOW() + INTERVAL '10 days' + INTERVAL '12 hours', NOW() + INTERVAL '10 days' + INTERVAL '12 hours 30 minutes', 'b3333333-3333-3333-3333-333333333333', 'a1111111-1111-1111-1111-111111111111', 'a1111111-1111-1111-1111-111111111111', 'deadline', NULL),
('Spotkanie - Sergiy Boyko', 'Przedstawienie oferty dla przedsiębiorcy', NOW() + INTERVAL '3 days' + INTERVAL '14 hours', NOW() + INTERVAL '3 days' + INTERVAL '15 hours', 'b3333333-3333-3333-3333-333333333332', 'a3333333-3333-3333-3333-333333333333', 'a3333333-3333-3333-3333-333333333333', 'meeting', 'Online - Google Meet'),
('Rozprawa - Maksym Honchar', 'Stawiennictwo w Urzędzie Wojewódzkim', NOW() + INTERVAL '14 days' + INTERVAL '9 hours', NOW() + INTERVAL '14 days' + INTERVAL '10 hours', 'b4444444-4444-4444-4444-444444444442', 'a2222222-2222-2222-2222-222222222222', 'a2222222-2222-2222-2222-222222222222', 'hearing', 'Mazowiecki Urząd Wojewódzki');

-- ============ SUMMARY ============
-- Leads: 14 (New: 4, Contacted: 3, Qualified: 3, Converted: 2, Lost: 2)
-- Lawyers: 3
-- Client Offers: 6 (pending: 1, viewed: 2, accepted: 2, expired: 1)
-- Calendar Events: 4
