import { FormEvent, useState } from 'react'
import { useCreateCard, useUpdateCard } from '../api/cards'
import { Card, CardStatus, cardStatusLabels } from '../types/work-management'
import { Modal } from './Modal'
import { useDialogs } from './dialogs/dialogs-context'

interface CardFormProps { card?: Card; boardId: number; onClose: () => void }

export const CardForm = ({ card, boardId, onClose }: CardFormProps) => {
    const dialogs = useDialogs()
    const createCard = useCreateCard()
    const updateCard = useUpdateCard()
    const saving = createCard.isPending || updateCard.isPending
    const [title, setTitle] = useState(card?.title || '')
    const [description, setDescription] = useState(card?.description || '')
    const [status, setStatus] = useState<CardStatus>(card?.status || 'queued')
    const [tags, setTags] = useState((card?.tags || []).map((tag) => typeof tag === 'string' ? tag : tag.name).join(', '))

    const submit = async (event: FormEvent) => {
        event.preventDefault()
        if (!title.trim() || saving) return
        const values = { title, description, status, tags: tags.split(',').map((tag) => tag.trim()).filter(Boolean) }
        try {
            if (card) await updateCard.mutateAsync({ id: card.id, changes: values })
            else await createCard.mutateAsync({ board_id: boardId, ...values })
            onClose()
        } catch (error) {
            dialogs.error('Failed to save card.', error)
        }
    }

    return <Modal title={card ? 'Edit card' : 'New card'} onClose={onClose}>
        <form className="entity-form" onSubmit={submit}>
            <label>Title<input autoFocus value={title} onChange={(event) => setTitle(event.target.value)} required /></label>
            <label>Description<textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={4} /></label>
            <label>Status<select value={status} onChange={(event) => setStatus(event.target.value as CardStatus)}>
                {Object.entries(cardStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select></label>
            <label>Tags (comma-separated)<input value={tags} onChange={(event) => setTags(event.target.value)} /></label>
            <div className="form-actions"><button type="button" onClick={onClose}>Cancel</button><button className="btn-primary" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button></div>
        </form>
    </Modal>
}
