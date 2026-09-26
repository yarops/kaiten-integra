import { describe, expect, it } from 'vitest'
import { getStatusChangeConfirmMessage } from './invoice-rules'

describe('getStatusChangeConfirmMessage', () => {
    it('warns about archiving cards when marking as paid', () => {
        expect(getStatusChangeConfirmMessage('sent', 'paid')).toContain('archive its cards')
    })

    it('warns about reactivating cards when leaving paid', () => {
        expect(getStatusChangeConfirmMessage('paid', 'draft')).toContain('will become active')
    })

    it('asks a plain confirmation between non-paid statuses', () => {
        expect(getStatusChangeConfirmMessage('draft', 'sent')).toBe('Change status to sent?')
    })
})
