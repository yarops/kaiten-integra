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

Run `supabase-schema.sql` in the Supabase SQL editor to create the database. The incremental migrations have been applied to production and removed; they remain in git history.

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

Access requires signing in with a Supabase Auth email and password. RLS policies grant data access to the `authenticated` role only, so the anonymous key embedded in the bundle cannot read or change anything by itself. All signed-in users share the same data. Disable public sign-ups in Supabase and create users yourself (see `SUPABASE_SETUP.md`).
