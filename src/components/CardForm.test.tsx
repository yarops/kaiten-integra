// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

const mutations = vi.hoisted(() => ({ create: vi.fn(), update: vi.fn() }))

vi.mock('../api/cards', () => ({
    useCreateCard: () => ({ mutateAsync: mutations.create }),
    useUpdateCard: () => ({ mutateAsync: mutations.update }),
}))

import { CardForm } from './CardForm'

describe('CardForm', () => {
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
})
