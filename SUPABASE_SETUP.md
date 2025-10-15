# Supabase Setup Guide

## 1. Create .env file

Create a `.env` file in the project root with the following content:

```env
# Kaiten API Configuration
VITE_KAITEN_API_URL=https://example.kaiten.ru/api/latest
VITE_KAITEN_API_TOKEN=your-kaiten-token-here

# Supabase Configuration
VITE_SUPABASE_URL=https://rfdnjjxvtqzxxrqzgnvg.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJmZG5qanh2dHF6eHhycXpnbnZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1MDI0MjMsImV4cCI6MjA3NjA3ODQyM30.XuEI3My19vD7w2EAyp-7Oan6RhCe7xaR1QC_wVvDqgs
```

## 2. Run SQL Schema in Supabase

1. Go to your Supabase project: https://supabase.com/dashboard
2. Navigate to **SQL Editor**
3. Copy the contents of `supabase-schema.sql`
4. Paste into SQL Editor
5. Click **Run** to create tables and policies

## 3. Database Structure

### Tables Created:

#### `invoices`
- Stores invoice metadata
- Fields: space_id, board_id, total_time_spent, status, etc.

#### `invoice_cards`
- Stores cards associated with each invoice
- Fields: invoice_id, card_id, card_title, time_spent, tags, etc.

### Views Created:

#### `invoice_summary`
- Aggregated view of invoices with card counts and totals

## 4. How It Works

1. **Select Cards**: Check the cards you want to include in the invoice
2. **Create Invoice**: Click "Create Invoice" button
3. **Data Storage**: Selected cards are saved to Supabase with:
   - Card details (title, id)
   - Time tracking data
   - Tags
   - Dates (created, due, completed)
4. **View Invoices**: Access invoices through Supabase dashboard or API

## 5. API Functions Available

### Create Invoice
```typescript
createInvoice(data, cards) // Creates invoice with selected cards
```

### Fetch Invoices
```typescript
fetchInvoices() // Gets all invoices
fetchInvoiceWithCards(invoiceId) // Gets invoice with cards
```

### Update/Delete
```typescript
updateInvoiceStatus(invoiceId, status) // Updates status
deleteInvoice(invoiceId) // Deletes invoice
```

## 6. Next Steps (Optional Enhancements)

- [ ] Add invoice list page
- [ ] Export invoice to PDF
- [ ] Add hourly rate calculation
- [ ] Email invoice functionality
- [ ] Invoice templates
- [ ] Multi-currency support

## 7. Troubleshooting

### Connection Issues
- Verify VITE_SUPABASE_URL is correct
- Check VITE_SUPABASE_ANON_KEY is valid
- Ensure RLS policies are enabled

### Permission Errors
- Check Row Level Security policies in Supabase
- Verify API key has correct permissions

### Data Not Saving
- Check browser console for errors
- Verify SQL schema was run successfully
- Check Supabase logs in dashboard

