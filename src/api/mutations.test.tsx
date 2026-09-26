// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react'
import { QueryClient, QueryClientProvider, UseMutationResult } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../test/supabase-mock'

vi.mock('../lib/supabase', () => import('../test/supabase-mock'))

import { useCreateBoard, useUpdateBoard } from './boards'
import { useCreateCard, useUpdateCard } from './cards'
import { useCreateInvoice, useDeleteInvoice, useUpdateInvoiceStatus } from './invoices'
import { useUpdateAppSettings } from './settings'
import { useCreateTimeEntry, useDeleteTimeEntry } from './time-entries'
import { useCreateWorkspace, useUpdateWorkspace } from './workspaces'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyMutationHook = () => UseMutationResult<any, Error, any>

const runMutation = async (useHook: AnyMutationHook, variables: unknown) => {
    const client = new QueryClient()
    const invalidate = vi.spyOn(client, 'invalidateQueries')
    const { result } = renderHook(useHook, {
        wrapper: ({ children }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>,
    })
    const outcome = await act(() => result.current.mutateAsync(variables).then(() => 'resolved', () => 'rejected'))
    return { outcome, invalidated: invalidate.mock.calls.map(([filters]) => filters?.queryKey) }
}

describe('mutation hooks', () => {
    beforeEach(db.reset)

    it.each<[string, AnyMutationHook, unknown, unknown[][]]>([
        ['useCreateWorkspace', useCreateWorkspace, { title: 'Acme', hourly_rate: null }, [['workspaces']]],
        ['useUpdateWorkspace', useUpdateWorkspace, { id: 1, changes: { archived: true } }, [['workspaces'], ['boards'], ['cards']]],
        ['useCreateBoard', useCreateBoard, { workspace_id: 1, title: 'Backlog' }, [['boards']]],
        ['useUpdateBoard', useUpdateBoard, { id: 2, changes: { archived: true } }, [['boards'], ['cards']]],
        ['useCreateCard', useCreateCard, { board_id: 2, title: 'Fix', status: 'queued' }, [['cards']]],
        ['useUpdateCard', useUpdateCard, { id: 3, changes: { status: 'done' } }, [['cards']]],
        ['useCreateInvoice', useCreateInvoice, { data: { board_id: 2 }, cards: [] }, [['invoices'], ['cards']]],
        ['useDeleteInvoice', useDeleteInvoice, 'invoice-1', [['invoices'], ['cards']]],
        ['useUpdateInvoiceStatus', useUpdateInvoiceStatus, { invoiceId: 'invoice-1', status: 'paid' }, [['invoices'], ['cards']]],
        ['useUpdateAppSettings', useUpdateAppSettings, { default_hourly_rate: 1200 }, [['appSettings']]],
        ['useCreateTimeEntry', useCreateTimeEntry, { card_id: 3, hours: 1, minutes: 0, date: '2026-09-27' }, [['timeEntries', 3], ['timeTrackingSummaries']]],
        ['useDeleteTimeEntry', useDeleteTimeEntry, { id: 'entry-1', card_id: 3 }, [['timeEntries', 3], ['timeTrackingSummaries']]],
    ])('%s invalidates the affected queries', async (_, useHook, variables, queryKeys) => {
        await expect(runMutation(useHook, variables)).resolves.toEqual({ outcome: 'resolved', invalidated: queryKeys })
    })

    it('does not invalidate queries when the mutation fails', async () => {
        db.respond('delete_invoice', { error: { message: 'Paid invoices cannot be deleted' } })

        await expect(runMutation(useDeleteInvoice, 'invoice-1')).resolves.toEqual({ outcome: 'rejected', invalidated: [] })
    })
})
