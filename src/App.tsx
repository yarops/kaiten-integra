import { useEffect, useMemo, useState } from 'react'
import './App.css'
import { useCreateWorkspace, useUpdateWorkspace, useWorkspaces } from './api/workspaces'
import { useBoards, useCreateBoard, useUpdateBoard } from './api/boards'
import { useCards, useUpdateCard } from './api/cards'
import { useCreateInvoice } from './api/invoices'
import { useTimeTrackingSummaries } from './api/time-entries'
import { useConfigStore } from './store/config-store'
import { Card, CardStatus, cardStatusLabels, isCardArchived } from './types/work-management'
import { activeCardsOnly, canInvoiceCard, retainInvoiceableSelection } from './lib/card-rules'
import { InvoiceList } from './components/InvoiceList'
import { InvoiceDetails } from './components/InvoiceDetails'
import { TimeInput } from './components/TimeInput'
import { CardForm } from './components/CardForm'

const formatTime = (minutes = 0) => minutes
    ? `${Math.floor(minutes / 60) ? `${Math.floor(minutes / 60)}h ` : ''}${minutes % 60 ? `${minutes % 60}m` : ''}`.trim()
    : '—'

type View = 'create' | 'invoices' | 'invoice-details'

function App() {
    const [view, setView] = useState<View>('create')
    const [invoiceId, setInvoiceId] = useState<string | null>(null)
    const [selectedCardIds, setSelectedCardIds] = useState<Set<number>>(new Set())
    const [timeCardId, setTimeCardId] = useState<number | null>(null)
    const [editingCard, setEditingCard] = useState<Card | 'new' | null>(null)
    const [showArchived, setShowArchived] = useState(false)
    const { selectedWorkspaceId, selectedBoardId, setSelectedWorkspace, setSelectedBoard } = useConfigStore()

    const { data: workspaces = [], isLoading: loadingWorkspaces } = useWorkspaces(showArchived)
    const { data: boards = [], isLoading: loadingBoards } = useBoards(selectedWorkspaceId, showArchived)
    const { data: cards = [], isLoading: loadingCards } = useCards(selectedBoardId || undefined, showArchived)
    const createWorkspace = useCreateWorkspace()
    const updateWorkspace = useUpdateWorkspace()
    const createBoard = useCreateBoard()
    const updateBoard = useUpdateBoard()
    const updateCard = useUpdateCard()
    const createInvoice = useCreateInvoice()

    const activeCards = useMemo(() => activeCardsOnly(cards), [cards])
    const cardIds = useMemo(() => cards.map((card) => card.id).sort((a, b) => a - b), [cards])
    const { data: summaries = [] } = useTimeTrackingSummaries(cardIds)
    const minutesByCard = useMemo(() => new Map(summaries.map((summary) => [summary.card_id, summary.total_minutes_all])), [summaries])
    const selectedCards = activeCards.filter((card) => selectedCardIds.has(card.id))

    useEffect(() => {
        setSelectedCardIds((current) => retainInvoiceableSelection(current, activeCards))
    }, [activeCards])

    useEffect(() => {
        if (!loadingWorkspaces && selectedWorkspaceId && !workspaces.some((item) => item.id === selectedWorkspaceId)) {
            setSelectedWorkspace(null)
        }
    }, [loadingWorkspaces, selectedWorkspaceId, setSelectedWorkspace, workspaces])

    useEffect(() => {
        if (!loadingBoards && selectedBoardId && !boards.some((item) => item.id === selectedBoardId)) {
            setSelectedBoard(null)
        }
    }, [boards, loadingBoards, selectedBoardId, setSelectedBoard])

    const promptTitle = async (kind: 'workspace' | 'board', current?: string) => {
        const title = prompt(`${current ? 'Rename' : 'New'} ${kind}:`, current || '')?.trim()
        if (!title) return
        try {
            if (kind === 'workspace') {
                if (current && selectedWorkspaceId) await updateWorkspace.mutateAsync({ id: selectedWorkspaceId, changes: { title } })
                else { const result = await createWorkspace.mutateAsync(title); setSelectedWorkspace(result.id) }
            } else if (selectedWorkspaceId) {
                if (current && selectedBoardId) await updateBoard.mutateAsync({ id: selectedBoardId, changes: { title } })
                else { const result = await createBoard.mutateAsync({ workspace_id: selectedWorkspaceId, title }); setSelectedBoard(result.id) }
            }
        } catch (error) { console.error(error); alert(`Failed to save ${kind}.`) }
    }

    const toggleWorkspaceArchive = async () => {
        const workspace = workspaces.find((item) => item.id === selectedWorkspaceId)
        if (!workspace || !confirm(`${workspace.archived ? 'Restore' : 'Archive'} workspace “${workspace.title}”?`)) return
        await updateWorkspace.mutateAsync({ id: workspace.id, changes: { archived: !workspace.archived } })
        if (!workspace.archived && !showArchived) setSelectedWorkspace(null)
    }
    const toggleBoardArchive = async () => {
        const board = boards.find((item) => item.id === selectedBoardId)
        if (!board || !confirm(`${board.archived ? 'Restore' : 'Archive'} board “${board.title}”?`)) return
        await updateBoard.mutateAsync({ id: board.id, changes: { archived: !board.archived } })
        if (!board.archived && !showArchived) setSelectedBoard(null)
    }
    const toggleCardArchive = async (card: Card) => {
        if (card.billing_archived) return
        if (!confirm(`${card.manually_archived ? 'Restore' : 'Archive'} card “${card.title}”?`)) return
        await updateCard.mutateAsync({ id: card.id, changes: { manually_archived: !card.manually_archived } })
    }

    const toggleCard = (card: Card) => {
        if (card.status !== 'done' || isCardArchived(card)) return
        setSelectedCardIds((current) => {
            const next = new Set(current); next.has(card.id) ? next.delete(card.id) : next.add(card.id); return next
        })
    }

    const createSelectedInvoice = async () => {
        const workspace = workspaces.find((item) => item.id === selectedWorkspaceId)
        const board = boards.find((item) => item.id === selectedBoardId)
        if (!workspace || !board || !selectedCards.length) return
        try {
            await createInvoice.mutateAsync({
                data: { workspace_id: workspace.id, workspace_title: workspace.title, board_id: board.id, board_title: board.title },
                cards: selectedCards,
            })
            setSelectedCardIds(new Set()); setView('invoices')
        } catch (error) { console.error(error); alert('Failed to create invoice.') }
    }

    const selectedWorkspace = workspaces.find((item) => item.id === selectedWorkspaceId)
    const selectedBoard = boards.find((item) => item.id === selectedBoardId)
    const doneCards = activeCards.filter(canInvoiceCard)
    const selectedMinutes = selectedCards.reduce((sum, card) => sum + (minutesByCard.get(card.id) || 0), 0)

    return <div className="app-shell">
        <header className="app-header">
            <h1>Workspaces & Invoices</h1>
            <nav className="app-nav">
                <button className={`nav-btn ${view === 'create' ? 'active' : ''}`} onClick={() => setView('create')}>Cards & Invoice</button>
                <button className={`nav-btn ${view !== 'create' ? 'active' : ''}`} onClick={() => setView('invoices')}>Invoices</button>
            </nav>
            {view === 'create' && <>
                <div className="archive-toggle"><label><input type="checkbox" checked={showArchived} onChange={(event) => setShowArchived(event.target.checked)} /> Show archived</label></div>
                <div className="selectors">
                    <div className="selector-group"><label>Workspace:</label><select value={selectedWorkspaceId || ''} disabled={loadingWorkspaces} onChange={(event) => setSelectedWorkspace(event.target.value ? Number(event.target.value) : null)}>
                        <option value="">Select a workspace</option>{workspaces.map((item) => <option key={item.id} value={item.id}>{item.title}{item.archived ? ' (archived)' : ''}</option>)}
                    </select><div className="entity-actions"><button onClick={() => promptTitle('workspace')}>+</button><button disabled={!selectedWorkspace} onClick={() => promptTitle('workspace', selectedWorkspace?.title)}>Rename</button><button disabled={!selectedWorkspace} onClick={toggleWorkspaceArchive}>{selectedWorkspace?.archived ? 'Restore' : 'Archive'}</button></div></div>
                    <div className="selector-group"><label>Board:</label><select value={selectedBoardId || ''} disabled={!selectedWorkspaceId || loadingBoards} onChange={(event) => setSelectedBoard(event.target.value ? Number(event.target.value) : null)}>
                        <option value="">Select a board</option>{boards.map((item) => <option key={item.id} value={item.id}>{item.title}{item.archived ? ' (archived)' : ''}</option>)}
                    </select><div className="entity-actions"><button disabled={!selectedWorkspaceId} onClick={() => promptTitle('board')}>+</button><button disabled={!selectedBoard} onClick={() => promptTitle('board', selectedBoard?.title)}>Rename</button><button disabled={!selectedBoard} onClick={toggleBoardArchive}>{selectedBoard?.archived ? 'Restore' : 'Archive'}</button></div></div>
                </div>
            </>}
        </header>

        <main className="app-content">
            {view === 'invoices' && <InvoiceList onSelectInvoice={(id) => { setInvoiceId(id); setView('invoice-details') }} />}
            {view === 'invoice-details' && invoiceId && <InvoiceDetails invoiceId={invoiceId} onBack={() => setView('invoices')} />}
            {view === 'create' && (!selectedWorkspaceId ? <p className="info-message">Please select or create a workspace.</p>
                : !selectedBoardId ? <p className="info-message">Please select or create a board.</p>
                : loadingCards ? <p className="info-message">Loading cards...</p>
                : <section>
                    <div className="table-toolbar"><h2>{selectedBoard?.title}</h2><button className="btn-primary" disabled={selectedBoard?.archived} onClick={() => setEditingCard('new')}>New card</button></div>
                    {cards.length ? <div className="table-container"><table className="cards-table"><thead><tr><th><input type="checkbox" checked={doneCards.length > 0 && selectedCardIds.size === doneCards.length} onChange={() => setSelectedCardIds(selectedCardIds.size === doneCards.length ? new Set() : new Set(doneCards.map((card) => card.id)))} /></th><th>ID</th><th>Title</th><th>Tags</th><th>Time</th><th>Created</th><th>Status</th><th>Track</th><th>Actions</th></tr></thead>
                        <tbody>{cards.map((card) => { const archived = isCardArchived(card); return <tr key={card.id} className={`${selectedCardIds.has(card.id) ? 'selected ' : ''}${archived ? 'archived-row' : ''}`}>
                            <td><input type="checkbox" checked={selectedCardIds.has(card.id)} disabled={card.status !== 'done' || archived} onChange={() => toggleCard(card)} /></td><td>{card.id}</td><td><strong>{card.title}</strong>{card.description && <div className="card-description">{card.description}</div>}</td>
                            <td>{card.tags.map((tag) => typeof tag === 'string' ? tag : tag.name).join(', ') || '—'}</td><td>{formatTime(minutesByCard.get(card.id))}</td><td>{new Date(card.created_at).toLocaleDateString()}</td>
                            <td><select value={card.status} disabled={archived} onChange={(event) => updateCard.mutate({ id: card.id, changes: { status: event.target.value as CardStatus } })}>{Object.entries(cardStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>{card.billing_archived && <small>Paid invoice</small>}</td>
                            <td><button disabled={archived} className="time-tracker-btn" onClick={() => setTimeCardId(card.id)}>{minutesByCard.get(card.id) ? '✓' : '+'}</button></td>
                            <td className="row-actions"><button onClick={() => setEditingCard(card)}>Edit</button><button disabled={card.billing_archived} onClick={() => toggleCardArchive(card)}>{card.manually_archived ? 'Restore' : 'Archive'}</button></td>
                        </tr> })}</tbody></table></div> : <p className="info-message">No cards yet.</p>}
                    <div className="invoice-actions"><span>{selectedCardIds.size} selected · {formatTime(selectedMinutes)}</span><button className="btn-create-invoice" disabled={!selectedCards.length || createInvoice.isPending} onClick={createSelectedInvoice}>{createInvoice.isPending ? 'Creating…' : 'Create Invoice'}</button></div>
                </section>)}
        </main>
        {editingCard && selectedBoardId && <CardForm boardId={selectedBoardId} card={editingCard === 'new' ? undefined : editingCard} onClose={() => setEditingCard(null)} />}
        {timeCardId && <TimeInput cardId={timeCardId} cardTitle={cards.find((card) => card.id === timeCardId)?.title || 'Card'} onSave={async () => setTimeCardId(null)} onCancel={() => setTimeCardId(null)} />}
    </div>
}

export default App
