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
- **Combined time tracking**: Automatically sums Kaiten time + tracked time for accurate billing

### Time Tracking
- Track time spent on Kaiten cards
- Input time in hours and minutes format
- Add descriptions to time entries
- View time tracking history for each card
- Visual indicators for cards with tracked time
- Delete time entries when needed

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
│   ├── invoices.ts          # Invoices API (Supabase)
│   └── time-entries.ts      # Time tracking API (Supabase)
├── lib/
│   └── supabase.ts          # Supabase client
├── store/
│   └── config-store.ts      # Kaiten configuration
├── components/
│   ├── InvoiceList.tsx      # Invoice list
│   ├── InvoiceDetails.tsx   # Invoice details
│   └── TimeInput.tsx        # Time tracking input
├── types/                   # TypeScript types
│   └── time-tracking.ts     # Time tracking types
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

## Time Tracking Usage

### Adding Time Entries

1. Navigate to the "Create Invoice" view
2. Select a space and board to load cards
3. Click the "+" button in the "Track Time" column for any card
4. Enter hours and minutes in the time tracking modal
5. Optionally add a description of what was worked on
6. Select the date for the time entry
7. Click "Save Time" to create the entry

### Viewing Time History

- Cards with tracked time show a green "✓" button instead of "+"
- Click the button to view and manage all time entries for that card
- The modal shows total time spent and a list of all previous entries
- You can delete individual entries if needed

### Time Entry Features

- **Hours**: 0-23 hours
- **Minutes**: 0-59 minutes  
- **Description**: Optional text describing the work done
- **Date**: When the work was performed (defaults to today)
- **Validation**: At least some time must be entered (hours or minutes > 0)

### Database Schema

The time tracking system uses the following Supabase tables:

- `time_entries` - Stores individual time entries
- `time_tracking_summary` - View with aggregated time data per card

**For existing databases**: Run the SQL from `migration-time-tracking.sql` to add time tracking functionality to your existing Supabase database.

**For new setups**: Use the complete `supabase-schema.sql` which includes all tables.

## Time Integration

The system now combines time from two sources:

1. **Kaiten Time** - Time tracked directly in Kaiten (from `card.time_spent_sum`)
2. **Tracked Time** - Time entries added through our time tracking interface

### How it works:

- **Card View**: Shows total time (Kaiten + Tracked) with visual indicators
  - `*` symbol appears when both sources have time
  - Hover tooltip shows breakdown: "Kaiten: 2h 30m, Tracked: 1h 15m"
  
- **Invoice Creation**: Automatically sums both time sources for accurate billing
  - Stores separate values in database: `kaiten_time_spent` and `tracked_time_spent`
  - Total time is the sum of both sources
  
- **Database Schema**: Enhanced to store time breakdown
  - `invoice_cards.kaiten_time_spent` - Time from Kaiten
  - `invoice_cards.tracked_time_spent` - Time from our tracking
  - `invoice_cards.time_spent` - Total time (sum of both)

This ensures accurate billing by combining all time spent on each card, regardless of where it was tracked.
