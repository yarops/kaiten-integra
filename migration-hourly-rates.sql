-- Hourly rates: global default -> workspace override -> invoice snapshot.
-- Run after migration-atomic-invoice-creation.sql.
-- A future client level slots in between workspace and global default in effective_hourly_rate().

CREATE TABLE IF NOT EXISTS app_settings (
    id BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (id), -- single row
    default_hourly_rate NUMERIC(12,2) NOT NULL DEFAULT 1000 CHECK (default_hourly_rate >= 0),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
INSERT INTO app_settings DEFAULT VALUES ON CONFLICT (id) DO NOTHING;

DROP TRIGGER IF EXISTS update_app_settings_updated_at ON app_settings;
CREATE TRIGGER update_app_settings_updated_at BEFORE UPDATE ON app_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all operations on app_settings" ON app_settings;
CREATE POLICY "Allow all operations on app_settings" ON app_settings FOR ALL USING (true) WITH CHECK (true);

-- NULL = inherit the default.
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS hourly_rate NUMERIC(12,2) CHECK (hourly_rate >= 0);

-- Existing invoices were priced at the former hardcoded rate of 1000.
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS hourly_rate NUMERIC(12,2) NOT NULL DEFAULT 1000 CHECK (hourly_rate >= 0);
ALTER TABLE invoices ALTER COLUMN hourly_rate DROP DEFAULT;

CREATE OR REPLACE FUNCTION effective_hourly_rate(target_workspace_id BIGINT)
RETURNS NUMERIC LANGUAGE sql STABLE AS $$
    SELECT COALESCE(w.hourly_rate, s.default_hourly_rate)
    FROM app_settings s LEFT JOIN workspaces w ON w.id = target_workspace_id
$$;

-- The new optional parameter changes the signature; drop the old one so PostgREST sees a single function.
DROP FUNCTION IF EXISTS create_invoice_with_cards(BIGINT, BIGINT[], TEXT);

CREATE OR REPLACE FUNCTION create_invoice_with_cards(
    target_board_id BIGINT,
    card_ids BIGINT[],
    invoice_notes TEXT DEFAULT NULL,
    invoice_hourly_rate NUMERIC DEFAULT NULL
)
RETURNS SETOF invoices
LANGUAGE plpgsql
AS $$
DECLARE
    target_board boards%ROWTYPE;
    target_workspace workspaces%ROWTYPE;
    unique_card_ids BIGINT[];
    valid_count INTEGER;
    new_invoice_id UUID;
BEGIN
    unique_card_ids := ARRAY(SELECT DISTINCT unnest(COALESCE(card_ids, ARRAY[]::BIGINT[])));
    IF cardinality(unique_card_ids) = 0 THEN
        RAISE EXCEPTION 'No cards selected';
    END IF;

    SELECT * INTO target_board FROM boards WHERE id = target_board_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Board not found'; END IF;
    SELECT * INTO target_workspace FROM workspaces WHERE id = target_board.workspace_id;

    -- Lock the cards so their status/archive state cannot change while the invoice is created.
    PERFORM 1 FROM cards WHERE id = ANY(unique_card_ids) ORDER BY id FOR UPDATE;

    SELECT COUNT(*) INTO valid_count FROM cards
    WHERE id = ANY(unique_card_ids)
      AND board_id = target_board_id
      AND status = 'done'
      AND NOT manually_archived AND NOT billing_archived;
    IF valid_count <> cardinality(unique_card_ids) THEN
        RAISE EXCEPTION 'Some cards cannot be invoiced';
    END IF;

    -- Friendly error; invoice_cards_card_id_key is the actual guarantee.
    IF EXISTS (SELECT 1 FROM invoice_cards WHERE card_id = ANY(unique_card_ids)) THEN
        RAISE EXCEPTION 'Some cards are already included in another invoice' USING ERRCODE = 'unique_violation';
    END IF;

    INSERT INTO invoices (workspace_id, workspace_title, board_id, board_title, status, notes, hourly_rate)
    VALUES (target_workspace.id, target_workspace.title, target_board.id, target_board.title, 'draft', invoice_notes,
            COALESCE(invoice_hourly_rate, effective_hourly_rate(target_workspace.id)))
    RETURNING id INTO new_invoice_id;

    INSERT INTO invoice_cards (
        invoice_id, card_id, card_title, card_description,
        time_spent, legacy_time_spent, tracked_time_spent, tags, created_at
    )
    SELECT new_invoice_id, c.id, c.title, c.description,
           COALESCE(s.total_minutes_all, 0)::INTEGER, 0,
           COALESCE(s.total_minutes_all, 0)::INTEGER, c.tags, c.created_at
    FROM cards c
    LEFT JOIN time_tracking_summary s ON s.card_id = c.id
    WHERE c.id = ANY(unique_card_ids);

    UPDATE invoices i
       SET total_cards = t.card_count, total_time_spent = t.total_time
      FROM (
          SELECT COUNT(*) AS card_count, COALESCE(SUM(time_spent), 0) AS total_time
          FROM invoice_cards WHERE invoice_id = new_invoice_id
      ) t
     WHERE i.id = new_invoice_id;

    RETURN QUERY SELECT * FROM invoices WHERE id = new_invoice_id;
END;
$$;

GRANT EXECUTE ON FUNCTION effective_hourly_rate(BIGINT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION create_invoice_with_cards(BIGINT, BIGINT[], TEXT, NUMERIC) TO anon, authenticated;

-- Make PostgREST pick up the schema changes immediately.
NOTIFY pgrst, 'reload schema';
