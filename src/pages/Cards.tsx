import { useEffect, useMemo, useState } from 'react'
import { getRouteApi, useNavigate } from '@tanstack/react-router'
import { useUpdateWorkspace, useWorkspaces } from '../api/workspaces'
import { useBoards, useCreateBoard, useUpdateBoard } from '../api/boards'
import { useCards, useUpdateCard } from '../api/cards'
import { useCreateInvoice } from '../api/invoices'
import { useTimeTrackingSummaries } from '../api/time-entries'
import { useConfigStore } from '../store/config-store'
import { Card, CardStatus, Workspace } from '../types/work-management'
import { activeCardsOnly, canInvoiceCard, retainInvoiceableSelection } from '../lib/card-rules'
import { formatMinutes } from '../lib/time'
import { TimeInput } from '../components/TimeInput'
import { CardForm } from '../components/CardForm'
import { CardsTable } from '../components/CardsTable'
import { WorkspaceForm } from '../components/WorkspaceForm'
import { useDialogs } from '../components/dialogs/dialogs-context'

const cardsRoute = getRouteApi('/')

/**
 * Reads the cards view selection from the URL search params.
 */
const useCardsSelection = () => {
    const { workspace, board, archived } = cardsRoute.useSearch()
    return { selectedWorkspaceId: workspace ?? null, selectedBoardId: board ?? null, showArchived: !!archived }
}

const parseSelectedId = (value: string) => (value ? Number(value) : null)

/**
 * Workspace and board selectors of the cards view, rendered inside the app header.
 */
