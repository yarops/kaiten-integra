import { createClient } from '@supabase/supabase-js'

/**
 * Supabase configuration.
 * Add these to your .env file:
 * VITE_SUPABASE_URL=https://your-domain.supabase.co
 * VITE_SUPABASE_ANON_KEY=your-anon-key
 */

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
        'Missing Supabase configuration. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables.'
    )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

