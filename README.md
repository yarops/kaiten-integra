# Workspaces & Invoices

Standalone React application for managing a small workspace/board/card hierarchy, tracking time, and creating invoices. All application data is stored in Supabase; no external task-management API is required.

## Setup

```bash
pnpm install
cp .env.local.example .env.local
```

Set the project URL and anonymous key in `.env.local`:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

For a new database, run `supabase-schema.sql` in the Supabase SQL editor. For an existing installation of this application, run `migration-local-work-management.sql` after the earlier invoice/time-tracking migrations, then `migration-atomic-invoice-creation.sql`, `migration-hourly-rates.sql` and `migration-invoice-card-lock.sql`.

## Commands

```bash
pnpm dev
pnpm type-check
pnpm build
pnpm preview
```

## Features

- Create, rename, archive, and restore workspaces and boards.
- Create and edit cards with a description, tags, and one of three statuses.
- Track time against cards and include completed cards in invoices.
- Archive invoiced cards when an invoice is paid and restore them when appropriate.
- Keep invoice card data as a historical snapshot and print invoice details.

The current deployment model intentionally has no user authentication. Supabase RLS policies permit all operations through the configured anonymous key; only use this configuration for a trusted internal deployment.
