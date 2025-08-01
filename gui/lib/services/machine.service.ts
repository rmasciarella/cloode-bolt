import { BaseService, ServiceResponse } from './base.service'
import { Database } from '@/lib/database.types'

type Machine = Database['public']['Tables']['machines']['Row']
type MachineInsert = Database['public']['Tables']['machines']['Insert']
type MachineUpdate = Database['public']['Tables']['machines']['Update']

export class MachineService extends BaseService {
  async getAll(activeOnly: boolean = false): Promise<ServiceResponse<Machine[]>> {
    try {
      let query = this.supabase
        .from('machines')
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

  async getById(id: string): Promise<ServiceResponse<Machine>> {
    try {
      const { data, error } = await this.supabase
        .from('machines')
        .select('*')
        .eq('machine_resource_id', id)
        .single()

      if (error) {
        return this.createResponse(null, this.handleError(error))
      }

      return this.createResponse(data)
    } catch (error) {
      return this.createResponse(null, this.handleError(error))
    }
  }

  async create(machine: MachineInsert): Promise<ServiceResponse<Machine>> {
    try {
      const { data, error } = await this.supabase
        .from('machines')
        .insert([machine])
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

  async update(id: string, machine: MachineUpdate): Promise<ServiceResponse<Machine>> {
    try {
      const { data, error } = await this.supabase
        .from('machines')
        .update(machine)
        .eq('machine_resource_id', id)
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
        .from('machines')
        .delete()
        .eq('machine_resource_id', id)

      if (error) {
        return this.createResponse(null, this.handleError(error))
      }

      return this.createResponse(null)
    } catch (error) {
      return this.createResponse(null, this.handleError(error))
    }
  }

  async toggleActive(id: string): Promise<ServiceResponse<Machine>> {
    try {
      // First get current status
      const { data: current, error: fetchError } = await this.supabase
        .from('machines')
        .select('is_active')
        .eq('machine_resource_id', id)
        .single()

      if (fetchError) {
        return this.createResponse(null, this.handleError(fetchError))
      }

      // Toggle the status
      const { data, error } = await this.supabase
        .from('machines')
        .update({ is_active: !current.is_active })
        .eq('machine_resource_id', id)
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
export const machineService = new MachineService()