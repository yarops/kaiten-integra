import { Card, CardInvoice, CardStatus, cardStatusLabels, isCardArchived } from '../types/work-management'
import { canInvoiceCard, isCardLocked } from '../lib/card-rules'
import { formatMinutes } from '../lib/time'

const cardInvoiceLabels: Record<CardInvoice['status'], string> = {
    draft: 'In draft invoice',
    sent: 'In sent invoice',
    paid: 'Paid invoice',
}
const lockedCardHint = 'Included in a sent or paid invoice. Move the invoice back to draft to edit.'

interface CardRowActions {
    onToggleCard: (card: Card) => void
    onChangeStatus: (card: Card, status: CardStatus) => void
    onTrackTime: (card: Card) => void
    onEdit: (card: Card) => void
    onToggleArchive: (card: Card) => void
    onOpenInvoice: (invoiceId: string) => void
}

interface CardsTableProps extends CardRowActions {
    cards: Card[]
    minutesByCard: Map<number, number>
    selectedCardIds: Set<number>
    allSelected: boolean
    statusPendingCardId: number | null
    onToggleAll: () => void
}

interface CardRowProps extends CardRowActions {
    card: Card
    minutes: number
    selected: boolean
    statusPending: boolean
}

const CardRow = ({ card, minutes, selected, statusPending, ...actions }: CardRowProps) => {
    const archived = isCardArchived(card)
    const locked = isCardLocked(card)
    const lockedTitle = locked ? lockedCardHint : undefined
    const tags = card.tags.map((tag) => (typeof tag === 'string' ? tag : tag.name)).join(', ')
    const rowClassName = [selected && 'selected', archived && 'archived-row'].filter(Boolean).join(' ')

    return (
        <tr className={rowClassName}>
            <td>
                <input
                    type="checkbox"
                    checked={selected}
                    disabled={!canInvoiceCard(card)}
                    onChange={() => actions.onToggleCard(card)}
                />
            </td>
            <td>{card.id}</td>
            <td>
                <strong>{card.title}</strong>
                {card.description && <div className="card-description">{card.description}</div>}
            </td>
            <td>{tags || '—'}</td>
            <td>{formatMinutes(minutes)}</td>
            <td>{new Date(card.created_at).toLocaleDateString()}</td>
            <td className="card-status">
                <select
                    value={card.status}
                    disabled={archived || locked || statusPending}
                    title={lockedTitle}
                    onChange={(event) => actions.onChangeStatus(card, event.target.value as CardStatus)}
                >
                    {Object.entries(cardStatusLabels).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                    ))}
                </select>
                {card.invoice && (
                    <button className="invoice-link" onClick={() => actions.onOpenInvoice(card.invoice!.id)}>
                        {cardInvoiceLabels[card.invoice.status]}
                    </button>
                )}
            </td>
            <td>
                <button
                    className="time-tracker-btn"
                    disabled={archived || locked}
                    title={lockedTitle}
                    onClick={() => actions.onTrackTime(card)}
                >
                    {minutes ? '✓' : '+'}
                </button>
            </td>
            <td className="row-actions">
                <button disabled={locked} title={lockedTitle} onClick={() => actions.onEdit(card)}>
                    Edit
                </button>
                <button
                    disabled={!!card.invoice}
                    title={card.invoice ? 'Included in an invoice.' : undefined}
                    onClick={() => actions.onToggleArchive(card)}
                >
                    {card.manually_archived ? 'Restore' : 'Archive'}
                </button>
            </td>
        </tr>
    )
}

/**
 * Cards of a board with selection for invoicing and per-card actions.
 */
export const CardsTable = ({
    cards,
    minutesByCard,
    selectedCardIds,
    allSelected,
    statusPendingCardId,
    onToggleAll,
    ...actions
}: CardsTableProps) => (
    <div className="table-container">
        <table className="cards-table">
            <thead>
                <tr>
                    <th>
                        <input type="checkbox" checked={allSelected} onChange={onToggleAll} />
                    </th>
                    <th>ID</th>
                    <th>Title</th>
                    <th>Tags</th>
                    <th>Time</th>
                    <th>Created</th>
                    <th>Status</th>
                    <th>Track</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                {cards.map((card) => (
                    <CardRow
                        key={card.id}
                        card={card}
                        minutes={minutesByCard.get(card.id) || 0}
                        selected={selectedCardIds.has(card.id)}
                        statusPending={statusPendingCardId === card.id}
                        {...actions}
                    />
                ))}
            </tbody>
        </table>
    </div>
)
