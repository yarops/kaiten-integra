import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Card } from '../types/work-management'
import { db } from '../test/supabase-mock'

vi.mock('../lib/supabase', () => import('../test/supabase-mock'))

import { createInvoice, deleteInvoice, fetchInvoiceWithCards, fetchInvoices, updateInvoiceStatus } from './invoices'

const card = (id: number) => ({ id, title: `Card ${id}` }) as Card

describe('createInvoice', () => {
    beforeEach(db.reset)

    it('creates the invoice through a single atomic RPC call', async () => {
        const invoice = { id: 'invoice-1', total_cards: 2 }
        db.respond('create_invoice_with_cards', { data: invoice })

        await expect(createInvoice({ board_id: 7 }, [card(1), card(2)])).resolves.toEqual(invoice)
        expect(db.queries).toHaveLength(1)
        expect(db.calls('create_invoice_with_cards')).toEqual([[
            ['rpc', { target_board_id: 7, card_ids: [1, 2], invoice_notes: null }],
            ['single'],
        ]])
    })

    it('reports cards that are already invoiced', async () => {
        db.respond('create_invoice_with_cards', { error: { code: '23505', message: 'duplicate key value' } })

        await expect(createInvoice({ board_id: 7 }, [card(1)]))
            .rejects.toThrow('Some cards are already included in another invoice.')
    })

    it('passes through other database errors', async () => {
        db.respond('create_invoice_with_cards', { error: { code: 'P0001', message: 'Some cards cannot be invoiced' } })

        await expect(createInvoice({ board_id: 7 }, [card(1)])).rejects.toThrow('Some cards cannot be invoiced')
    })
})

describe('invoice queries', () => {
    beforeEach(db.reset)

    it('lists invoices newest first', async () => {
        db.respond('invoices', { data: null })

        await expect(fetchInvoices()).resolves.toEqual([])
        expect(db.calls('invoices')).toEqual([[['select', '*'], ['order', 'created_at', { ascending: false }]]])
    })

    it('loads an invoice together with its cards', async () => {
        db.respond('invoices', { data: { id: 'invoice-1', status: 'draft' } })
        db.respond('invoice_cards', { data: [{ id: 'line-1', card_id: 5 }] })

        await expect(fetchInvoiceWithCards('invoice-1')).resolves.toEqual({
            id: 'invoice-1',
            status: 'draft',
            invoice_cards: [{ id: 'line-1', card_id: 5 }],
        })
        expect(db.calls('invoice_cards')).toEqual([[['select', '*'], ['eq', 'invoice_id', 'invoice-1']]])
    })

    it('does not load cards of a missing invoice', async () => {
        const error = { code: 'PGRST116', message: 'no rows' }
        db.respond('invoices', { error })

        await expect(fetchInvoiceWithCards('missing')).rejects.toBe(error)
        expect(db.calls('invoice_cards')).toEqual([])
    })
})

describe('invoice mutations', () => {
    beforeEach(db.reset)

    it('deletes an invoice through RPC', async () => {
        await deleteInvoice('invoice-1')
        expect(db.calls('delete_invoice')).toEqual([[['rpc', { target_invoice_id: 'invoice-1' }]]])

        const error = { message: 'Paid invoices cannot be deleted' }
        db.respond('delete_invoice', { error })
        await expect(deleteInvoice('invoice-1')).rejects.toBe(error)
    })

    it('changes the status through RPC', async () => {
        db.respond('set_invoice_status', { data: { id: 'invoice-1', status: 'sent' } }, { error: { message: 'Invalid status' } })

        await expect(updateInvoiceStatus('invoice-1', 'sent')).resolves.toEqual({ id: 'invoice-1', status: 'sent' })
        expect(db.calls('set_invoice_status')[0]).toEqual([
            ['rpc', { target_invoice_id: 'invoice-1', new_status: 'sent' }],
            ['single'],
        ])
        await expect(updateInvoiceStatus('invoice-1', 'paid')).rejects.toThrow('Invalid status')
    })
})
