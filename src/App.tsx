import { useState } from 'react'
import './App.css'
import { useSpaces } from './api/spaces'
import { useBoards } from './api/boards'
import { useCards } from './api/cards'
import { useCreateInvoice } from './api/invoices'
import { useConfigStore } from './store/config-store'
import { KaitenCardState } from './types/kaiten'
import { InvoiceList } from './components/InvoiceList'
import { InvoiceDetails } from './components/InvoiceDetails'

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

type View = 'create' | 'invoices' | 'invoice-details'

function App() {
    const [currentView, setCurrentView] = useState<View>('create')
    const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null)
    const [selectedCardIds, setSelectedCardIds] = useState<Set<number>>(new Set())
    const { selectedSpaceId, selectedBoardId, setSelectedSpace, setSelectedBoard } =
        useConfigStore()
    const { data: spaces, isLoading: isLoadingSpaces } = useSpaces()
    const { data: boards, isLoading: isLoadingBoards } = useBoards(selectedSpaceId)
    const { data: cards, isLoading: isLoadingCards } = useCards(selectedBoardId ?? undefined)
    const createInvoiceMutation = useCreateInvoice()

    const toggleCardSelection = (cardId: number, cardState: number) => {
        // Only allow selection of Done cards.
        if (cardState !== KaitenCardState.Done) return

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

        // Only select Done cards.
        const doneCards = cards.filter((card) => card.state === KaitenCardState.Done)

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
                                                        cards.filter((c) => c.state === KaitenCardState.Done)
                                                            .length > 0 &&
                                                        selectedCardIds.size ===
                                                        cards.filter((c) => c.state === KaitenCardState.Done)
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
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {cards.map((card) => {
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
                                                            disabled={!isDone}
                                                            onChange={() => toggleCardSelection(card.id, card.state)}
                                                        />
                                                    </td>
                                                    <td className="card-id">{card.id}</td>
                                                    <td className="card-title-cell">
                                                        <div className="card-title">{card.title}</div>
                                                    </td>
                                                    <td className="card-tags">
                                                        {card.tags && card.tags.length > 0 ? (
                                                            <div className="tags-list">
                                                                {card.tags.map((tag: any, index: number) => (
                                                                    <span key={index} className="tag">
                                                                        {tag.name || tag}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            '—'
                                                        )}
                                                    </td>
                                                    <td className="card-time">
                                                        {formatTimeSpent(card.time_spent_sum)}
                                                    </td>
                                                    <td className="card-date">
                                                        {new Date(card.created).toLocaleDateString()}
                                                    </td>
                                                    <td className="card-status">
                                                        {getCardStateLabel(card.state)}
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                    <tfoot>
                                        <tr className="totals-row">
                                            <td colSpan={4} className="totals-label">Total:</td>
                                            <td className="card-time totals-time">
                                                {formatTimeSpent(
                                                    cards.reduce((sum, card) => sum + (card.time_spent_sum || 0), 0)
                                                )}
                                            </td>
                                            <td colSpan={2}></td>
                                        </tr>
                                    </tfoot>
                                </table>

                                {cards.length > 0 && (
                                    <div className="invoice-actions">
                                        <div className="invoice-summary">
                                            <span>
                                                {selectedCardIds.size} card(s) selected
                                            </span>
                                            {selectedCardIds.size > 0 && (
                                                <span>
                                                    Total time:{' '}
                                                    {formatTimeSpent(
                                                        cards
                                                            .filter((c) => selectedCardIds.has(c.id))
                                                            .reduce((sum, c) => sum + (c.time_spent_sum || 0), 0)
                                                    )}
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