export function CardsHeader() {
    const search = cardsRoute.useSearch()
    const navigate = cardsRoute.useNavigate()
    const setCardsSearch = useConfigStore((state) => state.setCardsSearch)
    const { selectedWorkspaceId, selectedBoardId, showArchived } = useCardsSelection()
    const [editingWorkspace, setEditingWorkspace] = useState<Workspace | 'new' | null>(null)
    const dialogs = useDialogs()

    const { data: workspaces = [], isLoading: loadingWorkspaces } = useWorkspaces(showArchived)
    const { data: boards = [], isLoading: loadingBoards } = useBoards(selectedWorkspaceId, showArchived)
    const updateWorkspace = useUpdateWorkspace()
    const createBoard = useCreateBoard()
    const updateBoard = useUpdateBoard()

    const setSelectedWorkspace = (workspaceId: number | null) =>
        navigate({ to: '/', search: { archived: search.archived, workspace: workspaceId ?? undefined } })
    const setSelectedBoard = (boardId: number | null) =>
        navigate({ to: '/', search: (prev) => ({ ...prev, board: boardId ?? undefined }) })
    const setShowArchived = (archived: boolean) =>
        navigate({ to: '/', search: (prev) => ({ ...prev, archived: archived || undefined }), replace: true })

    useEffect(() => {
        setCardsSearch(search)
    }, [search, setCardsSearch])

    useEffect(() => {
        if (loadingWorkspaces || !selectedWorkspaceId) return
        if (!workspaces.some((item) => item.id === selectedWorkspaceId)) {
            navigate({ to: '/', search: { archived: search.archived }, replace: true })
        }
    }, [loadingWorkspaces, navigate, search.archived, selectedWorkspaceId, workspaces])

    useEffect(() => {
        if (loadingBoards || !selectedBoardId) return
        if (!boards.some((item) => item.id === selectedBoardId)) {
            navigate({ to: '/', search: (prev) => ({ ...prev, board: undefined }), replace: true })
        }
    }, [boards, loadingBoards, navigate, selectedBoardId])

    const promptBoardTitle = async (current?: string) => {
        if (!selectedWorkspaceId) return
        const title = await dialogs.prompt({
            title: current ? 'Rename board' : 'New board',
            label: 'Title',
            defaultValue: current,
            confirmLabel: 'Save',
            required: true,
        })
        if (!title) return
        try {
            if (current && selectedBoardId) {
                await updateBoard.mutateAsync({ id: selectedBoardId, changes: { title } })
            } else {
                const result = await createBoard.mutateAsync({ workspace_id: selectedWorkspaceId, title })
                setSelectedBoard(result.id)
            }
        } catch (error) {
            dialogs.error('Failed to save board.', error)
        }
    }

    const confirmArchive = (kind: string, entity: { title: string; archived: boolean }) => {
        const action = entity.archived ? 'Restore' : 'Archive'
        return dialogs.confirm({
            title: `${action} ${kind}`,
            message: `${action} ${kind} “${entity.title}”?`,
            confirmLabel: action,
        })
    }

    const toggleWorkspaceArchive = async () => {
        const workspace = workspaces.find((item) => item.id === selectedWorkspaceId)
        if (!workspace || !await confirmArchive('workspace', workspace)) return
        try {
            await updateWorkspace.mutateAsync({ id: workspace.id, changes: { archived: !workspace.archived } })
        } catch (error) {
            dialogs.error(`Failed to ${workspace.archived ? 'restore' : 'archive'} workspace.`, error)
            return
        }
        if (!workspace.archived && !showArchived) setSelectedWorkspace(null)
    }

    const toggleBoardArchive = async () => {
        const board = boards.find((item) => item.id === selectedBoardId)
        if (!board || !await confirmArchive('board', board)) return
        try {
            await updateBoard.mutateAsync({ id: board.id, changes: { archived: !board.archived } })
        } catch (error) {
            dialogs.error(`Failed to ${board.archived ? 'restore' : 'archive'} board.`, error)
            return
        }
        if (!board.archived && !showArchived) setSelectedBoard(null)
    }

    const selectedWorkspace = workspaces.find((item) => item.id === selectedWorkspaceId)
    const selectedBoard = boards.find((item) => item.id === selectedBoardId)

    return (
        <>
            <div className="archive-toggle">
                <label>
                    <input
                        type="checkbox"
                        checked={showArchived}
                        onChange={(event) => setShowArchived(event.target.checked)}
                    />{' '}
                    Show archived
                </label>
            </div>
            <div className="selectors">
                <div className="selector-group">
                    <label>Workspace:</label>
                    <select
                        value={selectedWorkspaceId || ''}
                        disabled={loadingWorkspaces}
                        onChange={(event) => setSelectedWorkspace(parseSelectedId(event.target.value))}
                    >
                        <option value="">Select a workspace</option>
                        {workspaces.map((item) => (
                            <option key={item.id} value={item.id}>
                                {item.title}{item.archived ? ' (archived)' : ''}
                            </option>
                        ))}
                    </select>
                    <div className="entity-actions">
                        <button onClick={() => setEditingWorkspace('new')}>+</button>
                        <button
                            disabled={!selectedWorkspace}
                            onClick={() => selectedWorkspace && setEditingWorkspace(selectedWorkspace)}
                        >
                            Settings
                        </button>
                        <button disabled={!selectedWorkspace} onClick={toggleWorkspaceArchive}>
                            {selectedWorkspace?.archived ? 'Restore' : 'Archive'}
                        </button>
                    </div>
                </div>
                <div className="selector-group">
                    <label>Board:</label>
                    <select
                        value={selectedBoardId || ''}
                        disabled={!selectedWorkspaceId || loadingBoards}
                        onChange={(event) => setSelectedBoard(parseSelectedId(event.target.value))}
                    >
                        <option value="">Select a board</option>
                        {boards.map((item) => (
                            <option key={item.id} value={item.id}>
                                {item.title}{item.archived ? ' (archived)' : ''}
                            </option>
                        ))}
                    </select>
                    <div className="entity-actions">
                        <button disabled={!selectedWorkspaceId} onClick={() => promptBoardTitle()}>+</button>
                        <button disabled={!selectedBoard} onClick={() => promptBoardTitle(selectedBoard?.title)}>
                            Rename
                        </button>
                        <button disabled={!selectedBoard} onClick={toggleBoardArchive}>
                            {selectedBoard?.archived ? 'Restore' : 'Archive'}
                        </button>
                    </div>
                </div>
            </div>
            {editingWorkspace && (
                <WorkspaceForm
                    workspace={editingWorkspace === 'new' ? undefined : editingWorkspace}
                    onSaved={(workspace) => editingWorkspace === 'new' && setSelectedWorkspace(workspace.id)}
                    onClose={() => setEditingWorkspace(null)}
                />
            )}
        </>
    )
}

/**
 * Cards of the selected board with time tracking and invoice creation.
 */
