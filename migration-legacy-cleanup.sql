-- Remove legacy Kaiten data and add the foreign keys it was blocking.
-- Run after migration-drop-invoice-summary.sql.
-- Legacy rows reference Kaiten IDs that do not exist in the local workspaces/boards/cards tables.

BEGIN;

-- Guard: a legacy invoice must not contain local cards, otherwise stop without deleting anything.
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM invoices i JOIN invoice_cards ic ON ic.invoice_id = i.id JOIN cards c ON c.id = ic.card_id
               WHERE NOT EXISTS (SELECT 1 FROM boards b WHERE b.id = i.board_id)) THEN
        RAISE EXCEPTION 'A legacy invoice contains local cards; cleanup aborted';
    END IF;
END;
$$;

-- invoice_cards of legacy invoices are removed by ON DELETE CASCADE.
DELETE FROM invoices i WHERE NOT EXISTS (SELECT 1 FROM boards b WHERE b.id = i.board_id);
DELETE FROM invoice_cards ic WHERE NOT EXISTS (SELECT 1 FROM cards c WHERE c.id = ic.card_id);
DELETE FROM time_entries t WHERE NOT EXISTS (SELECT 1 FROM cards c WHERE c.id = t.card_id);

-- Cards, boards and workspaces are archived, never deleted, so the default NO ACTION is safe.
ALTER TABLE invoices ADD CONSTRAINT invoices_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES workspaces(id);
ALTER TABLE invoices ADD CONSTRAINT invoices_board_id_fkey FOREIGN KEY (board_id) REFERENCES boards(id);
ALTER TABLE invoice_cards ADD CONSTRAINT invoice_cards_card_id_fkey FOREIGN KEY (card_id) REFERENCES cards(id);
ALTER TABLE time_entries ADD CONSTRAINT time_entries_card_id_fkey FOREIGN KEY (card_id) REFERENCES cards(id);

CREATE OR REPLACE FUNCTION delete_invoice(target_invoice_id UUID)
RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE affected_card_ids BIGINT[];
BEGIN
    SELECT ARRAY_AGG(card_id) INTO affected_card_ids FROM invoice_cards WHERE invoice_id = target_invoice_id;
    DELETE FROM invoices WHERE id = target_invoice_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Invoice not found'; END IF;
    UPDATE cards c SET billing_archived = EXISTS (
        SELECT 1 FROM invoice_cards ic JOIN invoices i ON i.id = ic.invoice_id
        WHERE ic.card_id = c.id AND i.status = 'paid'
    ) WHERE c.id = ANY(COALESCE(affected_card_ids, ARRAY[]::BIGINT[]));
END;
$$;

COMMIT;
