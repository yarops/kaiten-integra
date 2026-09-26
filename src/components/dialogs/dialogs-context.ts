import { createContext, useContext } from 'react'

export interface ConfirmOptions {
    title?: string
    message: string
    confirmLabel?: string
    cancelLabel?: string
    /** Highlights the confirm button as a destructive action. */
    danger?: boolean
}

export interface PromptOptions {
    title: string
    label?: string
    defaultValue?: string
    confirmLabel?: string
    /** Disallows submitting an empty (whitespace-only) value. */
    required?: boolean
}

export interface AlertOptions {
    title?: string
    message: string
}

/**
 * Promise-based replacements for `window.confirm`, `window.prompt` and `window.alert`.
 */
export interface Dialogs {
    /** Resolves to `true` when confirmed, `false` when cancelled or dismissed. */
    confirm: (options: ConfirmOptions | string) => Promise<boolean>
    /** Resolves to the trimmed value, or `null` when cancelled or dismissed. */
    prompt: (options: PromptOptions) => Promise<string | null>
    /** Resolves once the message is dismissed. */
    alert: (options: AlertOptions | string) => Promise<void>
    /** Logs the cause and shows an error alert with its message appended. */
    error: (message: string, cause?: unknown) => Promise<void>
}

export const DialogsContext = createContext<Dialogs | null>(null)

export const useDialogs = (): Dialogs => {
    const dialogs = useContext(DialogsContext)
    if (!dialogs) throw new Error('useDialogs must be used within DialogProvider.')
    return dialogs
}
