import { useQuery } from '@tanstack/react-query'
import { getKaitenClient } from './kaiten-client'
import { KaitenCard, ExtendedKaitenCard } from '../types/kaiten'

/**
 * Fetches cards for a specific board.
 * Only fetches non-archived cards (condition=1 means live/active, condition=2 means archived).
 */
export const fetchCards = async (boardId?: number): Promise<KaitenCard[]> => {
    const client = getKaitenClient()
    const params: Record<string, any> = {}

    if (boardId) {
        params.board_id = boardId
    }

    // Filter for non-archived cards only (condition=1 means live/active)
    params.condition = 1

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
 * Archives multiple cards in Kaiten sequentially with delays to avoid rate limiting.
 * Processes cards one by one with a delay between requests to prevent 429 errors.
 */
export const archiveCards = async (cardIds: number[]): Promise<void> => {
    for (let i = 0; i < cardIds.length; i++) {
        try {
            await archiveCard(cardIds[i])
        } catch (error: any) {
            // If we get a 429 error, wait longer and retry
            if (error.response?.status === 429) {
                await new Promise(resolve => setTimeout(resolve, 1000))
                // Retry once
                await archiveCard(cardIds[i])
            } else {
                throw error
            }
        }

        // Add delay between requests to avoid rate limiting (except after the last card)
        if (i < cardIds.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 200))
        }
    }
}

/**
 * Unarchives a card in Kaiten by setting condition to 1 (live).
 */
export const unarchiveCard = async (cardId: number): Promise<void> => {
    const client = getKaitenClient()
    await client.patch(`/cards/${cardId}`, { condition: 1 })
}

/**
 * Unarchives multiple cards in Kaiten sequentially with delays to avoid rate limiting.
 * Processes cards one by one with a delay between requests to prevent 429 errors.
 */
export const unarchiveCards = async (cardIds: number[]): Promise<void> => {
    for (let i = 0; i < cardIds.length; i++) {
        try {
            await unarchiveCard(cardIds[i])
        } catch (error: any) {
            // If we get a 429 error, wait longer and retry
            if (error.response?.status === 429) {
                await new Promise(resolve => setTimeout(resolve, 1000))
                // Retry once
                await unarchiveCard(cardIds[i])
            } else {
                throw error
            }
        }

        // Add delay between requests to avoid rate limiting (except after the last card)
        if (i < cardIds.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 200))
        }
    }
}

