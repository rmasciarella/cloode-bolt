import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { Database } from './database.types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Create the main client (same as before for backward compatibility)
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
})

// Auth-aware client wrapper that automatically handles token context
export class AuthAwareSupabaseClient {
  private client: SupabaseClient<Database>

  constructor() {
    this.client = supabase
  }

  // Get client with current auth context
  getClient(): SupabaseClient<Database> {
    return this.client
  }

  // Get client explicitly for authenticated requests
  getAuthenticatedClient(): SupabaseClient<Database> {
    return this.client
  }

  // Get client explicitly for anonymous requests (fallback mode)
  getAnonymousClient(): SupabaseClient<Database> {
    return this.client
  }

  // Check if user is authenticated
  async isAuthenticated(): Promise<boolean> {
    const { data: { session } } = await this.client.auth.getSession()
    return !!session
  }

  // Get current user
  async getCurrentUser() {
    const { data: { user } } = await this.client.auth.getUser()
    return user
  }

  // Enhanced query with auth fallback
  async query<T>(
    table: string,
    operation: 'select' | 'insert' | 'update' | 'delete' = 'select',
    options: {
      requireAuth?: boolean
      fallbackToAnon?: boolean
      columns?: string
      filters?: Record<string, any>
      data?: any
    } = {}
  ) {
    const {
      requireAuth = false,
      fallbackToAnon = true,
      columns = '*',
      filters = {},
      data
    } = options

    const isAuth = await this.isAuthenticated()

    // Check auth requirements
    if (requireAuth && !isAuth && !fallbackToAnon) {
      throw new Error('Authentication required for this operation')
    }

    // Build query
    let query: any = this.client.from(table)

    switch (operation) {
      case 'select':
        query = query.select(columns)
        break
      case 'insert':
        query = query.insert(data)
        break
      case 'update':
        query = query.update(data)
        break
      case 'delete':
        query = query.delete()
        break
    }

    // Apply filters
    Object.entries(filters).forEach(([key, value]) => {
      query = query.eq(key, value)
    })

    return query
  }
}

// Export singleton instance for use throughout the app
export const authAwareSupabase = new AuthAwareSupabaseClient()

// Note: Original supabase client is already exported from @/lib/supabase
// We don't re-export it here to avoid conflicts