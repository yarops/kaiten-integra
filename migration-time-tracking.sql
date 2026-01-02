-- Migration: Add Time Tracking functionality
-- Run this in your Supabase SQL Editor to add time tracking features

-- Create time_entries table for tracking time spent on cards
CREATE TABLE IF NOT EXISTS time_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    card_id INTEGER NOT NULL,
    hours INTEGER NOT NULL DEFAULT 0,
    minutes INTEGER NOT NULL DEFAULT 0,
    description TEXT,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT valid_hours CHECK (hours >= 0 AND hours <= 23),
    CONSTRAINT valid_minutes CHECK (minutes >= 0 AND minutes <= 59),
    CONSTRAINT valid_time_entry CHECK (hours > 0 OR minutes > 0)
);

-- Create indexes for time_entries
CREATE INDEX IF NOT EXISTS idx_time_entries_card_id ON time_entries(card_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_date ON time_entries(date);
CREATE INDEX IF NOT EXISTS idx_time_entries_created_at ON time_entries(created_at);

-- Enable Row Level Security for time_entries
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;

-- Create policy for time_entries
CREATE POLICY "Allow all operations on time_entries" ON time_entries
    FOR ALL USING (true) WITH CHECK (true);

-- Create trigger for time_entries updated_at (if the function doesn't exist, create it first)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for time_entries
CREATE TRIGGER update_time_entries_updated_at
    BEFORE UPDATE ON time_entries
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create view for time tracking summary
CREATE OR REPLACE VIEW time_tracking_summary AS
SELECT 
    card_id,
    COUNT(*) as entries_count,
    SUM(hours) as total_hours,
    SUM(minutes) as total_minutes,
    SUM(hours * 60 + minutes) as total_minutes_all,
    MAX(date) as last_entry_date
FROM time_entries
GROUP BY card_id;

-- Add new columns to invoice_cards table to store time from different sources
ALTER TABLE invoice_cards 
ADD COLUMN IF NOT EXISTS kaiten_time_spent INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS tracked_time_spent INTEGER DEFAULT 0;

-- Optional: Add comments to document the new functionality
COMMENT ON TABLE time_entries IS 'Stores time tracking entries for Kaiten cards';
COMMENT ON COLUMN time_entries.card_id IS 'Kaiten card ID';
COMMENT ON COLUMN time_entries.hours IS 'Hours spent (0-23)';
COMMENT ON COLUMN time_entries.minutes IS 'Minutes spent (0-59)';
COMMENT ON COLUMN time_entries.description IS 'Optional description of work performed';
COMMENT ON COLUMN time_entries.date IS 'Date when work was performed';

COMMENT ON VIEW time_tracking_summary IS 'Aggregated time tracking data per card';
