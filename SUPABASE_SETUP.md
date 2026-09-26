# Supabase setup

1. Create a Supabase project.
2. Run `supabase-schema.sql` for a new installation, or `migration-local-work-management.sql` followed by `migration-atomic-invoice-creation.sql`, `migration-hourly-rates.sql`, `migration-invoice-card-lock.sql`, `migration-drop-invoice-summary.sql`, `migration-legacy-cleanup.sql`, `migration-drop-duplicate-time-columns.sql` and `migration-auth-rls.sql` for an existing invoice database.
3. In Authentication -> Sign In / Providers, keep the Email provider enabled and turn off "Allow new users to sign up". Create users in Authentication -> Users (Add user -> Create new user).
4. Copy `.env.local.example` to `.env.local` and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
5. Start the application with `pnpm dev`.

The schema contains `workspaces`, `boards`, `cards`, `time_entries`, `invoices`, and `invoice_cards`. The `set_invoice_status` database function changes invoice status and recalculates card billing archives in one transaction. `create_invoice_with_cards` creates an invoice with its card snapshots and totals atomically; a card can belong to at most one invoice (`UNIQUE (invoice_cards.card_id)`).

RLS policies allow all operations to the `authenticated` role and none to `anon`; the functions and the `time_tracking_summary` view (`security_invoker`) are not available to `anon` either. Every signed-in user sees and edits all data, so only create accounts for people who should have full access.
