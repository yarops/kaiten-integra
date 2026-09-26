// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Workspace } from '../types/work-management'

const mutations = vi.hoisted(() => ({ create: vi.fn(), update: vi.fn() }))

vi.mock('../api/workspaces', () => ({
    useCreateWorkspace: () => ({ mutateAsync: mutations.create, isPending: false }),
    useUpdateWorkspace: () => ({ mutateAsync: mutations.update, isPending: false }),
}))
vi.mock('../api/settings', () => ({
    useAppSettings: () => ({ data: { default_hourly_rate: 1000 } }),
}))

import { WorkspaceForm } from './WorkspaceForm'

const workspace = { id: 3, title: 'Acme', hourly_rate: 1500, archived: false } as Workspace

describe('WorkspaceForm', () => {
    beforeEach(() => {
        mutations.create.mockReset()
        mutations.update.mockReset()
    })
    afterEach(cleanup)

    it('creates a workspace that inherits the default rate', async () => {
        const created = { ...workspace, hourly_rate: null }
        mutations.create.mockResolvedValueOnce(created)
        const onSaved = vi.fn()
        render(<WorkspaceForm onSaved={onSaved} onClose={vi.fn()} />)

        expect(screen.getByLabelText(/Hourly rate/)).toHaveProperty('placeholder', expect.stringMatching(/1\s000/))
        fireEvent.change(screen.getByLabelText('Title'), { target: { value: ' Acme ' } })
        fireEvent.click(screen.getByRole('button', { name: 'Save' }))

        await waitFor(() => expect(mutations.create).toHaveBeenCalledWith({ title: 'Acme', hourly_rate: null }))
        expect(onSaved).toHaveBeenCalledWith(created)
    })

    it('clears a workspace rate override', async () => {
        mutations.update.mockResolvedValueOnce({ ...workspace, hourly_rate: null })
        render(<WorkspaceForm workspace={workspace} onClose={vi.fn()} />)

        const rate = screen.getByLabelText(/Hourly rate/)
        expect(rate).toHaveProperty('value', '1500')
        fireEvent.change(rate, { target: { value: '' } })
        fireEvent.click(screen.getByRole('button', { name: 'Save' }))

        await waitFor(() => expect(mutations.update).toHaveBeenCalledWith({
            id: 3,
            changes: { title: 'Acme', hourly_rate: null },
        }))
    })
})
