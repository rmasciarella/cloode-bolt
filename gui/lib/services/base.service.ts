import { supabase } from '@/lib/supabase'
import { PostgrestError } from '@supabase/supabase-js'

export interface ServiceResponse<T = any> {
  data: T | null
  error: string | null
  success: boolean
}

export interface ServiceError {
  message: string
  code?: string
  details?: string
  hint?: string
}

export abstract class BaseService {
  protected handleError(error: PostgrestError | Error | any): ServiceError {
    console.error('Service error:', error)
    
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

  protected createResponse<T>(data: T | null, error: ServiceError | null = null): ServiceResponse<T> {
    return {
      data,
      error: error?.message || null,
      success: error === null
    }
  }

  protected get supabase() {
    return supabase
  }
}