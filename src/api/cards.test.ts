import { beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../test/supabase-mock'

vi.mock('../lib/supabase', () => import('../test/supabase-mock'))

import { createCard, fetchCards, updateCard } from './cards'
import { fetchBoards } from './boards'
import { fetchWorkspaces } from './workspaces'

describe('fetchCards', () => {
    beforeEach(db.reset)

    it('returns nothing without a board', async () => {
        await expect(fetchCards(undefined)).resolves.toEqual([])
        expect(db.queries).toEqual([])
    })

    it('hides archived cards and attaches the invoice of each card', async () => {
        db.respond('cards', { data: [{ id: 1, title: 'Invoiced' }, { id: 2, title: 'Free' }] })
        db.respond('invoice_cards', { data: [{ card_id: 1, invoice_id: 'invoice-1', invoices: { status: 'sent', board_id: 7 } }] })

        await expect(fetchCards(7)).resolves.toEqual([
            { id: 1, title: 'Invoiced', invoice: { id: 'invoice-1', status: 'sent' } },
            { id: 2, title: 'Free', invoice: null },
        ])
        expect(db.calls('cards')).toEqual([[
            ['select', '*'],
            ['eq', 'board_id', 7],
            ['order', 'created_at', { ascending: false }],
            ['eq', 'manually_archived', false],
            ['eq', 'billing_archived', false],
        ]])
        expect(db.calls('invoice_cards')[0]).toContainEqual(['eq', 'invoices.board_id', 7])
    })

    it('includes archived cards on request', async () => {
        await fetchCards(7, true)
        expect(db.calls('cards')[0].map(([method]) => method)).toEqual(['select', 'eq', 'order'])
    })

    it('fails when the invoice links cannot be loaded', async () => {
        const error = { message: 'permission denied' }
        db.respond('invoice_cards', { error })

        await expect(fetchCards(7)).rejects.toBe(error)
    })
})

describe('card mutations', () => {
    beforeEach(db.reset)

    it('trims the card and normalizes its tags on create', async () => {
        await createCard({ board_id: 7, title: ' Fix login ', description: '  ', status: 'queued', tags: [' ui ', ''] })

        expect(db.calls('cards')[0][0]).toEqual(['insert', {
            board_id: 7,
            title: 'Fix login',
            description: null,
            status: 'queued',
            tags: [{ name: 'ui' }],
        }])
    })

    it('normalizes tags only when they change', async () => {
        await updateCard(3, { status: 'done' })
        await updateCard(3, { tags: [' api '] })

        expect(db.calls('cards').map((calls) => calls[0])).toEqual([
            ['update', { status: 'done' }],
            ['update', { tags: [{ name: 'api' }] }],
        ])
    })

    it('throws database errors', async () => {
        const error = { message: 'Card is locked by an invoice' }
        db.respond('cards', { error })

        await expect(updateCard(3, { title: 'New' })).rejects.toBe(error)
    })
})

describe('workspace and board queries', () => {
    beforeEach(db.reset)

    it('hides archived workspaces unless requested', async () => {
        await fetchWorkspaces()
        await fetchWorkspaces(true)

        expect(db.calls('workspaces')).toEqual([
            [['select', '*'], ['order', 'title'], ['eq', 'archived', false]],
            [['select', '*'], ['order', 'title']],
        ])
    })

    it('loads boards of the workspace only', async () => {
        await expect(fetchBoards(null)).resolves.toEqual([])
        expect(db.queries).toEqual([])

        db.respond('boards', { data: [{ id: 2, title: 'Backlog' }] })
        await expect(fetchBoards(4)).resolves.toEqual([{ id: 2, title: 'Backlog' }])
        expect(db.calls('boards')[0]).toContainEqual(['eq', 'workspace_id', 4])
    })
})
