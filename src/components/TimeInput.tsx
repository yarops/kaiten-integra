import { useState, useEffect } from 'react'
import { TimeInputProps, CreateTimeEntryData, TimeEntry } from '../types/time-tracking'
import { useCreateTimeEntry, useTimeEntriesForCard, useDeleteTimeEntry } from '../api/time-entries'
import './TimeInput.css'

/**
 * Formats time in hours and minutes to a readable string.
 */
const formatTime = (hours: number, minutes: number): string => {
    if (hours === 0 && minutes === 0) return '0m'
    if (hours === 0) return `${minutes}m`
    if (minutes === 0) return `${hours}h`
    return `${hours}h ${minutes}m`
}

/**
 * Formats a date to a readable string.
 */
const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('ru-RU')
}

/**
 * Component for inputting time spent on a card.
 */
export const TimeInput: React.FC<TimeInputProps> = ({
    cardId,
    cardTitle,
    initialHours = 0,
    initialMinutes = 0,
    onSave,
    onCancel,
}) => {
    const [hours, setHours] = useState(initialHours)
    const [minutes, setMinutes] = useState(initialMinutes)
    const [description, setDescription] = useState('')
    const [date, setDate] = useState(new Date().toISOString().split('T')[0])
    const [errors, setErrors] = useState<Record<string, string>>({})

    const createTimeEntryMutation = useCreateTimeEntry()
    const { data: timeEntries = [], refetch: refetchTimeEntries } = useTimeEntriesForCard(cardId)
    const deleteTimeEntryMutation = useDeleteTimeEntry()

    // Reset form when card changes.
    useEffect(() => {
        setHours(initialHours)
        setMinutes(initialMinutes)
        setDescription('')
        setDate(new Date().toISOString().split('T')[0])
        setErrors({})
    }, [cardId, initialHours, initialMinutes])

    const validateForm = (): boolean => {
        const newErrors: Record<string, string> = {}

        if (hours < 0 || hours > 23) {
            newErrors.hours = 'Hours must be between 0 and 23.'
        }

        if (minutes < 0 || minutes > 59) {
            newErrors.minutes = 'Minutes must be between 0 and 59.'
        }

        if (hours === 0 && minutes === 0) {
            newErrors.time = 'Please enter at least some time (hours or minutes).'
        }

        if (!date) {
            newErrors.date = 'Please select a date.'
        }

        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    const handleSave = async () => {
        if (!validateForm()) return

        const timeData: CreateTimeEntryData = {
            card_id: cardId,
            hours,
            minutes,
            description: description.trim() || undefined,
            date,
        }

        try {
            await createTimeEntryMutation.mutateAsync(timeData)
            await onSave(timeData)
            await refetchTimeEntries()

            // Reset form after successful save.
            setHours(0)
            setMinutes(0)
            setDescription('')
            setDate(new Date().toISOString().split('T')[0])
            setErrors({})
        } catch (error) {
            console.error('Failed to save time entry:', error)
            setErrors({ submit: 'Failed to save time entry. Please try again.' })
        }
    }

    const handleDeleteEntry = async (entryId: string) => {
        if (!confirm('Are you sure you want to delete this time entry?')) return

        try {
            await deleteTimeEntryMutation.mutateAsync(entryId)
            await refetchTimeEntries()
        } catch (error) {
            console.error('Failed to delete time entry:', error)
            alert('Failed to delete time entry. Please try again.')
        }
    }

    const totalTimeSpent = timeEntries.reduce((total, entry) => {
        return total + (entry.hours * 60 + entry.minutes)
    }, 0)

    const totalHours = Math.floor(totalTimeSpent / 60)
    const totalMinutes = totalTimeSpent % 60

    return (
        <div className="time-input-overlay" onClick={(e) => e.stopPropagation()}>
            <div className="time-input-modal" onClick={(e) => e.stopPropagation()}>
                <div className="time-input-header">
                    <h3 className="time-input-title">Track Time</h3>
                    <p className="time-input-card-info">Card: {cardTitle}</p>
                    {totalTimeSpent > 0 && (
                        <p className="time-input-card-info">
                            Total time spent: {formatTime(totalHours, totalMinutes)}
                        </p>
                    )}
                </div>

                <form className="time-input-form" onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
                    <div className="time-input-row">
                        <div className="time-input-group">
                            <label htmlFor="hours" className="time-input-label">Hours</label>
                            <input
                                id="hours"
                                type="number"
                                min="0"
                                max="23"
                                value={hours}
                                onChange={(e) => setHours(parseInt(e.target.value) || 0)}
                                className={`time-input-field ${errors.hours ? 'error' : ''}`}
                            />
                            {errors.hours && <div className="time-input-error">{errors.hours}</div>}
                        </div>

                        <div className="time-input-group">
                            <label htmlFor="minutes" className="time-input-label">Minutes</label>
                            <input
                                id="minutes"
                                type="number"
                                min="0"
                                max="59"
                                value={minutes}
                                onChange={(e) => setMinutes(parseInt(e.target.value) || 0)}
                                className={`time-input-field ${errors.minutes ? 'error' : ''}`}
                            />
                            {errors.minutes && <div className="time-input-error">{errors.minutes}</div>}
                        </div>

                        <div className="time-input-group">
                            <label htmlFor="date" className="time-input-label">Date</label>
                            <input
                                id="date"
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className={`time-input-field ${errors.date ? 'error' : ''}`}
                            />
                            {errors.date && <div className="time-input-error">{errors.date}</div>}
                        </div>
                    </div>

                    {errors.time && <div className="time-input-error">{errors.time}</div>}

                    <div className="time-input-description">
                        <label htmlFor="description" className="time-input-label">Description (optional)</label>
                        <textarea
                            id="description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="time-input-field"
                            placeholder="What did you work on?"
                        />
                    </div>

                    {errors.submit && <div className="time-input-error">{errors.submit}</div>}

                    <div className="time-input-actions">
                        <button
                            type="button"
                            className="time-input-btn time-input-btn-cancel"
                            onClick={onCancel}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="time-input-btn time-input-btn-save"
                            disabled={createTimeEntryMutation.isPending}
                        >
                            {createTimeEntryMutation.isPending ? 'Saving...' : 'Save Time'}
                        </button>
                    </div>
                </form>

                {timeEntries.length > 0 && (
                    <div className="time-entry-list">
                        <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '600' }}>
                            Previous Entries
                        </h4>
                        {timeEntries.map((entry: TimeEntry) => (
                            <div key={entry.id} className="time-entry-item">
                                <div className="time-entry-info">
                                    <div className="time-entry-time">
                                        {formatTime(entry.hours, entry.minutes)}
                                    </div>
                                    <div className="time-entry-date">
                                        {formatDate(entry.date)}
                                    </div>
                                    {entry.description && (
                                        <div className="time-entry-description">
                                            {entry.description}
                                        </div>
                                    )}
                                </div>
                                <div className="time-entry-actions">
                                    <button
                                        type="button"
                                        className="time-entry-btn"
                                        onClick={() => handleDeleteEntry(entry.id)}
                                        disabled={deleteTimeEntryMutation.isPending}
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
