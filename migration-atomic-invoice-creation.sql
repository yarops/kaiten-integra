-- Atomic invoice creation and one-invoice-per-card guarantee.
-- Run after migration-local-work-management.sql.
-- Precondition: no duplicate card_id values in invoice_cards:
--   SELECT card_id, COUNT(*) FROM invoice_cards GROUP BY card_id HAVING COUNT(*) > 1;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'invoice_cards_card_id_key') THEN
        ALTER TABLE invoice_cards ADD CONSTRAINT invoice_cards_card_id_key UNIQUE (card_id);
    END IF;
END $$;

-- The unique constraint index replaces the plain card_id index.
DROP INDEX IF EXISTS idx_invoice_cards_card_id;

CREATE OR REPLACE FUNCTION create_invoice_with_cards(
    target_board_id BIGINT,
    card_ids BIGINT[],
    invoice_notes TEXT DEFAULT NULL
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

    INSERT INTO invoices (workspace_id, workspace_title, board_id, board_title, status, notes)
    VALUES (target_workspace.id, target_workspace.title, target_board.id, target_board.title, 'draft', invoice_notes)
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

GRANT EXECUTE ON FUNCTION create_invoice_with_cards(BIGINT, BIGINT[], TEXT) TO anon, authenticated;

-- Make PostgREST pick up the new function immediately.
NOTIFY pgrst, 'reload schema';
