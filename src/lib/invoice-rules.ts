import { Invoice } from '../types/invoice'

type InvoiceStatus = Invoice['status']

export const getStatusChangeConfirmMessage = (current: InvoiceStatus, next: InvoiceStatus) => {
    if (next === 'paid') {
        return 'Are you sure? This will mark the invoice as paid and archive its cards.'
    }
    if (current === 'paid') {
        return `Change status to ${next}? Cards not used by another paid invoice will become active.`
    }
    return `Change status to ${next}?`
}
