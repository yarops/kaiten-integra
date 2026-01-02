import { useState } from 'react'
import './App.css'
import { useSpaces } from './api/spaces'
import { useBoards } from './api/boards'
import { useCards } from './api/cards'
import { useCreateInvoice } from './api/invoices'
import { useTimeTrackingSummary, useTimeTrackingSummaries } from './api/time-entries'
import { useConfigStore } from './store/config-store'
import { KaitenCardState } from './types/kaiten'
import { InvoiceList } from './components/InvoiceList'
import { InvoiceDetails } from './components/InvoiceDetails'
import { TimeInput } from './components/TimeInput'

/**
 * Formats time spent in minutes to a human-readable format.
 */
const formatTimeSpent = (minutes?: number): string => {
    if (!minutes) return '—'
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours === 0) return `${mins}m`
    if (mins === 0) return `${hours}h`
    return `${hours}h ${mins}m`
}

/**
 * Returns the card state label.
 */
const getCardStateLabel = (state: number): string => {
    switch (state) {
        case KaitenCardState.Queued:
            return 'Queued'
        case KaitenCardState.InProgress:
            return 'In Progress'
        case KaitenCardState.Done:
            return 'Done'
        default:
            return 'Unknown'
    }
}

/**
 * Component for time tracking button.
 */
interface TimeTrackingButtonProps {
    cardId: number
    onOpenTimeTracking: (cardId: number) => void
}

const TimeTrackingButton: React.FC<TimeTrackingButtonProps> = ({ cardId, onOpenTimeTracking }) => {
    const { data: timeSummary } = useTimeTrackingSummary(cardId)

    const hasTimeEntries = timeSummary && timeSummary.total_minutes_all > 0

    return (
        <button
            className={`time-tracker-btn ${hasTimeEntries ? 'has-time' : ''}`}
            onClick={() => onOpenTimeTracking(cardId)}
            title={hasTimeEntries ? `Tracked: ${formatTimeSpent(timeSummary.total_minutes_all)}` : 'Track time'}
        >
            {hasTimeEntries ? '✓' : '+'}
        </button>
    )
}

/**
 * Component for displaying total time (Kaiten + tracked).
 */
interface TotalTimeDisplayProps {
    card: { id: number; time_spent_sum?: number }
}

const TotalTimeDisplay: React.FC<TotalTimeDisplayProps> = ({ card }) => {
    const { data: timeSummary } = useTimeTrackingSummary(card.id)

    const kaitenTime = card.time_spent_sum || 0
    const trackedTime = timeSummary?.total_minutes_all || 0
    const totalTime = kaitenTime + trackedTime

    // If no time at all, show dash.
    if (totalTime === 0) {
        return <span>—</span>
    }

    // If only Kaiten time, show it normally.
    if (trackedTime === 0) {
        return <span>{formatTimeSpent(totalTime)}</span>
    }

    // If we have both or only tracked time, show breakdown.
    return (
        <span title={`Kaiten: ${formatTimeSpent(kaitenTime)}, Tracked: ${formatTimeSpent(trackedTime)}`}>
            {formatTimeSpent(totalTime)}
            {kaitenTime > 0 && trackedTime > 0 && <span style={{ fontSize: '0.8em', color: '#888', marginLeft: '4px' }}>*</span>}
        </span>
    )
}

/**
 * Component for displaying total time summary for multiple cards.
 */
interface TotalTimeSummaryProps {
    cards: { id: number; time_spent_sum?: number }[]
}

const TotalTimeSummary: React.FC<TotalTimeSummaryProps> = ({ cards }) => {
    const cardIds = cards.map(card => card.id)
    const { data: timeSummaries } = useTimeTrackingSummaries(cardIds)

    const totalKaitenTime = cards.reduce((sum, card) => sum + (card.time_spent_sum || 0), 0)
    const totalTrackedTime = timeSummaries?.reduce((sum, summary) => sum + summary.total_minutes_all, 0) || 0
    const totalTime = totalKaitenTime + totalTrackedTime

    if (totalTime === 0) {
        return <span>0m</span>
    }

    return (
        <span title={`Kaiten: ${formatTimeSpent(totalKaitenTime)}, Tracked: ${formatTimeSpent(totalTrackedTime)}`}>
            {formatTimeSpent(totalTime)}
            {totalKaitenTime > 0 && totalTrackedTime > 0 && <span style={{ fontSize: '0.8em', color: '#888', marginLeft: '4px' }}>*</span>}
        </span>
    )
}

/**
 * Component for displaying total time for selected cards.
 */
interface SelectedCardsTimeSummaryProps {
    cards: { id: number; time_spent_sum?: number }[]
}

