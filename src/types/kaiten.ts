/**
 * Kaiten API types and interfaces.
 */

/**
 * Card state enum: 1-queued, 2-inProgress, 3-done.
 */
export enum KaitenCardState {
    Queued = 1,
    InProgress = 2,
    Done = 3,
}

export interface KaitenSpace {
    id: number
    title: string
    created: string
    updated: string
}

export interface KaitenBoard {
    id: number
    title: string
    description?: string
    created: string
    updated: string
    email_key?: string
    external_id?: string | null
    default_card_type_id?: number
    move_parents_to_done?: boolean
    default_tags?: string | null
    first_image_is_cover?: boolean
    reset_lane_spent_time?: boolean
    backward_moves_enabled?: boolean
    hide_done_policies?: boolean
    hide_done_policies_in_done_column?: boolean
    automove_cards?: boolean
    auto_assign_enabled?: boolean
    cell_wip_limits?: null | any[]
    card_properties?: null | any[]
    columns?: any[]
    lanes?: any[]
    cards?: KaitenCard[]
}

export interface KaitenCard {
    id: number
    title: string
    board_id: number
    column_id: number
    lane_id?: number
    created: string
    updated: string
    state: number
    time_spent_sum?: number
    tags?: any[]
    assignees?: KaitenUser[]
    archived?: boolean
}

/**
 * Extended card interface with additional details from GET /cards/{card_id}.
 */
export interface ExtendedKaitenCard extends KaitenCard {
    description?: string | null
    archived?: boolean
    text?: string
    custom_fields?: any[]
    members?: KaitenUser[]
    owner?: KaitenUser
    children?: any[]
    parents?: any[]
    comments_count?: number
    files_count?: number
    checklists?: any[]
    blocking_cards?: any[]
    blocked_by_cards?: any[]
    links?: any[]
    card_type?: any
    column?: any
    lane?: any
    board?: any
}

export interface KaitenUser {
    id: number
    email: string
    full_name: string
    avatar_url?: string
}

/**
 * API response wrappers.
 */
export interface KaitenApiResponse<T> {
    data: T
}

export interface KaitenApiListResponse<T> {
    data: T[]
    total?: number
}

