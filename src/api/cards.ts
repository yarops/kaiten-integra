import { useQuery } from '@tanstack/react-query'
import { getKaitenClient } from './kaiten-client'
import { KaitenCard, ExtendedKaitenCard } from '../types/kaiten'

/**
 * Fetches cards for a specific board.
 */
export const fetchCards = async (boardId?: number): Promise<KaitenCard[]> => {
    const client = getKaitenClient()
    const params = boardId ? { board_id: boardId } : {}
    const response = await client.get<KaitenCard[]>('/cards', { params })
    return response.data
}

/**
 * React Query hook for fetching cards.
 */
export const useCards = (boardId?: number) => {
    return useQuery({
        queryKey: ['cards', boardId],
        queryFn: () => fetchCards(boardId),
    })
}

/**
 * Fetches a single extended card by ID with all details.
 */
export const fetchExtendedCard = async (cardId: number): Promise<ExtendedKaitenCard> => {
    const client = getKaitenClient()
    const response = await client.get<ExtendedKaitenCard>(`/cards/${cardId}`)
    return response.data
}

/**
 * React Query hook for fetching a single extended card.
 */
export const useExtendedCard = (cardId: number | null) => {
    return useQuery({
        queryKey: ['cards', 'extended', cardId],
        queryFn: () => fetchExtendedCard(cardId!),
        enabled: !!cardId,
    })
}

/**
 * Archives a card in Kaiten by setting condition to 2.
 */
export const archiveCard = async (cardId: number): Promise<void> => {
    const client = getKaitenClient()
    await client.patch(`/cards/${cardId}`, { condition: 2 })
}

/**
 * Archives multiple cards in Kaiten.
 */
export const archiveCards = async (cardIds: number[]): Promise<void> => {
    const promises = cardIds.map((cardId) => archiveCard(cardId))
    await Promise.all(promises)
}

/**
 * Unarchives a card in Kaiten by setting condition to 1 (live).
 */
export const unarchiveCard = async (cardId: number): Promise<void> => {
    const client = getKaitenClient()
    await client.patch(`/cards/${cardId}`, { condition: 1 })
}

/**
 * Unarchives multiple cards in Kaiten.
 */
export const unarchiveCards = async (cardIds: number[]): Promise<void> => {
    const promises = cardIds.map((cardId) => unarchiveCard(cardId))
    await Promise.all(promises)
}

