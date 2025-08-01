import { createClient } from '@supabase/supabase-js'
import { Database } from './database.types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Default client for frontend operations
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)

// Service role client for backend/admin operations (bypass RLS)  
export const supabaseServiceRole = createClient<Database>(
  supabaseUrl, 
  supabaseServiceKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

// Development mode flag - set true for development without auth
export const DEV_MODE_NO_AUTH = process.env.NODE_ENV === 'development' && 
  process.env.NEXT_PUBLIC_DISABLE_AUTH === 'true'

// Auth helper functions
export const authHelpers = {
  /**
   * Get current user or fallback to service role in dev mode
   */
  async getCurrentUser() {
    if (DEV_MODE_NO_AUTH) {
      return {
        id: 'dev-user-id',
        email: 'dev@localhost',
        role: 'authenticated'
      }
    }
    
    const { data: { user }, error } = await supabase.auth.getUser()
    return error ? null : user
  },

  /**
   * Get appropriate client based on auth state
   */
  getClient() {
    return DEV_MODE_NO_AUTH ? supabaseServiceRole : supabase
  },

  /**
   * Sign in with email/password or continue as anonymous in dev mode
   */
  async signIn(email: string, password: string) {
    if (DEV_MODE_NO_AUTH) {
      return { data: { user: await this.getCurrentUser() }, error: null }
    }
    
    return await supabase.auth.signInWithPassword({ email, password })
  },

  /**
   * Sign out or no-op in dev mode
   */
  async signOut() {
    if (DEV_MODE_NO_AUTH) {
      return { error: null }
    }
    
    return await supabase.auth.signOut()
  },

  /**
   * Check if user is authenticated or always true in dev mode
   */
  async isAuthenticated() {
    if (DEV_MODE_NO_AUTH) return true
    
    const user = await this.getCurrentUser()
    return !!user
  }
}