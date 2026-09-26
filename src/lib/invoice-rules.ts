import { Invoice, InvoiceCard } from '../types/invoice'
import { getTagName } from './card-rules'

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

/**
 * Groups cards by their primary (first) tag, so each card appears exactly once
 * and group amounts add up to the invoice total. Other tags are shown as badges.
 */
export const groupCardsByPrimaryTag = (cards: InvoiceCard[]): Map<string, InvoiceCard[]> => {
    const groups = new Map<string, InvoiceCard[]>()

    cards.forEach((card) => {
        const groupName = card.tags && card.tags.length > 0 ? getTagName(card.tags[0]) : 'No Tags'
        const groupCards = groups.get(groupName) || []
        groupCards.push(card)
        groups.set(groupName, groupCards)
    })

    return groups
}
