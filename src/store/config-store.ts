import { create } from 'zustand'
import { CardsSearch } from '../lib/cards-search'

/**
 * Remembers the last cards view selection, so navigating back to it restores the workspace and board.
 * The URL stays the source of truth.
 */
interface ConfigState {
    cardsSearch: CardsSearch
    setCardsSearch: (search: CardsSearch) => void
}

export const useConfigStore = create<ConfigState>((set) => ({
    cardsSearch: {},
    setCardsSearch: (cardsSearch: CardsSearch) => set({ cardsSearch }),
}))
