import { supabase } from '../lib/supabase'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { TimeEntry, CreateTimeEntryData, UpdateTimeEntryData, TimeTrackingSummary } from '../types/time-tracking'

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
 * Updates an existing time entry.
 */
export const updateTimeEntry = async (id: string, data: UpdateTimeEntryData): Promise<TimeEntry> => {
    const { data: result, error } = await supabase
        .from('time_entries')
        .update(data)
        .eq('id', id)
        .select()
        .single()

    if (error) {
        throw new Error(`Failed to update time entry: ${error.message}`)
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
 * Gets time tracking summary for a specific card.
 */
export const getTimeTrackingSummary = async (cardId: number): Promise<TimeTrackingSummary | null> => {
    const { data, error } = await supabase
        .from('time_tracking_summary')
        .select('*')
        .eq('card_id', cardId)
        .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw new Error(`Failed to fetch time tracking summary: ${error.message}`)
    }

    return data
}

/**
 * Gets time tracking summaries for multiple cards.
 */
export const getTimeTrackingSummaries = async (cardIds: number[]): Promise<TimeTrackingSummary[]> => {
    if (cardIds.length === 0) return []

    const { data, error } = await supabase
        .from('time_tracking_summary')
        .select('*')
        .in('card_id', cardIds)

    if (error) {
        throw new Error(`Failed to fetch time tracking summaries: ${error.message}`)
    }

    return data || []
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
            queryClient.invalidateQueries({ queryKey: ['timeTrackingSummary', variables.card_id] })
            queryClient.invalidateQueries({ queryKey: ['timeTrackingSummaries'] })
        },
    })
}

/**
 * Hook for updating time entries.
 */
export const useUpdateTimeEntry = () => {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: UpdateTimeEntryData }) =>
            updateTimeEntry(id, data),
        onSuccess: (result) => {
            // Invalidate time entries queries for this card.
            queryClient.invalidateQueries({ queryKey: ['timeEntries', result.card_id] })
            queryClient.invalidateQueries({ queryKey: ['timeTrackingSummary', result.card_id] })
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
        mutationFn: deleteTimeEntry,
        onSuccess: () => {
            // We need to invalidate all time-related queries since we don't know the card_id.
            queryClient.invalidateQueries({ queryKey: ['timeEntries'] })
            queryClient.invalidateQueries({ queryKey: ['timeTrackingSummary'] })
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
 * Hook for fetching time tracking summary for a card.
 */
export const useTimeTrackingSummary = (cardId: number) => {
    return useQuery({
        queryKey: ['timeTrackingSummary', cardId],
        queryFn: () => getTimeTrackingSummary(cardId),
        enabled: !!cardId,
    })
}

/**
 * Hook for fetching time tracking summaries for multiple cards.
 */
export const useTimeTrackingSummaries = (cardIds: number[]) => {
    return useQuery({
        queryKey: ['timeTrackingSummaries', cardIds],
        queryFn: () => getTimeTrackingSummaries(cardIds),
        enabled: cardIds.length > 0,
    })
}
