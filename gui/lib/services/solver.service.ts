/**
 * Solver Service - Integration with OR-Tools constraint solver
 * 
 * Provides comprehensive integration between GUI and backend solver,
 * including 3-phase constraint system coordination and performance monitoring.
 */

import { BaseService, ServiceResponse } from './base.service'
import { Database } from '@/lib/database.types'

// Types for solver integration
export interface SolverJobRequest {
  pattern_id: string
  instances: JobInstanceRequest[]
  constraints?: ConstraintSettings
}

export interface JobInstanceRequest {
  instance_id: string
  description: string
  due_date: string
  priority: number
}

export interface ConstraintSettings {
  enable_setup_times?: boolean
  enable_skill_matching?: boolean
  enable_multi_objective?: boolean
  max_overtime_hours?: number
  wip_limits?: { [department_id: string]: number }
}

export interface SolverResponse {
  success: boolean
  solution?: SolutionResult
  error?: string
  performance_metrics?: PerformanceMetrics
}

export interface SolutionResult {
  status: 'OPTIMAL' | 'FEASIBLE' | 'INFEASIBLE' | 'TIMEOUT'
  objective_value: number
  total_duration_minutes: number
  assignments: TaskAssignment[]
  resource_utilization: ResourceUtilization[]
}

export interface TaskAssignment {
  instance_id: string
  task_id: string
  machine_id: string
  start_time: number
  end_time: number
  mode_id: string
}

export interface ResourceUtilization {
  machine_id: string
  utilization_percent: number
  total_runtime_minutes: number
}

export interface PerformanceMetrics {
  solve_time_seconds: number
  variables_count: number
  constraints_count: number
  memory_usage_mb: number
}

export interface PatternInfo {
  pattern_id: string
  name: string
  description: string
  task_count: number
  total_min_duration_minutes: number
  critical_path_length_minutes: number
}

export interface ValidationResult {
  phase1: boolean
  phase2: boolean
  phase3: boolean
  errors: string[]
}

/**
 * Solver Service Implementation
 * 
 * Handles all communication with the backend constraint solver,
 * including validation, problem solving, and performance monitoring.
 */
export class SolverService extends BaseService {
  private solverBaseUrl: string

  constructor() {
    super()
    this.solverBaseUrl = process.env.NEXT_PUBLIC_SOLVER_API_URL || 'http://localhost:8000'
  }

  /**
   * Health check for solver service
   */
  async healthCheck(): Promise<ServiceResponse<{ healthy: boolean; patterns_available: number }>> {
    return this.handleRequest(async () => {
      const response = await fetch(`${this.solverBaseUrl}/api/v1/health`)
      
      if (!response.ok) {
        throw new Error(`Health check failed: ${response.status}`)
      }
      
      const data = await response.json()
      return {
        healthy: data.status === 'healthy',
        patterns_available: data.patterns_available || 0
      }
    })
  }

