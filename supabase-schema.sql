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

