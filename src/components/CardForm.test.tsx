// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mutations = vi.hoisted(() => ({ create: vi.fn(), update: vi.fn(), pending: false }))

vi.mock('../api/cards', () => ({
    useCreateCard: () => ({ mutateAsync: mutations.create, isPending: mutations.pending }),
    useUpdateCard: () => ({ mutateAsync: mutations.update, isPending: false }),
}))

import { CardForm } from './CardForm'

describe('CardForm', () => {
    beforeEach(() => {
        mutations.create.mockReset()
        mutations.update.mockReset()
        mutations.pending = false
    })
    afterEach(cleanup)

    it('creates a card with normalized form values', async () => {
        mutations.create.mockResolvedValueOnce({})
        const onClose = vi.fn()
        render(<CardForm boardId={42} onClose={onClose} />)

        fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Support request' } })
        fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'Investigate issue' } })
        fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'done' } })
        fireEvent.change(screen.getByLabelText('Tags (comma-separated)'), { target: { value: 'support, urgent' } })
        fireEvent.click(screen.getByRole('button', { name: 'Save' }))

        await waitFor(() => expect(mutations.create).toHaveBeenCalledWith({
            board_id: 42,
            title: 'Support request',
            description: 'Investigate issue',
            status: 'done',
            tags: ['support', 'urgent'],
        }))
        expect(onClose).toHaveBeenCalledOnce()
    })

    it('disables saving while the card is being saved', () => {
        mutations.pending = true
        render(<CardForm boardId={42} onClose={vi.fn()} />)

        fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Support request' } })
        const button = screen.getByRole('button', { name: 'Saving…' })
        expect((button as HTMLButtonElement).disabled).toBe(true)
        fireEvent.submit(button.closest('form')!)

        expect(mutations.create).not.toHaveBeenCalled()
    })
})
