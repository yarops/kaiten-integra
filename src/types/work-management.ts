export type CardStatus = 'queued' | 'in_progress' | 'done'

export const cardStatusLabels: Record<CardStatus, string> = {
    queued: 'Queued', in_progress: 'In Progress', done: 'Done',
}

export interface Workspace {
    id: number
    title: string
    /** Overrides the default hourly rate; null inherits it. */
    hourly_rate: number | null
    archived: boolean
    created_at: string
    updated_at: string
}

export interface Board {
    id: number
    workspace_id: number
    title: string
    description: string | null
    archived: boolean
    created_at: string
    updated_at: string
}

export interface Card {
    id: number
    board_id: number
    title: string
    description: string | null
    status: CardStatus
    tags: Array<{ name: string } | string>
    manually_archived: boolean
    billing_archived: boolean
    created_at: string
    updated_at: string
}

export const isCardArchived = (card: Pick<Card, 'manually_archived' | 'billing_archived'>) =>
    card.manually_archived || card.billing_archived