  /**
   * Get available job patterns from solver
   */
  async getAvailablePatterns(): Promise<ServiceResponse<PatternInfo[]>> {
    return this.handleRequest(async () => {
      const response = await fetch(`${this.solverBaseUrl}/api/v1/patterns`)
      
      if (!response.ok) {
        throw new Error(`Failed to fetch patterns: ${response.status}`)
      }
      
      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch patterns')
      }
      
      return data.patterns || []
    })
  }

  /**
   * Submit scheduling problem to solver
   */
  async solveProblem(request: SolverJobRequest): Promise<ServiceResponse<SolverResponse>> {
    return this.handleRequest(async () => {
      // Validate request
      this.validateJobRequest(request)

      const response = await fetch(`${this.solverBaseUrl}/api/v1/solve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request)
      })

      if (!response.ok) {
        throw new Error(`Solver API error: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      return data
    })
  }

  /**
   * Validate 3-phase constraint system integration
   */
  async validateConstraintSystem(): Promise<ServiceResponse<ValidationResult>> {
    return this.handleRequest(async () => {
      const response = await fetch(`${this.solverBaseUrl}/api/v1/validate`)
      
      if (!response.ok) {
        throw new Error(`Validation failed: ${response.status}`)
      }
      
      const data = await response.json()
      
      return {
        phase1: data.phase1?.success || false,
        phase2: data.phase2?.success || false,
        phase3: data.phase3?.success || false,
        errors: [
          ...(data.phase1?.success ? [] : [`Phase 1: ${data.phase1?.error || 'Unknown error'}`]),
          ...(data.phase2?.success ? [] : [`Phase 2: ${data.phase2?.error || 'Unknown error'}`]),
          ...(data.phase3?.success ? [] : [`Phase 3: ${data.phase3?.error || 'Unknown error'}`])
        ]
      }
    })
  }

  /**
   * Transform GUI form data to solver request format
   */
  transformFormDataToSolverRequest(
    departments: Database['public']['Tables']['departments']['Row'][],
    machines: Database['public']['Tables']['machines']['Row'][],
    workCells: Database['public']['Tables']['work_cells']['Row'][],
    jobInstances: any[]
  ): SolverJobRequest {
    // Build constraint settings from form data
    const constraints: ConstraintSettings = {
      enable_setup_times: true,
      enable_skill_matching: true,
      enable_multi_objective: true,
      max_overtime_hours: 10,
      wip_limits: {}
    }

    // Add WIP limits based on department data
    departments.forEach(dept => {
      if (dept.department_id && dept.is_active) {
        constraints.wip_limits![dept.department_id] = 5 // Default WIP limit
      }
    })

    // Transform job instances
    const instances: JobInstanceRequest[] = jobInstances.map((instance, index) => ({
      instance_id: instance.id || instance.instance_id || `job_${index}`,
      description: instance.description || `Job ${instance.id || index}`,
      due_date: instance.due_date || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      priority: instance.priority || 100
    }))

    return {
      pattern_id: jobInstances[0]?.pattern_id || 'default-pattern',
      instances,
      constraints
    }
  }

  /**
   * Get job status (for async processing)
   */
  async getJobStatus(jobId: string): Promise<ServiceResponse<{ status: string; message: string }>> {
    return this.handleRequest(async () => {
      const response = await fetch(`${this.solverBaseUrl}/api/v1/status/${jobId}`)
      
      if (!response.ok) {
        throw new Error(`Failed to get job status: ${response.status}`)
      }
      
      return await response.json()
    })
  }

  /**
   * Validate solver job request
   */
  private validateJobRequest(request: SolverJobRequest): void {
    if (!request.pattern_id) {
      throw new Error('Pattern ID is required')
    }

    if (!request.instances || request.instances.length === 0) {
      throw new Error('At least one job instance is required')
    }

    for (const instance of request.instances) {
      if (!instance.instance_id) {
        throw new Error('Instance ID is required for all instances')
      }
      if (!instance.due_date) {
        throw new Error('Due date is required for all instances')
      }
      if (instance.priority < 1 || instance.priority > 1000) {
        throw new Error('Priority must be between 1 and 1000')
      }
    }

    // Validate constraints if provided
    if (request.constraints) {
      if (request.constraints.max_overtime_hours && 
          (request.constraints.max_overtime_hours < 0 || request.constraints.max_overtime_hours > 24)) {
        throw new Error('Max overtime hours must be between 0 and 24')
      }
    }
  }

  /**
   * Performance monitoring for solver operations
   */
  async monitorSolverPerformance(operation: string, duration: number, metadata?: any): Promise<void> {
    try {
      await fetch(`${this.solverBaseUrl}/api/v1/performance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          operation,
          duration_ms: duration,
          timestamp: new Date().toISOString(),
          metadata
        })
      })
    } catch (error) {
      console.warn('Failed to record solver performance metrics:', error)
    }
  }

  /**
   * Generic request handler with error handling and monitoring
   */
  protected async handleRequest<T>(operation: () => Promise<T>): Promise<ServiceResponse<T>> {
    const startTime = Date.now()
    
    try {
      const data = await operation()
      const duration = Date.now() - startTime
      
      // Record performance metrics
      await this.monitorSolverPerformance('request', duration)
      
      return {
        data,
        error: null,
        success: true
      }
    } catch (error) {
      const duration = Date.now() - startTime
      await this.monitorSolverPerformance('request_error', duration, { error: error instanceof Error ? error.message : 'Unknown error' })
      
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        success: false
      }
    }
  }
}

// Export singleton instance
export const solverService = new SolverService()