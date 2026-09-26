/**
 * Search params of the cards view: `/?workspace=1&board=2&archived=true`.
 */
export interface CardsSearch {
    workspace?: number
    board?: number
    archived?: boolean
}

const positiveInt = (value: unknown) => {
    const number = typeof value === 'number' || typeof value === 'string' ? Number(value) : NaN
    return Number.isInteger(number) && number > 0 ? number : undefined
}

/**
 * Validates the cards view search params. A board is kept only together with a workspace.
 */
export const validateCardsSearch = (search: Record<string, unknown>): CardsSearch => {
    const workspace = positiveInt(search.workspace)
    return {
        workspace,
        board: workspace ? positiveInt(search.board) : undefined,
        archived: search.archived === true || search.archived === 'true' ? true : undefined,
    }
}
