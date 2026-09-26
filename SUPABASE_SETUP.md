# Supabase setup

1. Create a Supabase project.
2. Run `supabase-schema.sql` for a new installation, or `migration-local-work-management.sql` followed by `migration-atomic-invoice-creation.sql` and `migration-hourly-rates.sql` for an existing invoice database.
3. Copy `.env.local.example` to `.env.local` and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
4. Start the application with `pnpm dev`.

The schema contains `workspaces`, `boards`, `cards`, `time_entries`, `invoices`, and `invoice_cards`. The `set_invoice_status` database function changes invoice status and recalculates card billing archives in one transaction. `create_invoice_with_cards` creates an invoice with its card snapshots and totals atomically; a card can belong to at most one invoice (`UNIQUE (invoice_cards.card_id)`).

The supplied RLS policies allow anonymous access because this is currently a trusted internal tool. Replace them before exposing the application publicly.
