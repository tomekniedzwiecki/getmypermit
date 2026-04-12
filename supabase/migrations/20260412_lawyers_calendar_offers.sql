-- Migration: GetMyPermit - Lawyers, Calendar, Offers
-- Date: 2026-04-12
-- Description: Add lawyers management, calendar events, and client offers system
-- NOTE: All tables prefixed with gmp_ to avoid conflicts with TN CRM tables

-- ============ GMP_LAWYERS TABLE ============
-- Lawyers/staff for GetMyPermit (separate from TN CRM team_members)
CREATE TABLE IF NOT EXISTS gmp_lawyers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    specialization TEXT[] DEFAULT '{}',
    color TEXT DEFAULT '#3b82f6',
    role TEXT DEFAULT 'lawyer' CHECK (role IN ('admin', 'lawyer', 'assistant')),
    is_active BOOLEAN DEFAULT TRUE,
    max_cases INTEGER DEFAULT 50,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE gmp_lawyers ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first (idempotent)
DROP POLICY IF EXISTS "Authenticated users can view gmp_lawyers" ON gmp_lawyers;
DROP POLICY IF EXISTS "Authenticated users can insert gmp_lawyers" ON gmp_lawyers;
DROP POLICY IF EXISTS "Authenticated users can update gmp_lawyers" ON gmp_lawyers;
DROP POLICY IF EXISTS "Authenticated users can delete gmp_lawyers" ON gmp_lawyers;
-- Also drop old policy names
DROP POLICY IF EXISTS "Admins can insert gmp_lawyers" ON gmp_lawyers;
DROP POLICY IF EXISTS "Admins can update gmp_lawyers" ON gmp_lawyers;
DROP POLICY IF EXISTS "Admins can delete gmp_lawyers" ON gmp_lawyers;

-- Everyone authenticated can see lawyers
CREATE POLICY "Authenticated users can view gmp_lawyers"
    ON gmp_lawyers FOR SELECT
    USING (auth.role() = 'authenticated');

-- Simplified for development: any authenticated user can manage lawyers
CREATE POLICY "Authenticated users can insert gmp_lawyers"
    ON gmp_lawyers FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

-- Simplified for development: any authenticated user can manage lawyers
CREATE POLICY "Authenticated users can update gmp_lawyers"
    ON gmp_lawyers FOR UPDATE
    USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete gmp_lawyers"
    ON gmp_lawyers FOR DELETE
    USING (auth.role() = 'authenticated');

-- ============ GMP_CALENDAR_EVENTS TABLE ============
CREATE TABLE IF NOT EXISTS gmp_calendar_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    lead_id UUID REFERENCES permit_leads(id) ON DELETE SET NULL,
    assigned_to UUID REFERENCES gmp_lawyers(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES gmp_lawyers(id),
    event_type TEXT DEFAULT 'meeting' CHECK (event_type IN ('meeting', 'deadline', 'hearing', 'consultation')),
    location TEXT,
    reminder_sent BOOLEAN DEFAULT FALSE
);

ALTER TABLE gmp_calendar_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can CRUD gmp_calendar_events" ON gmp_calendar_events;

CREATE POLICY "Authenticated users can CRUD gmp_calendar_events"
    ON gmp_calendar_events FOR ALL
    USING (auth.role() = 'authenticated');

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_gmp_calendar_events_start_time ON gmp_calendar_events(start_time);
CREATE INDEX IF NOT EXISTS idx_gmp_calendar_events_lead_id ON gmp_calendar_events(lead_id);
CREATE INDEX IF NOT EXISTS idx_gmp_calendar_events_assigned_to ON gmp_calendar_events(assigned_to);

-- ============ GMP_OFFERS TABLE (templates) ============
CREATE TABLE IF NOT EXISTS gmp_offers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10,2),
    is_active BOOLEAN DEFAULT TRUE,
    is_default BOOLEAN DEFAULT FALSE,
    milestones JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE gmp_offers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can manage gmp_offers" ON gmp_offers;
DROP POLICY IF EXISTS "Anon can view active gmp_offers" ON gmp_offers;

CREATE POLICY "Authenticated users can manage gmp_offers"
    ON gmp_offers FOR ALL
    USING (auth.role() = 'authenticated');

CREATE POLICY "Anon can view active gmp_offers"
    ON gmp_offers FOR SELECT
    USING (is_active = TRUE);

-- ============ GMP_CLIENT_OFFERS TABLE (sent to clients) ============
CREATE TABLE IF NOT EXISTS gmp_client_offers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID REFERENCES permit_leads(id) ON DELETE CASCADE,
    offer_id UUID REFERENCES gmp_offers(id) ON DELETE SET NULL,
    unique_token TEXT UNIQUE NOT NULL,
    valid_until DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES gmp_lawyers(id),
    view_count INTEGER DEFAULT 0,
    viewed_at TIMESTAMPTZ,
    view_history JSONB DEFAULT '[]',
    custom_price DECIMAL(10,2),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'viewed', 'accepted', 'rejected', 'expired'))
);

ALTER TABLE gmp_client_offers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can manage gmp_client_offers" ON gmp_client_offers;
DROP POLICY IF EXISTS "Anon can view gmp_client_offers by token" ON gmp_client_offers;
DROP POLICY IF EXISTS "Anon can update gmp_client_offers view tracking" ON gmp_client_offers;

