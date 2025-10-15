import { create } from 'zustand'

/**
 * Configuration store for selected space and board.
 */
interface ConfigState {
    selectedSpaceId: number | null
    selectedBoardId: number | null
    setSelectedSpace: (spaceId: number | null) => void
    setSelectedBoard: (boardId: number | null) => void
}

export const useConfigStore = create<ConfigState>((set) => ({
    selectedSpaceId: null,
    selectedBoardId: null,
    setSelectedSpace: (spaceId: number | null) =>
        set({ selectedSpaceId: spaceId, selectedBoardId: null }),
    setSelectedBoard: (boardId: number | null) =>
        set({ selectedBoardId: boardId }),
}))

