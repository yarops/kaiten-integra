import { FormEvent, useEffect, useState } from 'react'
import { useAppSettings, useUpdateAppSettings } from '../api/settings'
import { formatHourlyRateInput, parseHourlyRate } from '../lib/rates'
import { Modal } from './Modal'
import { useDialogs } from './dialogs/dialogs-context'

interface SettingsFormProps { onClose: () => void }

export const SettingsForm = ({ onClose }: SettingsFormProps) => {
    const dialogs = useDialogs()
    const { data: settings, isLoading } = useAppSettings()
    const updateSettings = useUpdateAppSettings()
    const [hourlyRate, setHourlyRate] = useState('')

    useEffect(() => {
        if (settings) setHourlyRate(formatHourlyRateInput(settings.default_hourly_rate))
    }, [settings])

    const submit = async (event: FormEvent) => {
        event.preventDefault()
        const rate = parseHourlyRate(hourlyRate)
        if (rate === null) return
        try {
            await updateSettings.mutateAsync({ default_hourly_rate: rate })
            onClose()
        } catch (error) {
            dialogs.error('Failed to save settings.', error)
        }
    }

    return <Modal title={'Settings'} onClose={onClose}>
        <form className="entity-form" onSubmit={submit}>
            <label>Default hourly rate, ₽
                <input autoFocus type="number" min="0" step="0.01" inputMode="decimal" required disabled={isLoading}
                    value={hourlyRate} onChange={(event) => setHourlyRate(event.target.value)} />
                <small className="form-hint">Used by workspaces without their own rate. Applies to new invoices only.</small>
            </label>
            <div className="form-actions"><button type="button" onClick={onClose}>Cancel</button><button className="btn-primary" type="submit" disabled={isLoading || updateSettings.isPending}>{updateSettings.isPending ? 'Saving…' : 'Save'}</button></div>
        </form>
    </Modal>
}
