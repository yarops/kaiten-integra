import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { Card, CardInvoice, CardStatus } from '../types/work-management'
import { normalizeTags } from '../lib/card-rules'

export interface CardInput { board_id: number; title: string; description?: string; status: CardStatus; tags?: string[] }

export const fetchCards = async (boardId?: number, includeArchived = false): Promise<Card[]> => {
    if (!boardId) return []
    let query = supabase.from('cards').select('*').eq('board_id', boardId).order('created_at', { ascending: false })
    if (!includeArchived) query = query.eq('manually_archived', false).eq('billing_archived', false)
    const [{ data, error }, { data: links, error: linksError }] = await Promise.all([
        query,
        // invoice_cards has no FK to cards; invoices share the board with their cards.
        supabase.from('invoice_cards').select('card_id, invoice_id, invoices!inner(status, board_id)').eq('invoices.board_id', boardId),
    ])
    if (error) throw error
    if (linksError) throw linksError
    const invoiceByCard = new Map((links || []).map((link) => {
        const invoice = link.invoices as unknown as { status: CardInvoice['status'] }
        return [link.card_id as number, { id: link.invoice_id as string, status: invoice.status }]
    }))
    return (data || []).map((card) => ({ ...card, invoice: invoiceByCard.get(card.id) ?? null }))
}

export const createCard = async (input: CardInput): Promise<Card> => {
    const { data, error } = await supabase.from('cards').insert({
        board_id: input.board_id, title: input.title.trim(), description: input.description?.trim() || null,
        status: input.status, tags: normalizeTags(input.tags),
    }).select().single()
    if (error) throw error
    return data
}

export const updateCard = async (id: number, changes: Partial<Pick<Card, 'title' | 'description' | 'status' | 'manually_archived'>> & { tags?: string[] }): Promise<Card> => {
    const payload = { ...changes, ...(changes.tags ? { tags: normalizeTags(changes.tags) } : {}) }
    const { data, error } = await supabase.from('cards').update(payload).eq('id', id).select().single()
    if (error) throw error
    return data
}

export const useCards = (boardId?: number, includeArchived = false) => useQuery({
    queryKey: ['cards', boardId, includeArchived], queryFn: () => fetchCards(boardId, includeArchived), enabled: !!boardId,
})
export const useCreateCard = () => {
    const client = useQueryClient()
    return useMutation({ mutationFn: createCard, onSuccess: () => client.invalidateQueries({ queryKey: ['cards'] }) })
}
export const useUpdateCard = () => {
    const client = useQueryClient()
    return useMutation({
        mutationFn: ({ id, changes }: { id: number; changes: Parameters<typeof updateCard>[1] }) => updateCard(id, changes),
        onSuccess: () => client.invalidateQueries({ queryKey: ['cards'] }),
    })
}
