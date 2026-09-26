// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Modal } from '../Modal'
import { DialogProvider } from './DialogProvider'
import { Dialogs, useDialogs } from './dialogs-context'

const renderDialogs = (children?: React.ReactNode) => {
    let dialogs!: Dialogs
    const Capture = () => { dialogs = useDialogs(); return null }
    render(<DialogProvider><Capture />{children}</DialogProvider>)
    return dialogs
}

/** Opens a dialog inside `act` and returns its pending result without awaiting it. */
const open = <T,>(show: () => Promise<T>) => {
    let result!: Promise<T>
    act(() => { result = show() })
    return result
}

describe('DialogProvider', () => {
    afterEach(cleanup)

    it('resolves confirm with the chosen answer', async () => {
        const dialogs = renderDialogs()

        let result = open(() => dialogs.confirm({ title: 'Delete invoice', message: 'Sure?', confirmLabel: 'Delete' }))
        expect(screen.getByRole('dialog', { name: 'Delete invoice' }).textContent).toContain('Sure?')
        fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
        await expect(result).resolves.toBe(true)
        expect(screen.queryByRole('dialog')).toBeNull()

        result = open(() => dialogs.confirm('Sure?'))
        fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
        await expect(result).resolves.toBe(false)
    })

    it('resolves prompt with the trimmed value and ignores empty required input', async () => {
        const dialogs = renderDialogs()

        let result = open(() => dialogs.prompt({ title: 'Rename board', label: 'Title', defaultValue: 'Old', required: true }))
        const input = screen.getByLabelText('Title')
        expect(input).toHaveProperty('value', 'Old')
        fireEvent.change(input, { target: { value: '  ' } })
        fireEvent.submit(input.closest('form')!)
        expect(screen.getByRole('dialog')).toBeTruthy()

        fireEvent.change(input, { target: { value: ' New ' } })
        fireEvent.submit(input.closest('form')!)
        await expect(result).resolves.toBe('New')

        result = open(() => dialogs.prompt({ title: 'New board' }))
        fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
        await expect(result).resolves.toBeNull()
    })

    it('shows queued dialogs one at a time', async () => {
        const dialogs = renderDialogs()
        vi.spyOn(console, 'error').mockImplementation(() => {})

        const first = open(() => dialogs.alert('First'))
        const second = open(() => dialogs.error('Failed to save.', new Error('Network down.')))
        expect(screen.getAllByRole('dialog')).toHaveLength(1)
        expect(screen.getByRole('dialog').textContent).toContain('First')

        fireEvent.click(screen.getByRole('button', { name: 'OK' }))
        await first
        expect(screen.getByRole('dialog', { name: 'Error' }).textContent).toContain('Failed to save. Network down.')
        fireEvent.click(screen.getByRole('button', { name: 'OK' }))
        await second
        expect(screen.queryByRole('dialog')).toBeNull()
    })

    it('closes only the topmost modal on Escape', async () => {
        const onClose = vi.fn()
        const dialogs = renderDialogs(<Modal title="Track Time" onClose={onClose}><button>Delete</button></Modal>)

        const result = open(() => dialogs.confirm('Delete entry?'))
        fireEvent.keyDown(screen.getByRole('dialog', { name: 'Confirm' }), { key: 'Escape' })
        await expect(result).resolves.toBe(false)
        expect(onClose).not.toHaveBeenCalled()

        fireEvent.mouseDown(screen.getByRole('dialog', { name: 'Track Time' }).parentElement!)
        expect(onClose).toHaveBeenCalledOnce()
    })
})
