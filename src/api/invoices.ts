import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { Invoice, CreateInvoiceData, InvoiceWithCards } from '../types/invoice'
import { Card } from '../types/work-management'

/**
 * Creates a new invoice with selected cards.
 * The invoice, its card snapshots and totals are created atomically in the database.
 */
export const createInvoice = async (
    data: CreateInvoiceData,
    cards: Card[]
): Promise<Invoice> => {
    const { data: invoice, error } = await supabase.rpc('create_invoice_with_cards', {
        target_board_id: data.board_id,
        card_ids: cards.map((card) => card.id),
        invoice_notes: data.notes ?? null,
    }).single()

    if (error) {
        // unique_violation: a card is already included in another invoice.
        if (error.code === '23505') {
            throw new Error('Some cards are already included in another invoice.')
        }
        throw new Error(error.message)
    }
    return invoice as unknown as Invoice
}

/**
 * Fetches all invoices.
 */
export const fetchInvoices = async (): Promise<Invoice[]> => {
    const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
}

/**
 * Fetches a single invoice with its cards.
 */
export const fetchInvoiceWithCards = async (invoiceId: string): Promise<InvoiceWithCards> => {
    const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .select('*')
        .eq('id', invoiceId)
        .single()

    if (invoiceError) throw invoiceError

    const { data: cards, error: cardsError } = await supabase
        .from('invoice_cards')
        .select('*')
        .eq('invoice_id', invoiceId)

    if (cardsError) throw cardsError

    return {
        ...invoice,
        invoice_cards: cards || [],
    }
}

/**
 * Deletes an invoice and its cards.
 */
export const deleteInvoice = async (invoiceId: string): Promise<void> => {
    const { error } = await supabase.rpc('delete_invoice', { target_invoice_id: invoiceId })

    if (error) throw error
}

/**
 * Updates invoice status.
 * Atomically updates invoice status and the cards' billing archive state.
 */
export const updateInvoiceStatus = async (
    invoiceId: string,
    status: 'draft' | 'sent' | 'paid'
): Promise<Invoice> => {
    const { data, error } = await supabase.rpc('set_invoice_status', {
        target_invoice_id: invoiceId,
        new_status: status,
    }).single()

    if (error) throw new Error(error.message)
    return data as unknown as Invoice
}

/**
 * React Query hook for fetching invoices.
 */
export const useInvoices = () => {
    return useQuery({
        queryKey: ['invoices'],
        queryFn: fetchInvoices,
    })
}

/**
 * React Query hook for fetching a single invoice with cards.
 */
export const useInvoiceWithCards = (invoiceId: string | null) => {
    return useQuery({
        queryKey: ['invoices', invoiceId],
        queryFn: () => fetchInvoiceWithCards(invoiceId!),
        enabled: !!invoiceId,
    })
}

/**
 * React Query mutation for creating an invoice.
 */
export const useCreateInvoice = () => {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: ({ data, cards }: { data: CreateInvoiceData; cards: Card[] }) =>
            createInvoice(data, cards),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['invoices'] })
            queryClient.invalidateQueries({ queryKey: ['cards'] })
        },
    })
}

/**
 * React Query mutation for deleting an invoice.
 */
export const useDeleteInvoice = () => {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: deleteInvoice,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['invoices'] })
            queryClient.invalidateQueries({ queryKey: ['cards'] })
        },
    })
}

/**
 * React Query mutation for updating invoice status.
 */
export const useUpdateInvoiceStatus = () => {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: ({ invoiceId, status }: { invoiceId: string; status: 'draft' | 'sent' | 'paid' }) =>
            updateInvoiceStatus(invoiceId, status),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['invoices'] })
            queryClient.invalidateQueries({ queryKey: ['cards'] })
        },
    })
}
