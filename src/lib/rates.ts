/**
 * Parses an hourly rate input; an empty value means "inherit" (null).
 * Range and precision are enforced by the input itself (min=0, step=0.01).
 */
export const parseHourlyRate = (value: string): number | null => {
    const trimmed = value.trim()
    return trimmed ? Number(trimmed) : null
}

export const formatHourlyRateInput = (rate: number | null | undefined) => rate == null ? '' : String(rate)

/**
 * Calculates cost for time spent in minutes at the given hourly rate.
 */
export const calculateCost = (minutes: number | undefined, hourlyRate: number): number =>
    minutes ? (minutes / 60) * hourlyRate : 0

/**
 * Formats a ruble amount; rates may have kopecks, totals are shown in whole rubles.
 */
export const formatCurrency = (amount: number, maximumFractionDigits = 0): string =>
    new Intl.NumberFormat('ru-RU', {
        style: 'currency',
        currency: 'RUB',
        minimumFractionDigits: 0,
        maximumFractionDigits,
    }).format(amount)

export const formatHourlyRate = (rate: number) => `${formatCurrency(rate, 2)}/h`
