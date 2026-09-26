import { describe, expect, it } from 'vitest'
import { validateCardsSearch } from './cards-search'

describe('validateCardsSearch', () => {
    it('keeps valid ids and the archived flag', () => {
        expect(validateCardsSearch({ workspace: 1, board: '2', archived: true })).toEqual({ workspace: 1, board: 2, archived: true })
    })

    it('drops malformed ids and a false archived flag', () => {
        expect(validateCardsSearch({ workspace: 'abc', board: 2, archived: false })).toEqual({})
        expect(validateCardsSearch({ workspace: 1.5 })).toEqual({})
        expect(validateCardsSearch({ workspace: -1 })).toEqual({})
    })

    it('drops a board without a workspace', () => {
        expect(validateCardsSearch({ board: 2 })).toEqual({})
    })
})
