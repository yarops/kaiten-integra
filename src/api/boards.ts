import { useQuery } from '@tanstack/react-query'
import { getKaitenClient } from './kaiten-client'
import { KaitenBoard } from '../types/kaiten'

/**
 * Fetches all boards from Kaiten API for a specific space.
 */
export const fetchBoards = async (spaceId?: number | null): Promise<KaitenBoard[]> => {
    if (!spaceId) {
        return []
    }
    const client = getKaitenClient()
    const response = await client.get<KaitenBoard[]>(`/spaces/${spaceId}/boards`)
    return response.data
}

/**
 * React Query hook for fetching boards for a specific space.
 */
export const useBoards = (spaceId?: number | null) => {
    return useQuery({
        queryKey: ['boards', spaceId],
        queryFn: () => fetchBoards(spaceId),
        enabled: !!spaceId,
    })
}

/**
 * Fetches a single board by ID.
 */
export const fetchBoard = async (boardId: number): Promise<KaitenBoard> => {
    const client = getKaitenClient()
    const response = await client.get<KaitenBoard>(`/boards/${boardId}`)
    return response.data
}

/**
 * React Query hook for fetching a single board.
 */
export const useBoard = (boardId: number) => {
    return useQuery({
        queryKey: ['boards', boardId],
        queryFn: () => fetchBoard(boardId),
        enabled: !!boardId,
    })
}

