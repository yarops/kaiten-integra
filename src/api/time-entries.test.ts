import { beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../test/supabase-mock'

vi.mock('../lib/supabase', () => import('../test/supabase-mock'))

import { createTimeEntry, deleteTimeEntry, getTimeEntriesForCard, getTimeTrackingSummaries } from './time-entries'

describe('time entries', () => {
    beforeEach(db.reset)

    it('creates an entry and wraps database errors', async () => {
        const input = { card_id: 5, hours: 1, minutes: 30, date: '2026-09-27' }
        db.respond('time_entries', { data: { id: 'entry-1', ...input } }, { error: { message: 'check violation' } })

        await expect(createTimeEntry(input)).resolves.toEqual({ id: 'entry-1', ...input })
        expect(db.calls('time_entries')[0]).toEqual([['insert', [input]], ['select'], ['single']])
        await expect(createTimeEntry(input)).rejects.toThrow('Failed to create time entry: check violation')
    })

    it('deletes an entry by id', async () => {
        db.respond('time_entries', {}, { error: { message: 'permission denied' } })

        await deleteTimeEntry('entry-1')
        expect(db.calls('time_entries')[0]).toEqual([['delete'], ['eq', 'id', 'entry-1']])
        await expect(deleteTimeEntry('entry-1')).rejects.toThrow('Failed to delete time entry: permission denied')
    })

    it('lists entries of a card, newest first', async () => {
        db.respond('time_entries', { data: null })

        await expect(getTimeEntriesForCard(5)).resolves.toEqual([])
        expect(db.calls('time_entries')).toEqual([[
            ['select', '*'],
            ['eq', 'card_id', 5],
            ['order', 'date', { ascending: false }],
        ]])
    })
})

describe('getTimeTrackingSummaries', () => {
    beforeEach(db.reset)

    it('skips the request when there are no cards', async () => {
        await expect(getTimeTrackingSummaries([])).resolves.toEqual([])
        expect(db.queries).toEqual([])
    })

    it('deduplicates card ids and requests them in chunks of 200', async () => {
        const cardIds = Array.from({ length: 450 }, (_, index) => index + 1)
        db.respond('time_tracking_summary',
            { data: [{ card_id: 1 }] },
            { data: null },
            { data: [{ card_id: 450 }] },
        )

        await expect(getTimeTrackingSummaries([...cardIds, 1, 2])).resolves.toEqual([{ card_id: 1 }, { card_id: 450 }])
        const chunks = db.calls('time_tracking_summary').map((calls) => calls[1][2] as number[])
        expect(chunks.map((chunk) => chunk.length)).toEqual([200, 200, 50])
        expect(chunks.flat()).toEqual(cardIds)
    })

    it('stops at the first failed chunk', async () => {
        db.respond('time_tracking_summary', { error: { message: 'URI too long' } })

        await expect(getTimeTrackingSummaries(Array.from({ length: 250 }, (_, index) => index + 1)))
            .rejects.toThrow('Failed to fetch time tracking summaries: URI too long')
        expect(db.calls('time_tracking_summary')).toHaveLength(1)
    })
})
