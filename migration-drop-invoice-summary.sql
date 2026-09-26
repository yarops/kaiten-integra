-- Drop the unused invoice_summary view: invoice totals are stored in invoices
-- and computed by create_invoice_with_cards / set_invoice_status.
-- Run after migration-invoice-card-lock.sql.

DROP VIEW IF EXISTS invoice_summary;