const SelectedCardsTimeSummary: React.FC<SelectedCardsTimeSummaryProps> = ({ cards }) => {
    const cardIds = cards.map(card => card.id)
    const { data: timeSummaries } = useTimeTrackingSummaries(cardIds)

    const totalKaitenTime = cards.reduce((sum, card) => sum + (card.time_spent_sum || 0), 0)
    const totalTrackedTime = timeSummaries?.reduce((sum, summary) => sum + summary.total_minutes_all, 0) || 0
    const totalTime = totalKaitenTime + totalTrackedTime

    if (totalTime === 0) {
        return <span>0m</span>
    }

    return (
        <span title={`Kaiten: ${formatTimeSpent(totalKaitenTime)}, Tracked: ${formatTimeSpent(totalTrackedTime)}`}>
            {formatTimeSpent(totalTime)}
            {totalKaitenTime > 0 && totalTrackedTime > 0 && <span style={{ fontSize: '0.8em', color: '#888', marginLeft: '4px' }}>*</span>}
        </span>
    )
}

type View = 'create' | 'invoices' | 'invoice-details'

function App() {
    const [currentView, setCurrentView] = useState<View>('create')
    const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null)
    const [selectedCardIds, setSelectedCardIds] = useState<Set<number>>(new Set())
    const [timeTrackingCardId, setTimeTrackingCardId] = useState<number | null>(null)
    const { selectedSpaceId, selectedBoardId, setSelectedSpace, setSelectedBoard } =
        useConfigStore()
    const { data: spaces, isLoading: isLoadingSpaces } = useSpaces()
    const { data: boards, isLoading: isLoadingBoards } = useBoards(selectedSpaceId)
    const { data: cards, isLoading: isLoadingCards } = useCards(selectedBoardId ?? undefined)
    const createInvoiceMutation = useCreateInvoice()

    const toggleCardSelection = (cardId: number, cardState: number, archived?: boolean) => {
        // Only allow selection of Done cards that are not archived.
        if (cardState !== KaitenCardState.Done || archived) return

        const newSelection = new Set(selectedCardIds)
        if (newSelection.has(cardId)) {
            newSelection.delete(cardId)
        } else {
            newSelection.add(cardId)
        }
        setSelectedCardIds(newSelection)
    }

    const toggleSelectAll = () => {
        if (!cards) return

        // Only select Done cards that are not archived.
        const doneCards = cards.filter((card) => card.state === KaitenCardState.Done && !card.archived)

        if (selectedCardIds.size === doneCards.length && doneCards.length > 0) {
            setSelectedCardIds(new Set())
        } else {
            setSelectedCardIds(new Set(doneCards.map((card) => card.id)))
        }
    }

    const handleCreateInvoice = async () => {
        if (!cards || selectedCardIds.size === 0) return

        const selectedCards = cards.filter((card) => selectedCardIds.has(card.id))
        const selectedSpace = spaces?.find((s) => s.id === selectedSpaceId)
        const selectedBoard = boards?.find((b) => b.id === selectedBoardId)

        if (!selectedSpace || !selectedBoard) return

        try {
            await createInvoiceMutation.mutateAsync({
                data: {
                    space_id: selectedSpace.id,
                    space_title: selectedSpace.title,
                    board_id: selectedBoard.id,
                    board_title: selectedBoard.title,
                },
                cards: selectedCards,
            })
            setSelectedCardIds(new Set())
            alert('Invoice created successfully!')
            setCurrentView('invoices')
        } catch (error) {
            console.error('Error creating invoice:', error)
            alert('Failed to create invoice. Please try again.')
        }
    }

    const handleSelectInvoice = (invoiceId: string) => {
        setSelectedInvoiceId(invoiceId)
        setCurrentView('invoice-details')
    }

    const handleBackToInvoices = () => {
        setSelectedInvoiceId(null)
        setCurrentView('invoices')
    }

    const handleTimeTrackingSave = async () => {
        // Time entry is saved by the TimeInput component.
        // We just need to close the modal.
        setTimeTrackingCardId(null)
    }

    const handleTimeTrackingCancel = () => {
        setTimeTrackingCardId(null)
    }

    const openTimeTracking = (cardId: number) => {
        setTimeTrackingCardId(cardId)
    }

    return (
        <div className="kaiten-app">
            <header className="kaiten-header">
                <h1>Kaiten Integration</h1>

                <nav className="app-nav">
                    <button
                        className={`nav-btn ${currentView === 'create' ? 'active' : ''}`}
                        onClick={() => setCurrentView('create')}
                    >
                        Create Invoice
                    </button>
                    <button
                        className={`nav-btn ${currentView === 'invoices' || currentView === 'invoice-details' ? 'active' : ''}`}
                        onClick={() => setCurrentView('invoices')}
                    >
                        View Invoices
                    </button>
                </nav>

                {currentView === 'create' && (
                    <div className="selectors">
                        <div className="selector-group">
                            <label htmlFor="space-select">Space:</label>
                            <select
                                id="space-select"
                                value={selectedSpaceId ?? ''}
                                onChange={(e) =>
                                    setSelectedSpace(
                                        e.target.value ? Number(e.target.value) : null
                                    )
                                }
                                disabled={isLoadingSpaces}
                            >
                                <option value="">Select a space</option>
                                {spaces?.map((space) => (
                                    <option key={space.id} value={space.id}>
                                        {space.title}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="selector-group">
                            <label htmlFor="board-select">Board:</label>
                            <select
                                id="board-select"
                                value={selectedBoardId ?? ''}
                                onChange={(e) =>
                                    setSelectedBoard(
                                        e.target.value ? Number(e.target.value) : null
                                    )
                                }
                                disabled={!selectedSpaceId || isLoadingBoards}
                            >
                                <option value="">Select a board</option>
                                {boards?.map((board) => (
                                    <option key={board.id} value={board.id}>
                                        {board.title}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                )}
            </header>

            <main className="kaiten-content">
                {currentView === 'invoices' && (
                    <InvoiceList onSelectInvoice={handleSelectInvoice} />
                )}

                {currentView === 'invoice-details' && selectedInvoiceId && (
                    <InvoiceDetails
                        invoiceId={selectedInvoiceId}
                        onBack={handleBackToInvoices}
                    />
                )}

                {timeTrackingCardId && (
                    <TimeInput
                        cardId={timeTrackingCardId}
                        cardTitle={cards?.find(c => c.id === timeTrackingCardId)?.title || 'Unknown Card'}
                        onSave={handleTimeTrackingSave}
                        onCancel={handleTimeTrackingCancel}
                    />
                )}

                {currentView === 'create' && (
                    <>
                        {!selectedSpaceId ? (
                            <p className="info-message">Please select a space.</p>
                        ) : !selectedBoardId ? (
                            <p className="info-message">Please select a board to view cards.</p>
                        ) : isLoadingCards ? (
                            <p className="info-message">Loading cards...</p>
                        ) : cards && cards.length > 0 ? (
                            <div className="table-container">
                                <table className="cards-table">
                                    <thead>
                                        <tr>
                                            <th className="checkbox-cell">
                                                <input
                                                    type="checkbox"
                                                    checked={
                                                        cards.filter((c) => c.state === KaitenCardState.Done && !c.archived)
                                                            .length > 0 &&
                                                        selectedCardIds.size ===
                                                        cards.filter((c) => c.state === KaitenCardState.Done && !c.archived)
                                                            .length
                                                    }
                                                    onChange={toggleSelectAll}
                                                />
                                            </th>
                                            <th>ID</th>
                                            <th>Title</th>
                                            <th>Tags</th>
                                            <th>Time Spent</th>
                                            <th>Created</th>
                                            <th>Status</th>
                                            <th>Track Time</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {cards.filter((card) => !card.archived).map((card) => {
                                            const isDone = card.state === KaitenCardState.Done
                                            return (
                                                <tr
                                                    key={card.id}
                                                    className={selectedCardIds.has(card.id) ? 'selected' : ''}
                                                >
                                                    <td className="checkbox-cell">
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedCardIds.has(card.id)}
                                                            disabled={!isDone || card.archived}
                                                            onChange={() => toggleCardSelection(card.id, card.state, card.archived)}
                                                        />
                                                    </td>
                                                    <td className="card-id">{card.id}</td>
                                                    <td className="card-title-cell">
                                                        <div className="card-title">{card.title}</div>
                                                    </td>
                                                    <td className="card-tags">
                                                        {card.tags && card.tags.length > 0 ? (
                                                            <div className="tags-list">
                                                                {card.tags.map((tag: unknown, index: number) => (
                                                                    <span key={index} className="tag">
                                                                        {(tag as { name?: string })?.name || String(tag)}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            '—'
                                                        )}
                                                    </td>
                                                    <td className="card-time">
                                                        <TotalTimeDisplay card={card} />
                                                    </td>
                                                    <td className="card-date">
                                                        {new Date(card.created).toLocaleDateString()}
                                                    </td>
                                                    <td className="card-status">
                                                        {getCardStateLabel(card.state)}
                                                    </td>
                                                    <td className="time-tracking-cell">
                                                        <TimeTrackingButton
                                                            cardId={card.id}
                                                            onOpenTimeTracking={openTimeTracking}
                                                        />
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                    <tfoot>
                                        <tr className="totals-row">
                                            <td colSpan={4} className="totals-label">Total:</td>
                                            <td className="card-time totals-time">
                                                <TotalTimeSummary cards={cards.filter((c) => !c.archived)} />
                                            </td>
                                            <td colSpan={2}></td>
                                        </tr>
                                    </tfoot>
                                </table>

                                {cards.filter((c) => !c.archived).length > 0 && (
                                    <div className="invoice-actions">
                                        <div className="invoice-summary">
                                            <span>
                                                {selectedCardIds.size} card(s) selected
                                            </span>
                                            {selectedCardIds.size > 0 && (
                                                <span>
                                                    Total time:{' '}
                                                    <SelectedCardsTimeSummary
                                                        cards={cards.filter((c) => selectedCardIds.has(c.id))}
                                                    />
                                                </span>
                                            )}
                                        </div>
                                        <button
                                            className="btn-create-invoice"
                                            onClick={handleCreateInvoice}
                                            disabled={selectedCardIds.size === 0 || createInvoiceMutation.isPending}
                                        >
                                            {createInvoiceMutation.isPending
                                                ? 'Creating...'
                                                : 'Create Invoice'}
                                        </button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <p className="info-message">No cards found in this board.</p>
                        )}
                    </>
                )}
            </main>
        </div>
    )
}

export default App

