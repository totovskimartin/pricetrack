import { createClient } from '@supabase/supabase-js'
import type { Database } from './types/database'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'

// Singleton client instance
let supabaseInstance: ReturnType<typeof createClient<Database>> | null = null

// Get or create the singleton Supabase client
export const getSupabaseClient = () => {
  if (!supabaseInstance) {
    supabaseInstance = createClient<Database>(supabaseUrl, supabaseAnonKey)
  }
  return supabaseInstance
}

// Export the singleton instance
export const supabase = getSupabaseClient()

// For backward compatibility
export const createSupabaseClient = getSupabaseClient

// Admin client with service role key (server-side only)
export const createSupabaseAdminClient = () => {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-service-key'
  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

// Add this function to create a client with custom auth settings
export const createSupabaseClientWithCustomAuth = () => {
  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      flowType: 'pkce', // More secure flow
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    }
  })
}
