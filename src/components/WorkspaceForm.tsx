import { FormEvent, useState } from 'react'
import { useAppSettings } from '../api/settings'
import { useCreateWorkspace, useUpdateWorkspace } from '../api/workspaces'
import { formatHourlyRate, formatHourlyRateInput, parseHourlyRate } from '../lib/rates'
import { Workspace } from '../types/work-management'

interface WorkspaceFormProps { workspace?: Workspace; onSaved?: (workspace: Workspace) => void; onClose: () => void }

export const WorkspaceForm = ({ workspace, onSaved, onClose }: WorkspaceFormProps) => {
    const createWorkspace = useCreateWorkspace()
    const updateWorkspace = useUpdateWorkspace()
    const { data: settings } = useAppSettings()
    const [title, setTitle] = useState(workspace?.title || '')
    const [hourlyRate, setHourlyRate] = useState(formatHourlyRateInput(workspace?.hourly_rate))
    const saving = createWorkspace.isPending || updateWorkspace.isPending

    const submit = async (event: FormEvent) => {
        event.preventDefault()
        if (!title.trim()) return
        const values = { title: title.trim(), hourly_rate: parseHourlyRate(hourlyRate) }
        try {
            const saved = workspace
                ? await updateWorkspace.mutateAsync({ id: workspace.id, changes: values })
                : await createWorkspace.mutateAsync(values)
            onSaved?.(saved)
            onClose()
        } catch (error) {
            console.error(error)
            alert('Failed to save workspace.')
        }
    }

    const inherited = settings ? `Default: ${formatHourlyRate(settings.default_hourly_rate)}` : 'Default rate'

    return <div className="modal-overlay" onClick={onClose}>
        <form className="entity-form" onSubmit={submit} onClick={(event) => event.stopPropagation()}>
            <h2>{workspace ? 'Workspace settings' : 'New workspace'}</h2>
            <label>Title<input autoFocus value={title} onChange={(event) => setTitle(event.target.value)} required /></label>
            <label>Hourly rate, ₽
                <input type="number" min="0" step="0.01" inputMode="decimal" value={hourlyRate} placeholder={inherited}
                    onChange={(event) => setHourlyRate(event.target.value)} />
                <small className="form-hint">Leave empty to use the default rate. Applies to new invoices only.</small>
            </label>
            <div className="form-actions"><button type="button" onClick={onClose}>Cancel</button><button className="btn-primary" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button></div>
        </form>
    </div>
}
