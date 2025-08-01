import { supabase } from '@/lib/supabase'
import { authAwareSupabase } from '@/lib/supabase-auth'
import { PostgrestError, SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/lib/database.types'

export interface ServiceResponse<T = any> {
  data: T | null
  error: string | null
  success: boolean
  isAuthenticated?: boolean
}

export interface ServiceError {
  message: string
  code?: string
  details?: string
  hint?: string
}

export interface ServiceOptions {
  requireAuth?: boolean
  fallbackToAnon?: boolean
}

export abstract class BaseService {
  protected async getClient(options: ServiceOptions = {}): Promise<SupabaseClient<Database>> {
    const { requireAuth = false, fallbackToAnon = true } = options
    
    const isAuth = await authAwareSupabase.isAuthenticated()
    
    // Check auth requirements
    if (requireAuth && !isAuth && !fallbackToAnon) {
      throw new Error('Authentication required for this operation')
    }
    
    // Return appropriate client
    if (isAuth) {
      return authAwareSupabase.getAuthenticatedClient()
    } else if (fallbackToAnon) {
      return authAwareSupabase.getAnonymousClient()
    } else {
      throw new Error('Access denied - authentication required')
    }
  }

  protected handleError(error: PostgrestError | Error | any): ServiceError {
    console.error('Service error:', error)
    
    // Handle auth errors gracefully
    if (error.message?.includes('JWT') || error.message?.includes('auth')) {
      return {
        message: 'Authentication error - please try signing in',
        code: error.code || 'AUTH_ERROR'
      }
    }
    
    // Handle Supabase PostgrestError
    if (error.code && error.message) {
      return {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      }
    }
    
    // Handle generic Error
    if (error instanceof Error) {
      return {
        message: error.message
      }
    }
    
    // Handle unknown error
    return {
      message: 'An unexpected error occurred'
    }
  }

  protected async createResponse<T>(
    data: T | null, 
    error: ServiceError | null = null,
    includeAuthStatus: boolean = false // Default to false for backward compatibility
  ): Promise<ServiceResponse<T>> {
    const response: ServiceResponse<T> = {
      data,
      error: error?.message || null,
      success: error === null
    }

    if (includeAuthStatus) {
      try {
        response.isAuthenticated = await authAwareSupabase.isAuthenticated()
      } catch {
        response.isAuthenticated = false
      }
    }

    return response
  }

  // Legacy synchronous method for backward compatibility
  protected createResponseSync<T>(data: T | null, error: ServiceError | null = null): ServiceResponse<T> {
    return {
      data,
      error: error?.message || null,
      success: error === null
    }
  }

  // Legacy method for backward compatibility
  protected get supabase() {
    return supabase
  }

  // Auth-aware method for new implementations
  protected async getAuthAwareClient(options?: ServiceOptions) {
    return this.getClient(options)
  }
}