CREATE POLICY "Authenticated users can manage gmp_client_offers"
    ON gmp_client_offers FOR ALL
    USING (auth.role() = 'authenticated');

-- Anon can view offers by token (for client preview page)
CREATE POLICY "Anon can view gmp_client_offers by token"
    ON gmp_client_offers FOR SELECT
    USING (TRUE);

-- Anon can update view_count (for tracking)
CREATE POLICY "Anon can update gmp_client_offers view tracking"
    ON gmp_client_offers FOR UPDATE
    USING (TRUE)
    WITH CHECK (TRUE);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_gmp_client_offers_lead_id ON gmp_client_offers(lead_id);
CREATE INDEX IF NOT EXISTS idx_gmp_client_offers_token ON gmp_client_offers(unique_token);

-- ============ ALTER PERMIT_LEADS ============
-- Add assigned_to column to link leads with lawyers
ALTER TABLE permit_leads
ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES gmp_lawyers(id) ON DELETE SET NULL;

-- Add offer_id column if not exists (for selected offer template)
ALTER TABLE permit_leads
ADD COLUMN IF NOT EXISTS offer_id UUID REFERENCES gmp_offers(id) ON DELETE SET NULL;

-- Index for faster filtering by lawyer
CREATE INDEX IF NOT EXISTS idx_permit_leads_assigned_to ON permit_leads(assigned_to);

-- ============ INSERT DEFAULT OFFERS ============
-- Only insert if table is empty (avoid duplicates on re-run)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM gmp_offers LIMIT 1) THEN
        INSERT INTO gmp_offers (name, description, price, is_active, is_default, milestones) VALUES
        (
            'Pomoc w uzyskaniu pozwolenia na pobyt',
            'Kompleksowa pomoc prawna w uzyskaniu pozwolenia na pobyt czasowy lub staly. Obejmuje analize dokumentow, przygotowanie wniosku i reprezentacje przed urzedem.',
            5000.00,
            TRUE,
            TRUE,
            '[
                {"name": "Analiza dokumentow", "description": "Weryfikacja kompletnosci dokumentacji i ocena szans"},
                {"name": "Przygotowanie wniosku", "description": "Sporzadzenie wniosku i wszystkich zalacznikow"},
                {"name": "Zlozenie wniosku", "description": "Reprezentacja przed urzedem wojewodzkim"},
                {"name": "Monitoring sprawy", "description": "Sledzenie postepowania i odpowiadanie na wezwania"}
            ]'::jsonb
        ),
        (
            'Odwolanie od decyzji',
            'Sporzadzenie odwolania od negatywnej decyzji administracyjnej. Analiza podstaw prawnych i reprezentacja w postepowaniu odwolawczym.',
            3000.00,
            TRUE,
            FALSE,
            '[
                {"name": "Analiza decyzji", "description": "Ocena podstaw prawnych do odwolania"},
                {"name": "Przygotowanie odwolania", "description": "Sporzadzenie pisma odwolawczego z argumentacja"},
                {"name": "Zlozenie odwolania", "description": "Terminowe zlozenie do organu wyzszej instancji"}
            ]'::jsonb
        ),
        (
            'Pelna obsluga sprawy imigracyjnej',
            'Kompleksowa obsluga od pierwszej konsultacji do uzyskania pozwolenia. Idealny pakiet dla osob potrzebujacych pelnego wsparcia.',
            8000.00,
            TRUE,
            FALSE,
            '[
                {"name": "Konsultacja wstepna", "description": "Omowienie sytuacji prawnej i strategii dzialania"},
                {"name": "Kompletowanie dokumentow", "description": "Pomoc w zebraniu wszystkich wymaganych dokumentow"},
                {"name": "Przygotowanie wniosku", "description": "Profesjonalne sporzadzenie kompletnej dokumentacji"},
                {"name": "Reprezentacja", "description": "Pelna reprezentacja przed organami administracji"},
                {"name": "Monitoring i wsparcie", "description": "Ciagla obsluga az do uzyskania pozytywnej decyzji"}
            ]'::jsonb
        ),
        (
            'Konsultacja prawna',
            'Jednorazowa konsultacja prawna z analiza sytuacji i rekomendacjami dalszych dzialan.',
            500.00,
            TRUE,
            FALSE,
            '[
                {"name": "Konsultacja", "description": "60-minutowe spotkanie z prawnikiem"},
                {"name": "Podsumowanie", "description": "Pisemne podsumowanie z rekomendacjami"}
            ]'::jsonb
        );
    END IF;
END $$;

-- Grant permissions for anon users
GRANT SELECT ON gmp_offers TO anon;
GRANT SELECT, UPDATE ON gmp_client_offers TO anon;

-- ============ COMMENTS ============
COMMENT ON TABLE gmp_lawyers IS 'Prawnicy i pracownicy kancelarii GetMyPermit';
COMMENT ON TABLE gmp_calendar_events IS 'Wydarzenia w kalendarzu - spotkania, rozprawy, terminy';
COMMENT ON TABLE gmp_offers IS 'Szablony ofert uslug prawnych';
COMMENT ON TABLE gmp_client_offers IS 'Oferty wyslane do klientow z unikalnym linkiem';
COMMENT ON COLUMN permit_leads.assigned_to IS 'Prawnik przypisany do sprawy';
COMMENT ON COLUMN gmp_calendar_events.event_type IS 'Typ: meeting, deadline, hearing, consultation';
