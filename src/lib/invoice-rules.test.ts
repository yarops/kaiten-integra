import { describe, expect, it } from 'vitest'
import { getStatusChangeConfirmMessage } from './invoice-rules'

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
