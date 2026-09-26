import { FormEvent, ReactNode, useCallback, useMemo, useState } from 'react'
import { Modal } from '../Modal'
import { AlertOptions, ConfirmOptions, Dialogs, DialogsContext, PromptOptions } from './dialogs-context'

type DialogRequest =
    | { id: number; kind: 'confirm'; options: ConfirmOptions; resolve: (value: boolean) => void }
    | { id: number; kind: 'prompt'; options: PromptOptions; resolve: (value: string | null) => void }
    | { id: number; kind: 'alert'; options: AlertOptions; resolve: () => void }

let nextId = 0

const withCause = (message: string, cause: unknown) =>
    cause instanceof Error && cause.message ? `${message} ${cause.message}` : message

/**
 * Provides `useDialogs()` and renders its dialogs one at a time, in request order.
 */
export const DialogProvider = ({ children }: { children: ReactNode }) => {
    const [queue, setQueue] = useState<DialogRequest[]>([])

    const enqueue = useCallback((request: DialogRequest) => setQueue((current) => [...current, request]), [])
    const dismiss = (id: number) => setQueue((current) => current.filter((request) => request.id !== id))

    const dialogs = useMemo<Dialogs>(() => {
        const alert: Dialogs['alert'] = (options) => new Promise((resolve) => enqueue({
            id: ++nextId, kind: 'alert', options: typeof options === 'string' ? { message: options } : options, resolve,
        }))
        return {
            confirm: (options) => new Promise((resolve) => enqueue({
                id: ++nextId, kind: 'confirm', options: typeof options === 'string' ? { message: options } : options, resolve,
            })),
            prompt: (options) => new Promise((resolve) => enqueue({ id: ++nextId, kind: 'prompt', options, resolve })),
            alert,
            error: (message, cause) => {
                if (cause !== undefined) console.error(cause)
                return alert({ title: 'Error', message: withCause(message, cause) })
            },
        }
    }, [enqueue])

    const current = queue[0]

    return <DialogsContext.Provider value={dialogs}>
        {children}
        {current?.kind === 'confirm' && <ConfirmDialog key={current.id} options={current.options}
            onResult={(value) => { dismiss(current.id); current.resolve(value) }} />}
        {current?.kind === 'prompt' && <PromptDialog key={current.id} options={current.options}
            onResult={(value) => { dismiss(current.id); current.resolve(value) }} />}
        {current?.kind === 'alert' && <AlertDialog key={current.id} options={current.options}
            onClose={() => { dismiss(current.id); current.resolve() }} />}
    </DialogsContext.Provider>
}

const ConfirmDialog = ({ options, onResult }: { options: ConfirmOptions; onResult: (value: boolean) => void }) =>
    <Modal title={options.title || 'Confirm'} onClose={() => onResult(false)} className="dialog">
        <p className="dialog-message">{options.message}</p>
        <div className="form-actions">
            <button type="button" onClick={() => onResult(false)}>{options.cancelLabel || 'Cancel'}</button>
            <button type="button" autoFocus className={options.danger ? 'btn-danger' : 'btn-primary'}
                onClick={() => onResult(true)}>{options.confirmLabel || 'OK'}</button>
        </div>
    </Modal>

const PromptDialog = ({ options, onResult }: { options: PromptOptions; onResult: (value: string | null) => void }) => {
    const [value, setValue] = useState(options.defaultValue || '')
    const submit = (event: FormEvent) => {
        event.preventDefault()
        if (options.required && !value.trim()) return
        onResult(value.trim())
    }

    return <Modal title={options.title} onClose={() => onResult(null)} className="dialog">
        <form className="entity-form" onSubmit={submit}>
            <label>{options.label || options.title}
                <input autoFocus value={value} required={options.required} onChange={(event) => setValue(event.target.value)} />
            </label>
            <div className="form-actions">
                <button type="button" onClick={() => onResult(null)}>Cancel</button>
                <button type="submit" className="btn-primary">{options.confirmLabel || 'OK'}</button>
            </div>
        </form>
    </Modal>
}

const AlertDialog = ({ options, onClose }: { options: AlertOptions; onClose: () => void }) =>
    <Modal title={options.title || 'Notice'} onClose={onClose} className="dialog">
        <p className="dialog-message">{options.message}</p>
        <div className="form-actions">
            <button type="button" autoFocus className="btn-primary" onClick={onClose}>OK</button>
        </div>
    </Modal>
