-- Migration: Create permit_leads table for getmypermit.pl
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS permit_leads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Contact info
  phone VARCHAR(20) NOT NULL,
  details TEXT,

  -- Form answers
  situation VARCHAR(50), -- rejected, waiting, new-application
  location VARCHAR(50), -- dolnoslaskie, other
  intent VARCHAR(50), -- hire-lawyer, just-info, diy
  waiting_time VARCHAR(50), -- 12plus, 6-12, under-6
  rejection_timing VARCHAR(50), -- under-14, 14-30, over-30
  permit_type VARCHAR(50), -- temporary, permanent, citizenship, eu-resident, work, residence

  -- Lead scoring
  lead_score INTEGER DEFAULT 0,
  lead_type VARCHAR(10), -- HOT, WARM, COLD

  -- Status tracking
  status VARCHAR(20) DEFAULT 'new', -- new, contacted, qualified, converted, lost
  notes TEXT,

  -- Metadata
  language VARCHAR(5) DEFAULT 'en',
  user_agent TEXT,
  referrer TEXT
);

-- Index for faster queries
CREATE INDEX idx_permit_leads_created_at ON permit_leads(created_at DESC);
CREATE INDEX idx_permit_leads_lead_type ON permit_leads(lead_type);
CREATE INDEX idx_permit_leads_status ON permit_leads(status);

-- Enable RLS
ALTER TABLE permit_leads ENABLE ROW LEVEL SECURITY;

-- Policy: Allow anonymous inserts (for form submissions)
CREATE POLICY "Allow anonymous inserts" ON permit_leads
  FOR INSERT TO anon
  WITH CHECK (true);

-- Policy: Allow authenticated users to read all
CREATE POLICY "Allow authenticated read" ON permit_leads
  FOR SELECT TO authenticated
  USING (true);

-- Policy: Allow authenticated users to update
CREATE POLICY "Allow authenticated update" ON permit_leads
  FOR UPDATE TO authenticated
  USING (true);
