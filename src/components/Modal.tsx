import { ReactNode, useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

interface ModalProps {
    title: ReactNode
    onClose: () => void
    children: ReactNode
    className?: string
}

/**
 * Modal window rendered into `document.body`: closes on Escape and on a click outside the panel,
 * moves focus into the panel when opened and returns it to the previously focused element on close.
 * Only the topmost of stacked modals reacts to Escape, because the key event stops at its panel.
 */
export const Modal = ({ title, onClose, children, className }: ModalProps) => {
    const titleId = useId()
    const panelRef = useRef<HTMLDivElement>(null)
    const restoreFrame = useRef<number>()
    // Captured during the first render, before `autoFocus` inside the panel moves the focus.
    const [opener] = useState(() => document.activeElement as HTMLElement | null)

    useEffect(() => {
        // Cancels the restore scheduled by a StrictMode remount.
        if (restoreFrame.current !== undefined) cancelAnimationFrame(restoreFrame.current)
        if (!panelRef.current?.contains(document.activeElement)) panelRef.current?.focus()
        return () => {
            restoreFrame.current = requestAnimationFrame(() => {
                // Leaves the focus alone if another modal or element has already taken it.
                if (!document.activeElement || document.activeElement === document.body) opener?.focus?.()
            })
        }
    }, [opener])

    return createPortal(
        <div className="modal-overlay" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
            <div ref={panelRef} className={`modal${className ? ` ${className}` : ''}`} role="dialog" aria-modal="true"
                aria-labelledby={titleId} tabIndex={-1}
                onKeyDown={(event) => {
                    if (event.key !== 'Escape') return
                    event.stopPropagation()
                    onClose()
                }}>
                <h2 id={titleId} className="modal-title">{title}</h2>
                {children}
            </div>
        </div>,
        document.body,
    )
}
