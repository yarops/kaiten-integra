import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { Workspace } from '../types/work-management'

export const fetchWorkspaces = async (includeArchived = false): Promise<Workspace[]> => {
    let query = supabase.from('workspaces').select('*').order('title')
    if (!includeArchived) query = query.eq('archived', false)
    const { data, error } = await query
    if (error) throw error
    return data || []
}

export type WorkspaceInput = Pick<Workspace, 'title' | 'hourly_rate'>

export const createWorkspace = async (input: WorkspaceInput): Promise<Workspace> => {
    const { data, error } = await supabase.from('workspaces').insert({ ...input, title: input.title.trim() }).select().single()
    if (error) throw error
    return data
}

export const updateWorkspace = async (
    id: number,
    changes: Pick<Partial<Workspace>, 'title' | 'hourly_rate' | 'archived'>
): Promise<Workspace> => {
    const { data, error } = await supabase.from('workspaces').update(changes).eq('id', id).select().single()
    if (error) throw error
    return data
}

export const useWorkspaces = (includeArchived = false) => useQuery({
    queryKey: ['workspaces', includeArchived],
    queryFn: () => fetchWorkspaces(includeArchived),
})

export const useCreateWorkspace = () => {
    const client = useQueryClient()
    return useMutation({ mutationFn: createWorkspace, onSuccess: () => client.invalidateQueries({ queryKey: ['workspaces'] }) })
}

export const useUpdateWorkspace = () => {
    const client = useQueryClient()
    return useMutation({
        mutationFn: ({ id, changes }: { id: number; changes: Pick<Partial<Workspace>, 'title' | 'hourly_rate' | 'archived'> }) => updateWorkspace(id, changes),
        onSuccess: () => {
            client.invalidateQueries({ queryKey: ['workspaces'] })
            client.invalidateQueries({ queryKey: ['boards'] })
            client.invalidateQueries({ queryKey: ['cards'] })
        },
    })
}
