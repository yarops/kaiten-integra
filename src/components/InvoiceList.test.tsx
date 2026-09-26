// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DialogProvider } from './dialogs/DialogProvider'
import { Invoice } from '../types/invoice'

const api = vi.hoisted(() => ({
    invoices: [] as Invoice[] | undefined,
    isLoading: false,
    delete: vi.fn(),
    updateStatus: vi.fn(),
}))

vi.mock('../api/invoices', () => ({
    useInvoices: () => ({ data: api.invoices, isLoading: api.isLoading }),
    useDeleteInvoice: () => ({ mutateAsync: api.delete }),
    useUpdateInvoiceStatus: () => ({ mutateAsync: api.updateStatus }),
}))

import { InvoiceList } from './InvoiceList'

const invoice = (id: string, overrides: Partial<Invoice> = {}) => ({
    id,
    workspace_id: 1,
    workspace_title: 'Acme',
    board_id: 2,
    board_title: `Board ${id}`,
    total_time_spent: 90,
    total_cards: 3,
    hourly_rate: 1000,
    status: 'draft',
    notes: null,
    created_at: '2026-09-27T10:00:00Z',
    updated_at: '2026-09-27T10:00:00Z',
    ...overrides,
}) as Invoice

const renderList = (onSelectInvoice = vi.fn()) => {
    render(<InvoiceList onSelectInvoice={onSelectInvoice} />, { wrapper: DialogProvider })
    return onSelectInvoice
}

const invoiceCard = (boardTitle: string) =>
    within(screen.getByRole('heading', { name: boardTitle }).closest<HTMLElement>('.invoice-card')!)

const confirmDialog = (name: string) => screen.findByRole('dialog', { name })

describe('InvoiceList', () => {
    beforeEach(() => {
        api.invoices = [invoice('a'), invoice('b', { status: 'sent', notes: 'March work', total_time_spent: 120 })]
        api.isLoading = false
        api.delete.mockReset()
        api.updateStatus.mockReset()
    })
    afterEach(cleanup)

    it('shows loading and empty states', () => {
        api.isLoading = true
        renderList()
        expect(screen.getByText('Loading invoices...')).toBeTruthy()
        cleanup()

        api.isLoading = false
        api.invoices = []
        renderList()
        expect(screen.getByText(/No invoices found/)).toBeTruthy()
    })

    it('renders invoice summaries and opens details', () => {
        const onSelectInvoice = renderList()

        expect(invoiceCard('Board a').getByText('1h 30m')).toBeTruthy()
        expect(invoiceCard('Board b').getByText('2h')).toBeTruthy()
        expect(invoiceCard('Board b').getByText('March work')).toBeTruthy()
        expect(invoiceCard('Board b').getByRole('combobox')).toHaveProperty('value', 'sent')

        fireEvent.click(invoiceCard('Board b').getByRole('button', { name: 'View Details' }))
        expect(onSelectInvoice).toHaveBeenCalledWith('b')
    })

    it('deletes an invoice after confirmation', async () => {
        let finish!: () => void
        api.delete.mockReturnValueOnce(new Promise<void>((resolve) => { finish = resolve }))
        renderList()

        fireEvent.click(invoiceCard('Board a').getByRole('button', { name: 'Delete' }))
        fireEvent.click(within(await confirmDialog('Delete invoice')).getByRole('button', { name: 'Delete' }))

        await waitFor(() => expect(api.delete).toHaveBeenCalledWith('a'))
        expect(invoiceCard('Board a').getByRole('button', { name: 'Deleting...' })).toHaveProperty('disabled', true)
        expect(invoiceCard('Board a').getByRole('combobox')).toHaveProperty('disabled', true)
        expect(invoiceCard('Board b').getByRole('button', { name: 'Delete' })).toHaveProperty('disabled', false)

        finish()
        await waitFor(() => expect(invoiceCard('Board a').getByRole('button', { name: 'Delete' })).toHaveProperty('disabled', false))
    })

    it('keeps the invoice when deletion is cancelled', async () => {
        renderList()

        fireEvent.click(invoiceCard('Board a').getByRole('button', { name: 'Delete' }))
        fireEvent.click(within(await confirmDialog('Delete invoice')).getByRole('button', { name: 'Cancel' }))

        await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
        expect(api.delete).not.toHaveBeenCalled()
    })

    it('shows an error when deletion fails', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => {})
        api.delete.mockRejectedValueOnce(new Error('Paid invoices cannot be deleted.'))
        renderList()

        fireEvent.click(invoiceCard('Board a').getByRole('button', { name: 'Delete' }))
        fireEvent.click(within(await confirmDialog('Delete invoice')).getByRole('button', { name: 'Delete' }))

        expect((await confirmDialog('Error')).textContent).toContain('Failed to delete invoice. Paid invoices cannot be deleted.')
        expect(invoiceCard('Board a').getByRole('button', { name: 'Delete' })).toHaveProperty('disabled', false)
    })

    it('changes the status after confirmation', async () => {
        api.updateStatus.mockResolvedValueOnce(undefined)
        renderList()

        fireEvent.change(invoiceCard('Board b').getByRole('combobox'), { target: { value: 'paid' } })
        const dialog = await confirmDialog('Change invoice status')
        expect(dialog.textContent).toContain('mark the invoice as paid and archive its cards')
        fireEvent.click(within(dialog).getByRole('button', { name: 'OK' }))

        await waitFor(() => expect(api.updateStatus).toHaveBeenCalledWith({ invoiceId: 'b', status: 'paid' }))
    })

    it('keeps the status when the change is cancelled', async () => {
        renderList()

        fireEvent.change(invoiceCard('Board a').getByRole('combobox'), { target: { value: 'sent' } })
        fireEvent.click(within(await confirmDialog('Change invoice status')).getByRole('button', { name: 'Cancel' }))

        await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
        expect(api.updateStatus).not.toHaveBeenCalled()
        expect(invoiceCard('Board a').getByRole('combobox')).toHaveProperty('value', 'draft')
    })

    it('shows an error when the status change fails', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => {})
        api.updateStatus.mockRejectedValueOnce(new Error('Invalid status.'))
        renderList()

        fireEvent.change(invoiceCard('Board a').getByRole('combobox'), { target: { value: 'sent' } })
        fireEvent.click(within(await confirmDialog('Change invoice status')).getByRole('button', { name: 'OK' }))

        expect((await confirmDialog('Error')).textContent).toContain('Failed to update invoice status. Invalid status.')
    })
})
