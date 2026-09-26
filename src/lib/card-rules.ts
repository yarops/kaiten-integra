import { Card, isCardArchived } from '../types/work-management'

export const canInvoiceCard = (card: Card) => card.status === 'done' && !isCardArchived(card) && !card.invoice

/** Cards of sent or paid invoices are frozen; draft invoices keep them editable. */
export const isCardLocked = (card: Card) => !!card.invoice && card.invoice.status !== 'draft'

export const activeCardsOnly = (cards: Card[]) => cards.filter((card) => !isCardArchived(card))

export const normalizeTags = (tags: string[] = []) =>
    tags.map((name) => ({ name: name.trim() })).filter((tag) => tag.name)

export const retainInvoiceableSelection = (selectedIds: Iterable<number>, cards: Card[]) => {
    const allowed = new Set(cards.filter(canInvoiceCard).map((card) => card.id))
    return new Set([...selectedIds].filter((id) => allowed.has(id)))
}
