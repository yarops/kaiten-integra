import { beforeEach, describe, expect, it } from 'vitest'
import { useConfigStore } from './config-store'

describe('useConfigStore', () => {
    beforeEach(() => useConfigStore.setState({ cardsSearch: {} }))

    it('starts without a remembered cards view', () => {
        expect(useConfigStore.getState().cardsSearch).toEqual({})
    })

    it('replaces the remembered cards view', () => {
        const { setCardsSearch } = useConfigStore.getState()

        setCardsSearch({ workspace: 1, board: 2, archived: true })
        setCardsSearch({ workspace: 3 })

        expect(useConfigStore.getState().cardsSearch).toEqual({ workspace: 3 })
    })
})
