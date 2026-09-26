import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Card } from '../types/work-management'

const rpc = vi.hoisted(() => ({ call: vi.fn(), single: vi.fn() }))

vi.mock('../lib/supabase', () => ({
    supabase: { rpc: (...args: unknown[]) => { rpc.call(...args); return { single: rpc.single } } },
}))

import { createInvoice } from './invoices'

const card = (id: number) => ({ id, title: `Card ${id}` }) as Card

describe('createInvoice', () => {
    beforeEach(() => {
        rpc.call.mockReset()
        rpc.single.mockReset()
    })

    it('creates the invoice through a single atomic RPC call', async () => {
        const invoice = { id: 'invoice-1', total_cards: 2 }
        rpc.single.mockResolvedValueOnce({ data: invoice, error: null })

        await expect(createInvoice({ board_id: 7 }, [card(1), card(2)])).resolves.toEqual(invoice)
        expect(rpc.call).toHaveBeenCalledOnce()
        expect(rpc.call).toHaveBeenCalledWith('create_invoice_with_cards', {
            target_board_id: 7,
            card_ids: [1, 2],
            invoice_notes: null,
        })
    })

    it('reports cards that are already invoiced', async () => {
        rpc.single.mockResolvedValueOnce({ data: null, error: { code: '23505', message: 'duplicate key value' } })

        await expect(createInvoice({ board_id: 7 }, [card(1)]))
            .rejects.toThrow('Some cards are already included in another invoice.')
    })

    it('passes through other database errors', async () => {
        rpc.single.mockResolvedValueOnce({ data: null, error: { code: 'P0001', message: 'Some cards cannot be invoiced' } })

        await expect(createInvoice({ board_id: 7 }, [card(1)])).rejects.toThrow('Some cards cannot be invoiced')
    })
})
