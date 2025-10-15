import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { Invoice, CreateInvoiceData, InvoiceWithCards } from '../types/invoice'
import { KaitenCard } from '../types/kaiten'
import { archiveCards, unarchiveCards } from './cards'

/**
 * Creates a new invoice with selected cards.
 */
export const createInvoice = async (
    data: CreateInvoiceData,
    cards: KaitenCard[]
): Promise<Invoice> => {
    // Calculate totals.
    const totalTimeSpent = cards.reduce((sum, card) => sum + (card.time_spent_sum || 0), 0)
    const totalCards = cards.length

    // Create invoice.
    const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert({
            space_id: data.space_id,
            space_title: data.space_title,
            board_id: data.board_id,
            board_title: data.board_title,
            total_time_spent: totalTimeSpent,
            total_cards: totalCards,
            status: 'draft',
            notes: data.notes,
        })
        .select()
        .single()

    if (invoiceError) throw invoiceError

    // Create invoice cards.
    const invoiceCards = cards.map((card) => ({
        invoice_id: invoice.id,
        card_id: card.id,
        card_title: card.title,
        card_description: null,
        time_spent: card.time_spent_sum || 0,
        tags: card.tags || [],
        created_at: card.created,
    }))

    const { error: cardsError } = await supabase.from('invoice_cards').insert(invoiceCards)

    if (cardsError) throw cardsError

    return invoice
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
    const { error } = await supabase.from('invoices').delete().eq('id', invoiceId)

    if (error) throw error
}

/**
 * Updates invoice status.
 * When status is changed to 'paid', archives all cards in Kaiten.
 * When status is changed to 'draft' or 'sent', unarchives all cards in Kaiten.
 */
export const updateInvoiceStatus = async (
    invoiceId: string,
    status: 'draft' | 'sent' | 'paid'
): Promise<Invoice> => {
    // Get invoice cards.
    const { data: cards, error: cardsError } = await supabase
        .from('invoice_cards')
        .select('card_id')
        .eq('invoice_id', invoiceId)

    if (cardsError) throw cardsError

    if (cards && cards.length > 0) {
        const cardIds = cards.map((card) => card.card_id)

        // If status is being changed to 'paid', archive the cards in Kaiten.
        if (status === 'paid') {
            await archiveCards(cardIds)
        } else {
            // If status is being changed to 'draft' or 'sent', unarchive the cards in Kaiten.
            await unarchiveCards(cardIds)
        }
    }

    const { data, error } = await supabase
        .from('invoices')
        .update({ status })
        .eq('id', invoiceId)
        .select()
        .single()

    if (error) throw error
    return data
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
        mutationFn: ({ data, cards }: { data: CreateInvoiceData; cards: KaitenCard[] }) =>
            createInvoice(data, cards),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['invoices'] })
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
        },
    })
}

