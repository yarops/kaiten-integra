# Kaiten Integration App

Application for working with invoices based on Kaiten cards with Supabase integration.

## Tech Stack

- **React 18** + **TypeScript**
- **Vite** - build tool
- **TanStack Query** - data fetching and caching
- **Zustand** - state management
- **Supabase** - database for invoices
- **Axios** - HTTP client for Kaiten API

## Installation

```bash
pnpm install
```

## Configuration

Create `.env.local`:

```env
VITE_KAITEN_API_URL=https://your-company.kaiten.ru/api/latest
VITE_KAITEN_API_TOKEN=your_api_token_here
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Supabase Schema

Run the SQL from `supabase-schema.sql` file in your Supabase project.

## Commands

```bash
pnpm dev              # Start dev server
pnpm build            # Production build
pnpm build:watch      # Build in watch mode
pnpm preview          # Preview production build
```

## Features

### Invoices
- Create invoices from Kaiten boards
- View invoice list with status filtering
- Detailed invoice view with cards
- Status management: Draft → Sent → Paid
- Print invoice to PDF
- Cost calculation (fixed rate 850₽/hour)

### Kaiten Integration
- Load spaces
- Load boards
- Fetch cards with time tracking
- Archive cards when invoice is paid

## Structure

```
src/
├── api/                      # API clients
│   ├── kaiten-client.ts     # Kaiten HTTP client
│   ├── spaces.ts            # Spaces API
│   ├── boards.ts            # Boards API
│   ├── cards.ts             # Cards API
│   └── invoices.ts          # Invoices API (Supabase)
├── lib/
│   └── supabase.ts          # Supabase client
├── store/
│   └── config-store.ts      # Kaiten configuration
├── components/
│   ├── InvoiceList.tsx      # Invoice list
│   └── InvoiceDetails.tsx   # Invoice details
├── types/                   # TypeScript types
├── App.tsx                  # Main component
├── main.tsx                 # Entry point
└── embed.ts                 # Embedding API
```

## Embedding

After building, include the application:

```html
<div id="kaiten-app"></div>
<link rel="stylesheet" href="dist/assets/kaiten-integra.css">
<script type="module" src="dist/assets/kaiten-integra.js"></script>
```

See `example-embed.html` for an example.
