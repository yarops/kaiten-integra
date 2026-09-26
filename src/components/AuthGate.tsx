import { FormEvent, ReactNode, useEffect, useState } from 'react'
import { Session } from '@supabase/supabase-js'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import '../App.css'

/**
 * Renders the app only for a signed-in Supabase user; RLS denies the anon role any access.
 * The query cache is cleared on sign-out, so the next user never sees stale data.
 */
export const AuthGate = ({ children }: { children: ReactNode }) => {
    const queryClient = useQueryClient()
    const [session, setSession] = useState<Session | null | undefined>(undefined)

    useEffect(() => {
        let active = true
        supabase.auth.getSession().then(({ data }) => { if (active) setSession(data.session) })
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, nextSession) => {
            if (event === 'SIGNED_OUT') queryClient.clear()
            setSession(nextSession)
        })
        return () => { active = false; subscription.unsubscribe() }
    }, [queryClient])

    if (session === undefined) return null
    if (!session) return <LoginForm />
    return <>{children}</>
}

const LoginForm = () => {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState<string | null>(null)
    const [signingIn, setSigningIn] = useState(false)

    const submit = async (event: FormEvent) => {
        event.preventDefault()
        setError(null)
        setSigningIn(true)
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
        setSigningIn(false)
        if (error) setError(error.message)
    }

    return <div className="app-shell login-page">
        <h1>Workspaces & Invoices</h1>
        <form className="entity-form login-form" onSubmit={submit}>
            <label>Email<input type="email" autoComplete="username" autoFocus value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
            <label>Password<input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required /></label>
            {error && <p className="login-error" role="alert">{error}</p>}
            <div className="form-actions"><button className="btn-primary" type="submit" disabled={signingIn}>{signingIn ? 'Signing in…' : 'Sign in'}</button></div>
        </form>
    </div>
}
