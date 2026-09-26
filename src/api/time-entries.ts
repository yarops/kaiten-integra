import { supabase } from '../lib/supabase'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { TimeEntry, CreateTimeEntryData, TimeTrackingSummary } from '../types/time-tracking'

/**
 * Creates a new time entry.
 */
export const createTimeEntry = async (data: CreateTimeEntryData): Promise<TimeEntry> => {
    const { data: result, error } = await supabase
        .from('time_entries')
        .insert([data])
        .select()
        .single()

    if (error) {
        throw new Error(`Failed to create time entry: ${error.message}`)
    }

    return result
}

/**
 * Deletes a time entry.
 */
export const deleteTimeEntry = async (id: string): Promise<void> => {
    const { error } = await supabase
        .from('time_entries')
        .delete()
        .eq('id', id)

    if (error) {
        throw new Error(`Failed to delete time entry: ${error.message}`)
    }
}

/**
 * Gets all time entries for a specific card.
 */
export const getTimeEntriesForCard = async (cardId: number): Promise<TimeEntry[]> => {
    const { data, error } = await supabase
        .from('time_entries')
        .select('*')
        .eq('card_id', cardId)
        .order('date', { ascending: false })

    if (error) {
        throw new Error(`Failed to fetch time entries: ${error.message}`)
    }

    return data || []
}

/**
 * Gets time tracking summaries for multiple cards.
 */
export const getTimeTrackingSummaries = async (cardIds: number[]): Promise<TimeTrackingSummary[]> => {
    const uniqueCardIds = [...new Set(cardIds)]
    if (uniqueCardIds.length === 0) return []

    // PostgREST encodes .in() filters in the URL. Keep requests bounded so large
    // boards do not exceed proxy request-line limits, and run chunks sequentially
    // to avoid another burst of concurrent requests.
    const chunkSize = 200
    const summaries: TimeTrackingSummary[] = []

    for (let index = 0; index < uniqueCardIds.length; index += chunkSize) {
        const chunk = uniqueCardIds.slice(index, index + chunkSize)
        const { data, error } = await supabase
            .from('time_tracking_summary')
            .select('*')
            .in('card_id', chunk)

        if (error) {
            throw new Error(`Failed to fetch time tracking summaries: ${error.message}`)
        }

        summaries.push(...(data || []))
    }

    return summaries
}

/**
 * Hook for creating time entries.
 */
export const useCreateTimeEntry = () => {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: createTimeEntry,
        onSuccess: (_, variables) => {
            // Invalidate time entries queries for this card.
            queryClient.invalidateQueries({ queryKey: ['timeEntries', variables.card_id] })
            queryClient.invalidateQueries({ queryKey: ['timeTrackingSummaries'] })
        },
    })
}

/**
 * Hook for deleting time entries.
 */
export const useDeleteTimeEntry = () => {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (entry: Pick<TimeEntry, 'id' | 'card_id'>) => deleteTimeEntry(entry.id),
        onSuccess: (_, entry) => {
            queryClient.invalidateQueries({ queryKey: ['timeEntries', entry.card_id] })
            queryClient.invalidateQueries({ queryKey: ['timeTrackingSummaries'] })
        },
    })
}

/**
 * Hook for fetching time entries for a card.
 */
export const useTimeEntriesForCard = (cardId: number) => {
    return useQuery({
        queryKey: ['timeEntries', cardId],
        queryFn: () => getTimeEntriesForCard(cardId),
        enabled: !!cardId,
    })
}

/**
 * Hook for fetching time tracking summaries for multiple cards.
 */
export const useTimeTrackingSummaries = (cardIds: number[]) => {
    const normalizedCardIds = [...new Set(cardIds)].sort((left, right) => left - right)

    return useQuery({
        queryKey: ['timeTrackingSummaries', normalizedCardIds],
        queryFn: () => getTimeTrackingSummaries(normalizedCardIds),
        enabled: normalizedCardIds.length > 0,
    })
}
