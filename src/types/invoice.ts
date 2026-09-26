/**
 * Invoice and related types for Supabase database.
 */

import { TagItem } from './work-management'

export interface Invoice {
    id: string
    workspace_id: number
    workspace_title: string | null
    board_id: number
    board_title: string | null
    total_time_spent: number
    total_cards: number
    /** Rate frozen at invoice creation. */
    hourly_rate: number
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
    tags: TagItem[]
    created_at: string | null
    created_at_record: string
}

export interface CreateInvoiceData {
    board_id: number
    notes?: string
}

export interface InvoiceWithCards extends Invoice {
    invoice_cards: InvoiceCard[]
}
