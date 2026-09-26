/**
 * In-memory stand-in for the Supabase client in API tests:
 * `vi.mock('../lib/supabase', () => import('../test/supabase-mock'))`.
 *
 * Every `from(table)` / `rpc(name)` records its chained calls and resolves to the next result
 * queued for that table or function with `db.respond`, or `{ data: null, error: null }`.
 */
type Result = { data?: unknown; error?: unknown }

export interface RecordedQuery {
    target: string
    calls: Array<[method: string, ...args: unknown[]]>
}

const responses = new Map<string, Result[]>()

export const db = {
    queries: [] as RecordedQuery[],
    respond: (target: string, ...results: Result[]) => {
        responses.set(target, [...(responses.get(target) ?? []), ...results])
    },
    /** Chained calls of the queries to `target`, in call order. */
    calls: (target: string) => db.queries.filter((query) => query.target === target).map((query) => query.calls),
    reset: () => {
        db.queries = []
        responses.clear()
    },
}

const query = (target: string, firstCall?: [string, ...unknown[]]) => {
    const recorded: RecordedQuery = { target, calls: firstCall ? [firstCall] : [] }
    db.queries.push(recorded)
    const result = () => {
        const { data = null, error = null } = responses.get(target)?.shift() ?? {}
        return { data, error }
    }
    const builder: Record<string, unknown> = new Proxy({}, {
        get: (_, method: string) => {
            if (method === 'then') {
                return (resolve: (value: Result) => unknown, reject: (reason: unknown) => unknown) =>
                    Promise.resolve(result()).then(resolve, reject)
            }
            return (...args: unknown[]) => {
                recorded.calls.push([method, ...args])
                return builder
            }
        },
    })
    return builder
}

export const supabase = {
    from: (table: string) => query(table),
    rpc: (name: string, args?: unknown) => query(name, ['rpc', args]),
}
