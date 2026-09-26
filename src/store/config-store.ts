import { create } from 'zustand'

/**
 * Configuration store for selected space and board.
 */
interface ConfigState {
    selectedWorkspaceId: number | null
    selectedBoardId: number | null
    setSelectedWorkspace: (workspaceId: number | null) => void
    setSelectedBoard: (boardId: number | null) => void
}

export const useConfigStore = create<ConfigState>((set) => ({
    selectedWorkspaceId: null,
    selectedBoardId: null,
    setSelectedWorkspace: (workspaceId: number | null) =>
        set({ selectedWorkspaceId: workspaceId, selectedBoardId: null }),
    setSelectedBoard: (boardId: number | null) =>
        set({ selectedBoardId: boardId }),
}))
