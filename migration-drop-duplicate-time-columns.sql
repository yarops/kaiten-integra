-- Drop invoice_cards.legacy_time_spent and tracked_time_spent: legacy Kaiten rows are gone,
-- so legacy_time_spent is always 0 and tracked_time_spent always equals time_spent.
-- Run after migration-legacy-cleanup.sql.
-- PL/pgSQL bodies are not dependency-tracked, so the functions using the columns are replaced in the same transaction.

BEGIN;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM invoice_cards WHERE legacy_time_spent <> 0 OR tracked_time_spent <> time_spent) THEN
        RAISE EXCEPTION 'invoice_cards time columns disagree with time_spent; migration aborted';
    END IF;
END;
$$;

CREATE OR REPLACE FUNCTION set_invoice_status(target_invoice_id UUID, new_status TEXT)
RETURNS SETOF invoices LANGUAGE plpgsql AS $$
DECLARE old_status TEXT;
BEGIN
    IF new_status NOT IN ('draft', 'sent', 'paid') THEN RAISE EXCEPTION 'Invalid invoice status: %', new_status; END IF;
    SELECT status INTO old_status FROM invoices WHERE id = target_invoice_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Invoice not found'; END IF;
    -- Lock the cards: no time or card edits may slip in between the refresh and the status change.
    PERFORM 1 FROM cards WHERE id IN (SELECT card_id FROM invoice_cards WHERE invoice_id = target_invoice_id)
    ORDER BY id FOR UPDATE;
    IF old_status = 'draft' AND new_status <> 'draft' THEN
        IF EXISTS (SELECT 1 FROM invoice_cards ic JOIN cards c ON c.id = ic.card_id
                   WHERE ic.invoice_id = target_invoice_id AND (c.status <> 'done' OR c.manually_archived)) THEN
            RAISE EXCEPTION 'All invoice cards must be done and not archived' USING ERRCODE = 'check_violation';
        END IF;
        UPDATE invoice_cards ic SET card_title = c.title, card_description = c.description, tags = c.tags,
               time_spent = COALESCE(s.total_minutes_all, 0)::INTEGER
        FROM cards c LEFT JOIN time_tracking_summary s ON s.card_id = c.id
        WHERE ic.invoice_id = target_invoice_id AND c.id = ic.card_id;
        UPDATE invoices i SET total_cards = t.card_count, total_time_spent = t.total_time
        FROM (SELECT COUNT(*) AS card_count, COALESCE(SUM(time_spent), 0) AS total_time
              FROM invoice_cards WHERE invoice_id = target_invoice_id) t
        WHERE i.id = target_invoice_id;
    END IF;
    UPDATE invoices SET status = new_status WHERE id = target_invoice_id;
    UPDATE cards c SET billing_archived = EXISTS (
        SELECT 1 FROM invoice_cards ic JOIN invoices i ON i.id = ic.invoice_id
        WHERE ic.card_id = c.id AND i.status = 'paid'
    ) WHERE c.id IN (SELECT card_id FROM invoice_cards WHERE invoice_id = target_invoice_id);
    RETURN QUERY SELECT * FROM invoices WHERE id = target_invoice_id;
END;
$$;

CREATE OR REPLACE FUNCTION create_invoice_with_cards(target_board_id BIGINT, card_ids BIGINT[], invoice_notes TEXT DEFAULT NULL,
                                                     invoice_hourly_rate NUMERIC DEFAULT NULL)
RETURNS SETOF invoices LANGUAGE plpgsql AS $$
DECLARE
    target_board boards%ROWTYPE; target_workspace workspaces%ROWTYPE;
    unique_card_ids BIGINT[]; valid_count INTEGER; new_invoice_id UUID;
BEGIN
    unique_card_ids := ARRAY(SELECT DISTINCT unnest(COALESCE(card_ids, ARRAY[]::BIGINT[])));
    IF cardinality(unique_card_ids) = 0 THEN RAISE EXCEPTION 'No cards selected'; END IF;
    SELECT * INTO target_board FROM boards WHERE id = target_board_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Board not found'; END IF;
    SELECT * INTO target_workspace FROM workspaces WHERE id = target_board.workspace_id;
    -- Lock the cards so their status/archive state cannot change while the invoice is created.
    PERFORM 1 FROM cards WHERE id = ANY(unique_card_ids) ORDER BY id FOR UPDATE;
    SELECT COUNT(*) INTO valid_count FROM cards
    WHERE id = ANY(unique_card_ids) AND board_id = target_board_id AND status = 'done'
      AND NOT manually_archived AND NOT billing_archived;
    IF valid_count <> cardinality(unique_card_ids) THEN RAISE EXCEPTION 'Some cards cannot be invoiced'; END IF;
    -- Friendly error; invoice_cards_card_id_key is the actual guarantee.
    IF EXISTS (SELECT 1 FROM invoice_cards WHERE card_id = ANY(unique_card_ids)) THEN
        RAISE EXCEPTION 'Some cards are already included in another invoice' USING ERRCODE = 'unique_violation';
    END IF;
    INSERT INTO invoices (workspace_id, workspace_title, board_id, board_title, status, notes, hourly_rate)
    VALUES (target_workspace.id, target_workspace.title, target_board.id, target_board.title, 'draft', invoice_notes,
            COALESCE(invoice_hourly_rate, effective_hourly_rate(target_workspace.id)))
    RETURNING id INTO new_invoice_id;
    INSERT INTO invoice_cards (invoice_id, card_id, card_title, card_description,
                               time_spent, tags, created_at)
    SELECT new_invoice_id, c.id, c.title, c.description, COALESCE(s.total_minutes_all, 0)::INTEGER, c.tags, c.created_at
    FROM cards c LEFT JOIN time_tracking_summary s ON s.card_id = c.id
    WHERE c.id = ANY(unique_card_ids);
    UPDATE invoices i SET total_cards = t.card_count, total_time_spent = t.total_time
    FROM (SELECT COUNT(*) AS card_count, COALESCE(SUM(time_spent), 0) AS total_time
          FROM invoice_cards WHERE invoice_id = new_invoice_id) t
    WHERE i.id = new_invoice_id;
    RETURN QUERY SELECT * FROM invoices WHERE id = new_invoice_id;
END;
$$;

ALTER TABLE invoice_cards DROP COLUMN legacy_time_spent, DROP COLUMN tracked_time_spent;

COMMIT;
