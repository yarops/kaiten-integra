import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { Board } from '../types/work-management'

export const fetchBoards = async (workspaceId?: number | null, includeArchived = false): Promise<Board[]> => {
    if (!workspaceId) return []
    let query = supabase.from('boards').select('*').eq('workspace_id', workspaceId).order('title')
    if (!includeArchived) query = query.eq('archived', false)
    const { data, error } = await query
    if (error) throw error
    return data || []
}

export const fetchBoard = async (boardId: number): Promise<Board> => {
    const { data, error } = await supabase.from('boards').select('*').eq('id', boardId).single()
    if (error) throw error
    return data
}

export const createBoard = async (input: Pick<Board, 'workspace_id' | 'title'> & { description?: string }): Promise<Board> => {
    const { data, error } = await supabase.from('boards').insert({
        workspace_id: input.workspace_id, title: input.title.trim(), description: input.description?.trim() || null,
    }).select().single()
    if (error) throw error
    return data
}

export const updateBoard = async (id: number, changes: Pick<Partial<Board>, 'title' | 'description' | 'archived'>): Promise<Board> => {
    const { data, error } = await supabase.from('boards').update(changes).eq('id', id).select().single()
    if (error) throw error
    return data
}

export const useBoards = (workspaceId?: number | null, includeArchived = false) => useQuery({
    queryKey: ['boards', workspaceId, includeArchived], queryFn: () => fetchBoards(workspaceId, includeArchived), enabled: !!workspaceId,
})
export const useBoard = (boardId: number) => useQuery({ queryKey: ['boards', 'one', boardId], queryFn: () => fetchBoard(boardId), enabled: !!boardId })
export const useCreateBoard = () => {
    const client = useQueryClient()
    return useMutation({ mutationFn: createBoard, onSuccess: () => client.invalidateQueries({ queryKey: ['boards'] }) })
}
export const useUpdateBoard = () => {
    const client = useQueryClient()
    return useMutation({
        mutationFn: ({ id, changes }: { id: number; changes: Pick<Partial<Board>, 'title' | 'description' | 'archived'> }) => updateBoard(id, changes),
        onSuccess: () => { client.invalidateQueries({ queryKey: ['boards'] }); client.invalidateQueries({ queryKey: ['cards'] }) },
    })
}
