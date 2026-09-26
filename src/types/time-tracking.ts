/**
 * Types for time tracking functionality.
 */

/**
 * Represents a time tracking entry for a local card.
 */
export interface TimeEntry {
    id: string
    card_id: number
    hours: number
    minutes: number
    description?: string
    date: string
    created_at: string
    updated_at: string
}

/**
 * Input data for creating a new time entry.
 */
export interface CreateTimeEntryData {
    card_id: number
    hours: number
    minutes: number
    description?: string
    date: string
}

/**
 * Summary of time tracking for a card.
 */
export interface TimeTrackingSummary {
    card_id: number
    total_hours: number
    total_minutes: number
    total_minutes_all: number
    entries_count: number
    last_entry_date?: string
}

/**
 * Time input component props.
 */
export interface TimeInputProps {
    cardId: number
    cardTitle: string
    onSave: (data: CreateTimeEntryData) => Promise<void>
    onCancel?: () => void
}
