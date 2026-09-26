import { describe, expect, it } from 'vitest'
import { formatMinutes } from './time'

describe('formatMinutes', () => {
    it('formats hours and minutes', () => {
        expect(formatMinutes(90)).toBe('1h 30m')
        expect(formatMinutes(120)).toBe('2h')
        expect(formatMinutes(45)).toBe('45m')
    })

    it('shows a dash when there is no time', () => {
        expect(formatMinutes(0)).toBe('—')
        expect(formatMinutes()).toBe('—')
    })
})
