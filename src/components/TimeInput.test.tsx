// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TimeEntry } from '../types/time-tracking'
import { DialogProvider } from './dialogs/DialogProvider'

const api = vi.hoisted(() => ({
    create: vi.fn(),
    remove: vi.fn(),
    refetch: vi.fn(),
    entries: [] as TimeEntry[],
}))

vi.mock('../api/time-entries', () => ({
    useCreateTimeEntry: () => ({ mutateAsync: api.create, isPending: false }),
    useDeleteTimeEntry: () => ({ mutateAsync: api.remove, isPending: false }),
    useTimeEntriesForCard: () => ({ data: api.entries, refetch: api.refetch }),
}))

import { TimeInput } from './TimeInput'

const entry = (id: string, hours: number, minutes: number): TimeEntry => ({
    id,
    card_id: 7,
    hours,
    minutes,
    date: '2026-09-01',
    created_at: '2026-09-01T00:00:00Z',
    updated_at: '2026-09-01T00:00:00Z',
})

const renderTimeInput = (onSave = vi.fn().mockResolvedValue(undefined)) => {
    render(<TimeInput cardId={7} cardTitle="Support request" onSave={onSave} />, { wrapper: DialogProvider })
    return onSave
}

const save = () => fireEvent.click(screen.getByRole('button', { name: 'Save Time' }))

describe('TimeInput', () => {
    beforeEach(() => {
        api.create.mockReset()
        api.remove.mockReset()
        api.refetch.mockReset().mockResolvedValue(undefined)
        api.entries = []
    })
    afterEach(cleanup)

    it('requires some time to be entered', async () => {
        renderTimeInput()

        save()

        expect(await screen.findByText('Please enter at least some time (hours or minutes).')).toBeTruthy()
        expect(api.create).not.toHaveBeenCalled()
    })

    it('rejects out-of-range hours and minutes', async () => {
        renderTimeInput()

        fireEvent.change(screen.getByLabelText('Hours'), { target: { value: '24' } })
        fireEvent.change(screen.getByLabelText('Minutes'), { target: { value: '60' } })
        // Native min/max would block the button submit, so submit the form directly.
        fireEvent.submit(screen.getByRole('button', { name: 'Save Time' }).closest('form')!)

        expect(await screen.findByText('Hours must be between 0 and 23.')).toBeTruthy()
        expect(screen.getByText('Minutes must be between 0 and 59.')).toBeTruthy()
        expect(api.create).not.toHaveBeenCalled()
    })

    it('requires a date', async () => {
        renderTimeInput()

        fireEvent.change(screen.getByLabelText('Minutes'), { target: { value: '30' } })
        fireEvent.change(screen.getByLabelText('Date'), { target: { value: '' } })
        save()

        expect(await screen.findByText('Please select a date.')).toBeTruthy()
        expect(api.create).not.toHaveBeenCalled()
    })

    it('saves a time entry and resets the form', async () => {
        api.create.mockResolvedValueOnce({})
        const onSave = renderTimeInput()

        fireEvent.change(screen.getByLabelText('Hours'), { target: { value: '1' } })
        fireEvent.change(screen.getByLabelText('Minutes'), { target: { value: '15' } })
        fireEvent.change(screen.getByLabelText('Date'), { target: { value: '2026-09-02' } })
        fireEvent.change(screen.getByLabelText('Description (optional)'), { target: { value: '  Fixed bug  ' } })
        save()

        const expected = { card_id: 7, hours: 1, minutes: 15, description: 'Fixed bug', date: '2026-09-02' }
        await waitFor(() => expect(onSave).toHaveBeenCalledWith(expected))
        expect(api.create).toHaveBeenCalledWith(expected)
        expect(api.refetch).toHaveBeenCalled()
        await waitFor(() => expect((screen.getByLabelText('Hours') as HTMLInputElement).value).toBe('0'))
        expect((screen.getByLabelText('Minutes') as HTMLInputElement).value).toBe('0')
        expect((screen.getByLabelText('Description (optional)') as HTMLTextAreaElement).value).toBe('')
    })

    it('shows an error when saving fails', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => {})
        api.create.mockRejectedValueOnce(new Error('network'))
        const onSave = renderTimeInput()

        fireEvent.change(screen.getByLabelText('Minutes'), { target: { value: '30' } })
        save()

        expect(await screen.findByText('Failed to save time entry. Please try again.')).toBeTruthy()
        expect(onSave).not.toHaveBeenCalled()
    })

    it('shows the total of previous entries', () => {
        api.entries = [entry('a', 1, 45), entry('b', 0, 30)]
        renderTimeInput()

        expect(screen.getByText('Total time spent: 2h 15m')).toBeTruthy()
    })

    it('deletes an entry only after confirmation', async () => {
        api.entries = [entry('a', 1, 0)]
        api.remove.mockResolvedValueOnce(undefined)
        renderTimeInput()

        fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
        let dialog = await screen.findByRole('dialog', { name: 'Delete time entry' })
        fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }))
        await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Delete time entry' })).toBeNull())
        expect(api.remove).not.toHaveBeenCalled()

        fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
        dialog = await screen.findByRole('dialog', { name: 'Delete time entry' })
        fireEvent.click(within(dialog).getByRole('button', { name: 'Delete' }))
        await waitFor(() => expect(api.remove).toHaveBeenCalledWith('a'))
        expect(api.refetch).toHaveBeenCalled()
    })
})
