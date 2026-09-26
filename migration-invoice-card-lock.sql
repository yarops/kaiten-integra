-- Lock cards of sent/paid invoices; draft is the working status.
-- Run after migration-hourly-rates.sql.
-- Leaving draft refreshes the invoice snapshot from live cards and time entries.

-- A card is locked while it belongs to a non-draft invoice.
CREATE OR REPLACE FUNCTION card_invoice_locked(target_card_id BIGINT)
RETURNS BOOLEAN LANGUAGE sql STABLE AS $$
    SELECT EXISTS (
        SELECT 1 FROM invoice_cards ic JOIN invoices i ON i.id = ic.invoice_id
        WHERE ic.card_id = target_card_id AND i.status <> 'draft'
    )
$$;

CREATE OR REPLACE FUNCTION prevent_locked_card_changes()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    -- billing_archived is maintained by the invoice functions and stays writable.
    IF (NEW.board_id, NEW.title, NEW.description, NEW.status, NEW.tags, NEW.manually_archived)
       IS DISTINCT FROM (OLD.board_id, OLD.title, OLD.description, OLD.status, OLD.tags, OLD.manually_archived)
       AND card_invoice_locked(OLD.id) THEN
        RAISE EXCEPTION 'Card % is included in a sent or paid invoice', OLD.id USING ERRCODE = 'object_not_in_prerequisite_state';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_locked_card_changes ON cards;
CREATE TRIGGER prevent_locked_card_changes BEFORE UPDATE ON cards FOR EACH ROW EXECUTE FUNCTION prevent_locked_card_changes();

CREATE OR REPLACE FUNCTION prevent_locked_time_entry_changes()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
    affected_card_ids BIGINT[] := ARRAY[]::BIGINT[];
BEGIN
    IF TG_OP <> 'INSERT' THEN affected_card_ids := affected_card_ids || OLD.card_id; END IF;
    IF TG_OP <> 'DELETE' THEN affected_card_ids := affected_card_ids || NEW.card_id; END IF;
    -- Wait for a concurrent set_invoice_status that holds the card rows.
    PERFORM 1 FROM cards WHERE id = ANY(affected_card_ids) ORDER BY id FOR SHARE;
    IF EXISTS (SELECT 1 FROM unnest(affected_card_ids) AS a(card_id) WHERE card_invoice_locked(a.card_id)) THEN
        RAISE EXCEPTION 'Card is included in a sent or paid invoice' USING ERRCODE = 'object_not_in_prerequisite_state';
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS prevent_locked_time_entry_changes ON time_entries;
CREATE TRIGGER prevent_locked_time_entry_changes BEFORE INSERT OR UPDATE OR DELETE ON time_entries
    FOR EACH ROW EXECUTE FUNCTION prevent_locked_time_entry_changes();

CREATE OR REPLACE FUNCTION set_invoice_status(target_invoice_id UUID, new_status TEXT)
RETURNS SETOF invoices
LANGUAGE plpgsql
AS $$
DECLARE
    old_status TEXT;
BEGIN
    IF new_status NOT IN ('draft', 'sent', 'paid') THEN
        RAISE EXCEPTION 'Invalid invoice status: %', new_status;
    END IF;

    SELECT status INTO old_status FROM invoices WHERE id = target_invoice_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Invoice not found'; END IF;

    -- Lock the cards: no time or card edits may slip in between the refresh and the status change.
    PERFORM 1 FROM cards
     WHERE id IN (SELECT card_id FROM invoice_cards WHERE invoice_id = target_invoice_id)
     ORDER BY id FOR UPDATE;

    IF old_status = 'draft' AND new_status <> 'draft' THEN
        -- Legacy rows without a local card keep their snapshot.
        IF EXISTS (
            SELECT 1 FROM invoice_cards ic JOIN cards c ON c.id = ic.card_id
            WHERE ic.invoice_id = target_invoice_id AND (c.status <> 'done' OR c.manually_archived)
        ) THEN
            RAISE EXCEPTION 'All invoice cards must be done and not archived' USING ERRCODE = 'check_violation';
        END IF;

        UPDATE invoice_cards ic
           SET card_title = c.title,
               card_description = c.description,
               tags = c.tags,
               tracked_time_spent = COALESCE(s.total_minutes_all, 0)::INTEGER,
               time_spent = ic.legacy_time_spent + COALESCE(s.total_minutes_all, 0)::INTEGER
          FROM cards c
          LEFT JOIN time_tracking_summary s ON s.card_id = c.id
         WHERE ic.invoice_id = target_invoice_id AND c.id = ic.card_id;

        UPDATE invoices i
           SET total_cards = t.card_count, total_time_spent = t.total_time
          FROM (
              SELECT COUNT(*) AS card_count, COALESCE(SUM(time_spent), 0) AS total_time
              FROM invoice_cards WHERE invoice_id = target_invoice_id
          ) t
         WHERE i.id = target_invoice_id;
    END IF;

    UPDATE invoices SET status = new_status WHERE id = target_invoice_id;

    UPDATE cards c
       SET billing_archived = EXISTS (
           SELECT 1 FROM invoice_cards ic
           JOIN invoices i ON i.id = ic.invoice_id
           WHERE ic.card_id = c.id AND i.status = 'paid'
       )
     WHERE c.id IN (SELECT card_id FROM invoice_cards WHERE invoice_id = target_invoice_id);

    RETURN QUERY SELECT * FROM invoices WHERE id = target_invoice_id;
END;
$$;

GRANT EXECUTE ON FUNCTION card_invoice_locked(BIGINT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION set_invoice_status(UUID, TEXT) TO anon, authenticated;

-- Make PostgREST pick up the schema changes immediately.
NOTIFY pgrst, 'reload schema';
