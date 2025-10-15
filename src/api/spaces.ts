import { useQuery } from '@tanstack/react-query'
import { getKaitenClient } from './kaiten-client'
import { KaitenSpace } from '../types/kaiten'

/**
 * Fetches all spaces from Kaiten API.
 */
export const fetchSpaces = async (): Promise<KaitenSpace[]> => {
    const client = getKaitenClient()
    const response = await client.get<KaitenSpace[]>('/spaces')
    return response.data
}

/**
 * React Query hook for fetching spaces.
 */
export const useSpaces = () => {
    return useQuery({
        queryKey: ['spaces'],
        queryFn: fetchSpaces,
    })
}

