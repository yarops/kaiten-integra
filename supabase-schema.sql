-- Supabase Database Schema for Kaiten Invoices
-- Run this in your Supabase SQL Editor

-- Create invoices table
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    space_id INTEGER NOT NULL,
    space_title TEXT,
    board_id INTEGER NOT NULL,
    board_title TEXT,
    total_time_spent INTEGER DEFAULT 0,
    total_cards INTEGER DEFAULT 0,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create invoice_cards table
CREATE TABLE IF NOT EXISTS invoice_cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    card_id INTEGER NOT NULL,
    card_title TEXT NOT NULL,
    card_description TEXT,
    time_spent INTEGER DEFAULT 0,
    kaiten_time_spent INTEGER DEFAULT 0,
    tracked_time_spent INTEGER DEFAULT 0,
    tags JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE,
    created_at_record TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_invoices_space_id ON invoices(space_id);
CREATE INDEX IF NOT EXISTS idx_invoices_board_id ON invoices(board_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON invoices(created_at);
CREATE INDEX IF NOT EXISTS idx_invoice_cards_invoice_id ON invoice_cards(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_cards_card_id ON invoice_cards(card_id);

-- Enable Row Level Security
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_cards ENABLE ROW LEVEL SECURITY;

-- Create policies (allow all operations for now - customize based on your auth)
CREATE POLICY "Allow all operations on invoices" ON invoices
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on invoice_cards" ON invoice_cards
    FOR ALL USING (true) WITH CHECK (true);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for invoices
CREATE TRIGGER update_invoices_updated_at
    BEFORE UPDATE ON invoices
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

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

-- Create trigger for time_entries updated_at
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

-- Create view for invoice summary
CREATE OR REPLACE VIEW invoice_summary AS
SELECT 
    i.id,
    i.space_id,
    i.space_title,
    i.board_id,
    i.board_title,
    i.status,
    i.notes,
    i.created_at,
    i.updated_at,
    COUNT(ic.id) as total_cards,
    COALESCE(SUM(ic.time_spent), 0) as total_time_spent
FROM invoices i
LEFT JOIN invoice_cards ic ON i.id = ic.invoice_id
GROUP BY i.id, i.space_id, i.space_title, i.board_id, i.board_title, i.status, i.notes, i.created_at, i.updated_at;

-- Add comments to document the schema
COMMENT ON TABLE invoices IS 'Main invoices table storing invoice metadata';
COMMENT ON TABLE invoice_cards IS 'Cards included in each invoice with time tracking details';
COMMENT ON TABLE time_entries IS 'Time tracking entries for Kaiten cards';

COMMENT ON COLUMN invoice_cards.time_spent IS 'Total time spent (Kaiten + tracked time)';
COMMENT ON COLUMN invoice_cards.kaiten_time_spent IS 'Time tracked directly in Kaiten';
COMMENT ON COLUMN invoice_cards.tracked_time_spent IS 'Time tracked through our time tracking interface';

COMMENT ON COLUMN time_entries.card_id IS 'Kaiten card ID';
COMMENT ON COLUMN time_entries.hours IS 'Hours spent (0-23)';
COMMENT ON COLUMN time_entries.minutes IS 'Minutes spent (0-59)';
COMMENT ON COLUMN time_entries.description IS 'Optional description of work performed';
COMMENT ON COLUMN time_entries.date IS 'Date when work was performed';

COMMENT ON VIEW time_tracking_summary IS 'Aggregated time tracking data per card';
COMMENT ON VIEW invoice_summary IS 'Summary view of invoices with aggregated card data';