export function CardsPage() {
    const navigate = useNavigate()
    const { selectedWorkspaceId, selectedBoardId, showArchived } = useCardsSelection()
    const [selectedCardIds, setSelectedCardIds] = useState<Set<number>>(new Set())
    const [timeCardId, setTimeCardId] = useState<number | null>(null)
    const [editingCard, setEditingCard] = useState<Card | 'new' | null>(null)
    const dialogs = useDialogs()

    const { data: boards = [] } = useBoards(selectedWorkspaceId, showArchived)
    const { data: cards = [], isLoading: loadingCards } = useCards(selectedBoardId || undefined, showArchived)
    const updateCard = useUpdateCard()
    const createInvoice = useCreateInvoice()

    const activeCards = useMemo(() => activeCardsOnly(cards), [cards])
    const cardIds = useMemo(() => cards.map((card) => card.id).sort((a, b) => a - b), [cards])
    const { data: summaries = [] } = useTimeTrackingSummaries(cardIds)
    const minutesByCard = useMemo(
        () => new Map(summaries.map((summary) => [summary.card_id, summary.total_minutes_all])),
        [summaries]
    )
    const selectedCards = activeCards.filter((card) => selectedCardIds.has(card.id))

    useEffect(() => {
        setSelectedCardIds((current) => retainInvoiceableSelection(current, activeCards))
    }, [activeCards])

    const changeCardStatus = async (card: Card, status: CardStatus) => {
        try {
            await updateCard.mutateAsync({ id: card.id, changes: { status } })
        } catch (error) {
            dialogs.error('Failed to change card status.', error)
        }
    }

    const toggleCardArchive = async (card: Card) => {
        if (card.invoice) return
        const action = card.manually_archived ? 'Restore' : 'Archive'
        const confirmed = await dialogs.confirm({
            title: `${action} card`,
            message: `${action} card “${card.title}”?`,
            confirmLabel: action,
        })
        if (!confirmed) return
        try {
            await updateCard.mutateAsync({ id: card.id, changes: { manually_archived: !card.manually_archived } })
        } catch (error) {
            dialogs.error(`Failed to ${action.toLowerCase()} card.`, error)
        }
    }

    const toggleCard = (card: Card) => {
        if (!canInvoiceCard(card)) return
        setSelectedCardIds((current) => {
            const next = new Set(current)
            if (next.has(card.id)) next.delete(card.id)
            else next.add(card.id)
            return next
        })
    }

    const createSelectedInvoice = async () => {
        if (!selectedBoardId || !selectedCards.length) return
        try {
            await createInvoice.mutateAsync({ data: { board_id: selectedBoardId }, cards: selectedCards })
            setSelectedCardIds(new Set())
            navigate({ to: '/invoices' })
        } catch (error) {
            dialogs.error('Failed to create invoice.', error)
        }
    }

    const openInvoice = (invoiceId: string) => navigate({ to: '/invoices/$invoiceId', params: { invoiceId } })

    const selectedBoard = boards.find((item) => item.id === selectedBoardId)
    const invoiceableCards = activeCards.filter(canInvoiceCard)
    const allSelected = invoiceableCards.length > 0 && selectedCardIds.size === invoiceableCards.length
    const selectedMinutes = selectedCards.reduce((sum, card) => sum + (minutesByCard.get(card.id) || 0), 0)
    const statusPendingCardId = updateCard.isPending ? updateCard.variables?.id ?? null : null
    const timeCard = cards.find((card) => card.id === timeCardId)

    const toggleAllCards = () =>
        setSelectedCardIds(allSelected ? new Set() : new Set(invoiceableCards.map((card) => card.id)))

    if (!selectedWorkspaceId) return <p className="info-message">Please select or create a workspace.</p>
    if (!selectedBoardId) return <p className="info-message">Please select or create a board.</p>
    if (loadingCards) return <p className="info-message">Loading cards...</p>

    return (
        <>
            <section>
                <div className="table-toolbar">
                    <h2>{selectedBoard?.title}</h2>
                    <button
                        className="btn-primary"
                        disabled={selectedBoard?.archived}
                        onClick={() => setEditingCard('new')}
                    >
                        New card
                    </button>
                </div>
                {cards.length ? (
                    <CardsTable
                        cards={cards}
                        minutesByCard={minutesByCard}
                        selectedCardIds={selectedCardIds}
                        allSelected={allSelected}
                        statusPendingCardId={statusPendingCardId}
                        onToggleAll={toggleAllCards}
                        onToggleCard={toggleCard}
                        onChangeStatus={changeCardStatus}
                        onTrackTime={(card) => setTimeCardId(card.id)}
                        onEdit={setEditingCard}
                        onToggleArchive={toggleCardArchive}
                        onOpenInvoice={openInvoice}
                    />
                ) : (
                    <p className="info-message">No cards yet.</p>
                )}
                <div className="invoice-actions">
                    <span>{selectedCardIds.size} selected · {formatMinutes(selectedMinutes)}</span>
                    <button
                        className="btn-create-invoice"
                        disabled={!selectedCards.length || createInvoice.isPending}
                        onClick={createSelectedInvoice}
                    >
                        {createInvoice.isPending ? 'Creating…' : 'Create Invoice'}
                    </button>
                </div>
            </section>
            {editingCard && (
                <CardForm
                    boardId={selectedBoardId}
                    card={editingCard === 'new' ? undefined : editingCard}
                    onClose={() => setEditingCard(null)}
                />
            )}
            {timeCardId && (
                <TimeInput
                    cardId={timeCardId}
                    cardTitle={timeCard?.title || 'Card'}
                    onSave={async () => setTimeCardId(null)}
                    onCancel={() => setTimeCardId(null)}
                />
            )}
        </>
    )
}
