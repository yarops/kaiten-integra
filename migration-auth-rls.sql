-- Restrict data access to signed-in users (Supabase Auth).
-- Run after migration-drop-duplicate-time-columns.sql.
-- All authenticated users share the same data; the anon key alone grants nothing.
-- Disable public sign-ups in Supabase (Authentication -> Sign In / Providers) and invite users instead.

BEGIN;

DO $$
DECLARE table_name TEXT;
BEGIN
    FOREACH table_name IN ARRAY ARRAY['app_settings', 'workspaces', 'boards', 'cards', 'invoices', 'invoice_cards', 'time_entries'] LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', 'Allow all operations on ' || table_name, table_name);
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', 'Authenticated users have full access to ' || table_name, table_name);
        EXECUTE format('CREATE POLICY %I ON %I FOR ALL TO authenticated USING (true) WITH CHECK (true)',
                       'Authenticated users have full access to ' || table_name, table_name);
        EXECUTE format('REVOKE ALL ON %I FROM anon', table_name);
        EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON %I TO authenticated', table_name);
    END LOOP;
END;
$$;

-- A view runs with its owner's rights by default and would bypass RLS on time_entries.
ALTER VIEW time_tracking_summary SET (security_invoker = true);
REVOKE ALL ON time_tracking_summary FROM anon;
GRANT SELECT ON time_tracking_summary TO authenticated;

-- Functions are executable by PUBLIC by default, so revoking from anon alone is not enough.
REVOKE EXECUTE ON FUNCTION card_invoice_locked(BIGINT) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION set_invoice_status(UUID, TEXT) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION delete_invoice(UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION effective_hourly_rate(BIGINT) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION create_invoice_with_cards(BIGINT, BIGINT[], TEXT, NUMERIC) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION card_invoice_locked(BIGINT) TO authenticated;
GRANT EXECUTE ON FUNCTION set_invoice_status(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_invoice(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION effective_hourly_rate(BIGINT) TO authenticated;
GRANT EXECUTE ON FUNCTION create_invoice_with_cards(BIGINT, BIGINT[], TEXT, NUMERIC) TO authenticated;

COMMIT;
