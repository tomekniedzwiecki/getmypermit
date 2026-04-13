-- Migration: Lawyer availability and appointments for GetMyPermit
-- Run this in Supabase SQL Editor

-- ============================================================
-- 1. LAWYER AVAILABILITY (recurring weekly slots)
-- ============================================================
CREATE TABLE IF NOT EXISTS gmp_lawyer_availability (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    lawyer_id UUID NOT NULL REFERENCES gmp_lawyers(id) ON DELETE CASCADE,

    -- Day of week (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
    day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),

    -- Time slots (stored as HH:MM in 24h format)
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,

    -- Slot duration in minutes (default 30 min)
    slot_duration INTEGER DEFAULT 30,

    -- Is this slot active?
    is_active BOOLEAN DEFAULT true,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Constraint: end_time must be after start_time
    CONSTRAINT valid_time_range CHECK (end_time > start_time),

    -- Unique constraint: one slot per lawyer per day/time combination
    CONSTRAINT unique_lawyer_slot UNIQUE (lawyer_id, day_of_week, start_time)
);

-- ============================================================
-- 2. BLOCKED DATES (holidays, vacations, specific days off)
-- ============================================================
CREATE TABLE IF NOT EXISTS gmp_lawyer_blocked_dates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    lawyer_id UUID NOT NULL REFERENCES gmp_lawyers(id) ON DELETE CASCADE,

    -- Blocked date
    blocked_date DATE NOT NULL,

    -- Optional: block only specific time range (null = entire day)
    start_time TIME,
    end_time TIME,

    -- Reason (optional)
    reason VARCHAR(255),

    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- Unique constraint
    CONSTRAINT unique_blocked_date UNIQUE (lawyer_id, blocked_date, start_time)
);

-- ============================================================
-- 3. APPOINTMENTS (booked meetings)
-- ============================================================
CREATE TABLE IF NOT EXISTS gmp_appointments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

    -- Who is meeting whom
    lawyer_id UUID NOT NULL REFERENCES gmp_lawyers(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES permit_leads(id) ON DELETE SET NULL,
    client_offer_id UUID REFERENCES gmp_client_offers(id) ON DELETE SET NULL,

    -- Appointment details
    scheduled_date DATE NOT NULL,
    scheduled_time TIME NOT NULL,
    duration_minutes INTEGER DEFAULT 30,

    -- Contact info (denormalized for easier access)
    client_name VARCHAR(255),
    client_email VARCHAR(255),
    client_phone VARCHAR(50),

    -- Meeting type
    meeting_type VARCHAR(50) DEFAULT 'consultation', -- consultation, follow-up, document-review

    -- Status
    status VARCHAR(20) DEFAULT 'scheduled', -- scheduled, confirmed, completed, cancelled, no-show

    -- Notes
    notes TEXT,

    -- Reminder sent?
    reminder_sent BOOLEAN DEFAULT false,
    reminder_sent_at TIMESTAMPTZ,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    cancelled_at TIMESTAMPTZ,

    -- Unique constraint: no double booking
    CONSTRAINT unique_appointment UNIQUE (lawyer_id, scheduled_date, scheduled_time)
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_availability_lawyer ON gmp_lawyer_availability(lawyer_id);
CREATE INDEX idx_availability_day ON gmp_lawyer_availability(day_of_week);
CREATE INDEX idx_blocked_dates_lawyer ON gmp_lawyer_blocked_dates(lawyer_id);
CREATE INDEX idx_blocked_dates_date ON gmp_lawyer_blocked_dates(blocked_date);
CREATE INDEX idx_appointments_lawyer ON gmp_appointments(lawyer_id);
CREATE INDEX idx_appointments_date ON gmp_appointments(scheduled_date);
CREATE INDEX idx_appointments_lead ON gmp_appointments(lead_id);
CREATE INDEX idx_appointments_status ON gmp_appointments(status);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE gmp_lawyer_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE gmp_lawyer_blocked_dates ENABLE ROW LEVEL SECURITY;
ALTER TABLE gmp_appointments ENABLE ROW LEVEL SECURITY;

-- Availability: authenticated can read/write
CREATE POLICY "Authenticated read availability" ON gmp_lawyer_availability
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert availability" ON gmp_lawyer_availability
    FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update availability" ON gmp_lawyer_availability
    FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated delete availability" ON gmp_lawyer_availability
    FOR DELETE TO authenticated USING (true);

-- Anon can read availability (for booking widget)
CREATE POLICY "Anon read availability" ON gmp_lawyer_availability
    FOR SELECT TO anon USING (is_active = true);

-- Blocked dates: authenticated can read/write
CREATE POLICY "Authenticated read blocked" ON gmp_lawyer_blocked_dates
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert blocked" ON gmp_lawyer_blocked_dates
    FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update blocked" ON gmp_lawyer_blocked_dates
    FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated delete blocked" ON gmp_lawyer_blocked_dates
    FOR DELETE TO authenticated USING (true);

-- Anon can read blocked dates (for booking widget)
CREATE POLICY "Anon read blocked" ON gmp_lawyer_blocked_dates
    FOR SELECT TO anon USING (true);

-- Appointments: authenticated can do everything
CREATE POLICY "Authenticated read appointments" ON gmp_appointments
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert appointments" ON gmp_appointments
    FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update appointments" ON gmp_appointments
    FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated delete appointments" ON gmp_appointments
    FOR DELETE TO authenticated USING (true);

-- Anon can read appointments (to check availability) and insert (to book)
CREATE POLICY "Anon read appointments" ON gmp_appointments
    FOR SELECT TO anon USING (true);
CREATE POLICY "Anon insert appointments" ON gmp_appointments
    FOR INSERT TO anon WITH CHECK (true);

-- ============================================================
-- TRIGGER: Update updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_availability_updated_at
    BEFORE UPDATE ON gmp_lawyer_availability
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_appointments_updated_at
    BEFORE UPDATE ON gmp_appointments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- ADD assigned_to TO permit_leads (if not exists)
-- ============================================================
ALTER TABLE permit_leads ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES gmp_lawyers(id);
CREATE INDEX IF NOT EXISTS idx_permit_leads_assigned ON permit_leads(assigned_to);
