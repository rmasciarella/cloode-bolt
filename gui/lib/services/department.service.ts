import { BaseService, ServiceResponse } from './base.service'
import { Database } from '@/lib/database.types'

type Department = Database['public']['Tables']['departments']['Row']
type DepartmentInsert = Database['public']['Tables']['departments']['Insert']
type DepartmentUpdate = Database['public']['Tables']['departments']['Update']

export class DepartmentService extends BaseService {
  async getAll(activeOnly: boolean = false): Promise<ServiceResponse<Department[]>> {
    try {
      // Use auth-aware client with fallback to anonymous access
      const client = await this.getClient({ fallbackToAnon: true })
      
      let query = client
        .from('departments')
        .select('*')
        .order('name', { ascending: true })

      if (activeOnly) {
        query = query.eq('is_active', true)
      }

      const { data, error } = await query

      if (error) {
        return this.createResponseSync(null, this.handleError(error))
      }

      return this.createResponseSync(data || [])
    } catch (error) {
      return this.createResponseSync(null, this.handleError(error))
    }
  }

  async getById(id: string): Promise<ServiceResponse<Department>> {
    try {
      const { data, error } = await this.supabase
        .from('departments')
        .select('*')
        .eq('department_id', id)
        .single()

      if (error) {
        return this.createResponse(null, this.handleError(error))
      }

      return this.createResponse(data)
    } catch (error) {
      return this.createResponse(null, this.handleError(error))
    }
  }

  async create(department: DepartmentInsert): Promise<ServiceResponse<Department>> {
    try {
      const { data, error } = await this.supabase
        .from('departments')
        .insert([department])
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

  async update(id: string, department: DepartmentUpdate): Promise<ServiceResponse<Department>> {
    try {
      const { data, error } = await this.supabase
        .from('departments')
        .update(department)
        .eq('department_id', id)
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
        .from('departments')
        .delete()
        .eq('department_id', id)

      if (error) {
        return this.createResponse(null, this.handleError(error))
      }

      return this.createResponse(null)
    } catch (error) {
      return this.createResponse(null, this.handleError(error))
    }
  }

  async toggleActive(id: string): Promise<ServiceResponse<Department>> {
    try {
      // First get current status
      const { data: current, error: fetchError } = await this.supabase
        .from('departments')
        .select('is_active')
        .eq('department_id', id)
        .single()

      if (fetchError) {
        return this.createResponse(null, this.handleError(fetchError))
      }

      // Toggle the status
      const { data, error } = await this.supabase
        .from('departments')
        .update({ is_active: !current.is_active })
        .eq('department_id', id)
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
}

// Export singleton instance
export const departmentService = new DepartmentService()