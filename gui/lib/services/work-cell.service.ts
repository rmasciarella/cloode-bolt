import { BaseService, ServiceResponse } from './base.service'
import { Database } from '@/lib/database.types'

type WorkCell = Database['public']['Tables']['work_cells']['Row']
type WorkCellInsert = Database['public']['Tables']['work_cells']['Insert']
type WorkCellUpdate = Database['public']['Tables']['work_cells']['Update']

export class WorkCellService extends BaseService {
  async getAll(activeOnly: boolean = false): Promise<ServiceResponse<WorkCell[]>> {
    try {
      let query = this.supabase
        .from('work_cells')
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

  async getById(id: string): Promise<ServiceResponse<WorkCell>> {
    try {
      const { data, error } = await this.supabase
        .from('work_cells')
        .select('*')
        .eq('cell_id', id)
        .single()

      if (error) {
        return this.createResponse(null, this.handleError(error))
      }

      return this.createResponse(data)
    } catch (error) {
      return this.createResponse(null, this.handleError(error))
    }
  }

  async create(workCell: WorkCellInsert): Promise<ServiceResponse<WorkCell>> {
    try {
      const { data, error } = await this.supabase
        .from('work_cells')
        .insert([workCell])
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

  async update(id: string, workCell: WorkCellUpdate): Promise<ServiceResponse<WorkCell>> {
    try {
      const { data, error } = await this.supabase
        .from('work_cells')
        .update(workCell)
        .eq('cell_id', id)
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
        .from('work_cells')
        .delete()
        .eq('cell_id', id)

      if (error) {
        return this.createResponse(null, this.handleError(error))
      }

      return this.createResponse(null)
    } catch (error) {
      return this.createResponse(null, this.handleError(error))
    }
  }

  async toggleActive(id: string): Promise<ServiceResponse<WorkCell>> {
    try {
      // First get current status
      const { data: current, error: fetchError } = await this.supabase
        .from('work_cells')
        .select('is_active')
        .eq('cell_id', id)
        .single()

      if (fetchError) {
        return this.createResponse(null, this.handleError(fetchError))
      }

      // Toggle the status
      const { data, error } = await this.supabase
        .from('work_cells')
        .update({ is_active: !current.is_active })
        .eq('cell_id', id)
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
export const workCellService = new WorkCellService()