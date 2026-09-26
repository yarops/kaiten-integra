/**
 * Formats minutes as "1h 30m", or "—" when there is no time.
 */
export const formatMinutes = (minutes = 0) => {
    if (!minutes) return '—'
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return [hours && `${hours}h`, mins && `${mins}m`].filter(Boolean).join(' ')
}
