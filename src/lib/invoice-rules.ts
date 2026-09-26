import { Invoice } from '../types/invoice'

type InvoiceStatus = Invoice['status']

export const getStatusChangeConfirmMessage = (current: InvoiceStatus, next: InvoiceStatus) => {
    const messages = [next === 'paid'
        ? 'Are you sure? This will mark the invoice as paid and archive its cards.'
        : `Change status to ${next}?`]
    if (current === 'draft') {
        messages.push('Card details and time will be refreshed from the cards and locked.')
    }
    if (current === 'paid') {
        messages.push('Cards not used by another paid invoice will become active.')
    }
    if (next === 'draft') {
        messages.push('Its cards will become editable again.')
    }
    return messages.join(' ')
}
