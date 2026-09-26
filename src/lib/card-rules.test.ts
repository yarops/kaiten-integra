import { describe, expect, it } from 'vitest'
import { activeCardsOnly, canInvoiceCard, isCardLocked, normalizeTags, retainInvoiceableSelection } from './card-rules'
import { Card } from '../types/work-management'

const card = (changes: Partial<Card> = {}): Card => ({
    id: 1,
    board_id: 1,
    title: 'Card',
    description: null,
    status: 'queued',
    tags: [],
    manually_archived: false,
    billing_archived: false,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...changes,
})

describe('card rules', () => {
    it('allows only active done cards in an invoice', () => {
        expect(canInvoiceCard(card({ status: 'done' }))).toBe(true)
        expect(canInvoiceCard(card({ status: 'in_progress' }))).toBe(false)
        expect(canInvoiceCard(card({ status: 'done', manually_archived: true }))).toBe(false)
        expect(canInvoiceCard(card({ status: 'done', billing_archived: true }))).toBe(false)
        expect(canInvoiceCard(card({ status: 'done', invoice: { id: 'invoice-1', status: 'draft' } }))).toBe(false)
    })

    it('locks cards of sent and paid invoices only', () => {
        expect(isCardLocked(card())).toBe(false)
        expect(isCardLocked(card({ invoice: { id: 'invoice-1', status: 'draft' } }))).toBe(false)
        expect(isCardLocked(card({ invoice: { id: 'invoice-1', status: 'sent' } }))).toBe(true)
        expect(isCardLocked(card({ invoice: { id: 'invoice-1', status: 'paid' } }))).toBe(true)
    })

    it('hides both manual and billing archives', () => {
        const cards = [card({ id: 1 }), card({ id: 2, manually_archived: true }), card({ id: 3, billing_archived: true })]
        expect(activeCardsOnly(cards).map(({ id }) => id)).toEqual([1])
    })

    it('drops invalid card IDs from an existing selection', () => {
        const cards = [card({ id: 1, status: 'done' }), card({ id: 2, status: 'queued' }), card({ id: 3, status: 'done', billing_archived: true }),
            card({ id: 4, status: 'done', invoice: { id: 'invoice-1', status: 'draft' } })]
        expect([...retainInvoiceableSelection([1, 2, 3, 4, 99], cards)]).toEqual([1])
    })

    it('trims and removes empty tags', () => {
        expect(normalizeTags([' support ', '', ' billing'])).toEqual([{ name: 'support' }, { name: 'billing' }])
    })
})
