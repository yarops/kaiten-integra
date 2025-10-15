/**
 * Invoice and related types for Supabase database.
 */

export interface Invoice {
    id: string
    space_id: number
    space_title: string | null
    board_id: number
    board_title: string | null
    total_time_spent: number
    total_cards: number
    status: 'draft' | 'sent' | 'paid'
    notes: string | null
    created_at: string
    updated_at: string
}

export interface InvoiceCard {
    id: string
    invoice_id: string
    card_id: number
    card_title: string
    card_description: string | null
    time_spent: number
    tags: any[]
    created_at: string | null
    created_at_record: string
}

export interface CreateInvoiceData {
    space_id: number
    space_title: string
    board_id: number
    board_title: string
    notes?: string
}

export interface InvoiceWithCards extends Invoice {
    invoice_cards: InvoiceCard[]
}

