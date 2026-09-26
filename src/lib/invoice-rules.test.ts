import { describe, expect, it } from 'vitest'
import { InvoiceCard } from '../types/invoice'
import { getStatusChangeConfirmMessage, groupCardsByPrimaryTag } from './invoice-rules'

describe('getStatusChangeConfirmMessage', () => {
    it('warns about archiving cards when marking as paid', () => {
        expect(getStatusChangeConfirmMessage('sent', 'paid')).toContain('archive its cards')
    })

    it('warns about reactivating cards when leaving paid', () => {
        expect(getStatusChangeConfirmMessage('paid', 'draft')).toContain('will become active')
    })

    it('warns about refreshing and locking cards when leaving draft', () => {
        expect(getStatusChangeConfirmMessage('draft', 'sent')).toContain('refreshed from the cards and locked')
        expect(getStatusChangeConfirmMessage('draft', 'paid')).toContain('refreshed from the cards and locked')
    })

    it('tells that cards become editable when returning to draft', () => {
        expect(getStatusChangeConfirmMessage('sent', 'draft')).toBe('Change status to draft? Its cards will become editable again.')
    })

    it('asks a plain confirmation between locked statuses', () => {
        expect(getStatusChangeConfirmMessage('paid', 'sent')).toBe('Change status to sent? Cards not used by another paid invoice will become active.')
    })
})

const card = (id: string, tags: InvoiceCard['tags']): InvoiceCard => ({
    id,
    invoice_id: 'invoice',
    card_id: Number(id),
    card_title: `Card ${id}`,
    card_description: null,
    time_spent: 60,
    tags,
    created_at: null,
    created_at_record: '2026-09-01T00:00:00Z',
})

describe('groupCardsByPrimaryTag', () => {
    it('puts each card into exactly one group by its first tag', () => {
        const groups = groupCardsByPrimaryTag([
            card('1', ['support', 'urgent']),
            card('2', [{ name: 'urgent' }]),
            card('3', [{ name: 'support' }, 'backend']),
        ])

        expect(Array.from(groups, ([name, cards]) => [name, cards.map((c) => c.id)])).toEqual([
            ['support', ['1', '3']],
            ['urgent', ['2']],
        ])
    })

    it('groups untagged cards under "No Tags"', () => {
        const groups = groupCardsByPrimaryTag([card('1', []), card('2', null as unknown as InvoiceCard['tags'])])

        expect(groups.get('No Tags')?.map((c) => c.id)).toEqual(['1', '2'])
    })
})
