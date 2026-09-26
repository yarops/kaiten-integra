// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

type AuthListener = (event: string, session: unknown) => void

const auth = vi.hoisted(() => ({
    getSession: vi.fn(),
    signInWithPassword: vi.fn(),
    unsubscribe: vi.fn(),
    listener: null as AuthListener | null,
}))

vi.mock('../lib/supabase', () => ({
    supabase: {
        auth: {
            getSession: auth.getSession,
            signInWithPassword: auth.signInWithPassword,
            onAuthStateChange: (listener: AuthListener) => {
                auth.listener = listener
                return { data: { subscription: { unsubscribe: auth.unsubscribe } } }
            },
        },
    },
}))

import { AuthGate } from './AuthGate'

const session = { user: { email: 'user@example.com' } }

const renderGate = (queryClient = new QueryClient()) => render(
    <QueryClientProvider client={queryClient}>
        <AuthGate><p>Protected content</p></AuthGate>
    </QueryClientProvider>,
)

describe('AuthGate', () => {
    beforeEach(() => {
        auth.getSession.mockReset()
        auth.signInWithPassword.mockReset()
        auth.listener = null
    })
    afterEach(cleanup)

    it('shows the app for a signed-in user', async () => {
        auth.getSession.mockResolvedValueOnce({ data: { session } })
        renderGate()

        expect(await screen.findByText('Protected content')).toBeTruthy()
    })

    it('asks an anonymous user to sign in and lets them in after a successful sign-in', async () => {
        auth.getSession.mockResolvedValueOnce({ data: { session: null } })
        auth.signInWithPassword.mockResolvedValueOnce({ error: null })
        renderGate()

        fireEvent.change(await screen.findByLabelText('Email'), { target: { value: ' user@example.com ' } })
        fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'secret' } })
        fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))

        await waitFor(() => expect(auth.signInWithPassword).toHaveBeenCalledWith({ email: 'user@example.com', password: 'secret' }))
        expect(screen.queryByText('Protected content')).toBeNull()
        act(() => auth.listener!('SIGNED_IN', session))
        expect(screen.getByText('Protected content')).toBeTruthy()
    })

    it('shows the sign-in error', async () => {
        auth.getSession.mockResolvedValueOnce({ data: { session: null } })
        auth.signInWithPassword.mockResolvedValueOnce({ error: { message: 'Invalid login credentials' } })
        renderGate()

        fireEvent.change(await screen.findByLabelText('Email'), { target: { value: 'user@example.com' } })
        fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'wrong' } })
        fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))

        expect((await screen.findByRole('alert')).textContent).toBe('Invalid login credentials')
    })

    it('clears cached data and returns to the sign-in form on sign-out', async () => {
        auth.getSession.mockResolvedValueOnce({ data: { session } })
        const queryClient = new QueryClient()
        queryClient.setQueryData(['workspaces'], [{ id: 1 }])
        renderGate(queryClient)
        await screen.findByText('Protected content')

        act(() => auth.listener!('SIGNED_OUT', null))

        expect(queryClient.getQueryData(['workspaces'])).toBeUndefined()
        expect(screen.getByLabelText('Email')).toBeTruthy()
    })
})
