import { describe, expect, it } from 'vitest'
import { calculateCost, formatHourlyRateInput, parseHourlyRate } from './rates'

describe('parseHourlyRate', () => {
    it('treats an empty value as inherited', () => {
        expect(parseHourlyRate('  ')).toBeNull()
    })

    it('parses a numeric rate', () => {
        expect(parseHourlyRate('1500.50')).toBe(1500.5)
    })
})

describe('formatHourlyRateInput', () => {
    it('round-trips inherited and explicit rates', () => {
        expect(formatHourlyRateInput(null)).toBe('')
        expect(formatHourlyRateInput(0)).toBe('0')
    })
})

describe('calculateCost', () => {
    it('prices minutes at the given hourly rate', () => {
        expect(calculateCost(90, 1200)).toBe(1800)
        expect(calculateCost(undefined, 1200)).toBe(0)
    })
})
