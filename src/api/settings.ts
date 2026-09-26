import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { AppSettings } from '../types/settings'

export const fetchAppSettings = async (): Promise<AppSettings> => {
    const { data, error } = await supabase.from('app_settings').select('default_hourly_rate').single()
    if (error) throw error
    return data
}

export const updateAppSettings = async (changes: Partial<AppSettings>): Promise<AppSettings> => {
    const { data, error } = await supabase.from('app_settings').update(changes).eq('id', true)
        .select('default_hourly_rate').single()
    if (error) throw error
    return data
}

export const useAppSettings = () => useQuery({ queryKey: ['appSettings'], queryFn: fetchAppSettings })

export const useUpdateAppSettings = () => {
    const client = useQueryClient()
    return useMutation({ mutationFn: updateAppSettings, onSuccess: () => client.invalidateQueries({ queryKey: ['appSettings'] }) })
}
