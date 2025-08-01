import { BaseService, ServiceResponse } from './base.service'
import { Database } from '@/lib/database.types'

type JobTemplate = Database['public']['Tables']['job_optimized_patterns']['Row']
type JobTemplateInsert = Database['public']['Tables']['job_optimized_patterns']['Insert']
type JobTemplateUpdate = Database['public']['Tables']['job_optimized_patterns']['Update']

export class JobTemplateService extends BaseService {
  async getAll(activeOnly: boolean = false): Promise<ServiceResponse<JobTemplate[]>> {
    try {
      let query = this.supabase
        .from('job_optimized_patterns')
        .select('*')
        .order('name', { ascending: true })

      if (activeOnly) {
        query = query.eq('is_active', true)
      }

      const { data, error } = await query

      if (error) {
        return this.createResponse(null, this.handleError(error))
      }

      return this.createResponse(data || [])
    } catch (error) {
      return this.createResponse(null, this.handleError(error))
    }
  }

  async getById(id: string): Promise<ServiceResponse<JobTemplate>> {
    try {
      const { data, error } = await this.supabase
        .from('job_optimized_patterns')
        .select('*')
        .eq('pattern_id', id)
        .single()

      if (error) {
        return this.createResponse(null, this.handleError(error))
      }

      return this.createResponse(data)
    } catch (error) {
      return this.createResponse(null, this.handleError(error))
    }
  }

  async create(template: JobTemplateInsert): Promise<ServiceResponse<JobTemplate>> {
    try {
      const { data, error } = await this.supabase
        .from('job_optimized_patterns')
        .insert([template])
        .select()
        .single()

      if (error) {
        return this.createResponse(null, this.handleError(error))
      }

      return this.createResponse(data)
    } catch (error) {
      return this.createResponse(null, this.handleError(error))
    }
  }

  async update(id: string, template: JobTemplateUpdate): Promise<ServiceResponse<JobTemplate>> {
    try {
      const { data, error } = await this.supabase
        .from('job_optimized_patterns')
        .update(template)
        .eq('pattern_id', id)
        .select()
        .single()

      if (error) {
        return this.createResponse(null, this.handleError(error))
      }

      return this.createResponse(data)
    } catch (error) {
      return this.createResponse(null, this.handleError(error))
    }
  }

  async delete(id: string): Promise<ServiceResponse<void>> {
    try {
      const { error } = await this.supabase
        .from('job_optimized_patterns')
        .delete()
        .eq('pattern_id', id)

      if (error) {
        return this.createResponse(null, this.handleError(error))
      }

      return this.createResponse(null)
    } catch (error) {
      return this.createResponse(null, this.handleError(error))
    }
  }

  async validateSolverParameters(parameters: any): Promise<ServiceResponse<boolean>> {
    try {
      // Security validation: must be a plain object
      if (typeof parameters !== 'object' || parameters === null || Array.isArray(parameters)) {
        return this.createResponse(null, { message: "Solver parameters must be a JSON object" })
      }
      
      // Security validation: check for dangerous properties
      const dangerousKeys = ['__proto__', 'constructor', 'prototype']
      for (const key of Object.keys(parameters)) {
        if (dangerousKeys.includes(key) || typeof key !== 'string') {
          return this.createResponse(null, { message: "Invalid property names in solver parameters" })
        }
      }
      
      // Validate known OR-Tools solver parameter keys
      const validKeys = [
        'max_preprocessing_time', 
        'search_strategy', 
        'num_search_workers', 
        'use_fast_restart', 
        'cp_model_probing_level',
        'max_time_in_seconds',
        'linearization_level',
        'search_branching',
        'cp_model_presolve',
        'repair_hint'
      ]
      
      for (const key of Object.keys(parameters)) {
        if (!validKeys.includes(key)) {
          console.warn(`Unknown solver parameter: ${key}`)
        }
      }

      return this.createResponse(true)
    } catch (error) {
      return this.createResponse(null, this.handleError(error))
    }
  }
}

// Export singleton instance
export const jobTemplateService = new JobTemplateService()