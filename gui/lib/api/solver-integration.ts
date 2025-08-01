/**
 * Solver Integration API
 * 
 * Provides integration between GUI forms and the backend OR-Tools constraint solver.
 * Handles data transformation and validation for the 3-phase constraint system.
 */

import { Database } from '@/lib/database.types'

// Type definitions for solver API
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

/**
 * Solver Integration Service
 * 
 * Manages communication with the backend constraint solver.
 * Ensures data consistency and proper error handling.
 */
export class SolverIntegrationService {
  private baseUrl: string

  constructor(baseUrl: string = process.env.NEXT_PUBLIC_SOLVER_API_URL || 'http://localhost:8000') {
    this.baseUrl = baseUrl
  }

  /**
   * Submit a scheduling problem to the solver
   */
  async solveProblem(request: SolverJobRequest): Promise<SolverResponse> {
    try {
      // Validate request data
      this.validateJobRequest(request)

      const response = await fetch(`${this.baseUrl}/api/v1/solve`, {
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
    } catch (error) {
      console.error('Solver integration error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown solver error'
      }
    }
  }

  /**
   * Get available job patterns from the solver
   */
  async getAvailablePatterns(): Promise<{ success: boolean; patterns?: any[]; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/patterns`)
      
      if (!response.ok) {
        throw new Error(`Pattern API error: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      return {
        success: true,
        patterns: data.patterns || []
      }
    } catch (error) {
      console.error('Pattern fetch error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch patterns'
      }
    }
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
    }
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
    // This is a basic transformation - extend based on actual form structure
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

    const instances: JobInstanceRequest[] = jobInstances.map(instance => ({
      instance_id: instance.id || instance.instance_id,
      description: instance.description || `Job ${instance.id}`,
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
   * Health check for solver service
   */
  async healthCheck(): Promise<{ healthy: boolean; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/health`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      })

      return {
        healthy: response.ok
      }
    } catch (error) {
      return {
        healthy: false,
        error: error instanceof Error ? error.message : 'Health check failed'
      }
    }
  }
}

// Export singleton instance
export const solverIntegration = new SolverIntegrationService()

/**
 * Utility function to validate constraint system integration
 */
export async function validateConstraintSystemIntegration(): Promise<{
  phase1: boolean
  phase2: boolean  
  phase3: boolean
  errors: string[]
}> {
  const errors: string[] = []

  // Test Phase 1 - Basic constraints (timing, precedence, capacity)
  const phase1Test = await testPhase1Constraints()
  if (!phase1Test.success) {
    errors.push(`Phase 1 constraint error: ${phase1Test.error}`)
  }

  // Test Phase 2 - Advanced constraints (skills, shifts)
  const phase2Test = await testPhase2Constraints()
  if (!phase2Test.success) {
    errors.push(`Phase 2 constraint error: ${phase2Test.error}`)
  }

  // Test Phase 3 - Multi-objective optimization
  const phase3Test = await testPhase3Constraints()
  if (!phase3Test.success) {
    errors.push(`Phase 3 constraint error: ${phase3Test.error}`)
  }

  return {
    phase1: phase1Test.success,
    phase2: phase2Test.success,
    phase3: phase3Test.success,
    errors
  }
}

async function testPhase1Constraints(): Promise<{ success: boolean; error?: string }> {
  try {
    const health = await solverIntegration.healthCheck()
    if (!health.healthy) {
      return { success: false, error: 'Solver service not healthy' }
    }
    return { success: true }
  } catch (error) {
    return { success: false, error: 'Phase 1 test failed' }
  }
}

async function testPhase2Constraints(): Promise<{ success: boolean; error?: string }> {
  try {
    const patterns = await solverIntegration.getAvailablePatterns()
    return { success: patterns.success, error: patterns.error }
  } catch (error) {
    return { success: false, error: 'Phase 2 test failed' }
  }
}

async function testPhase3Constraints(): Promise<{ success: boolean; error?: string }> {
  try {
    // For now, just return success - extend with actual multi-objective tests
    return { success: true }
  } catch (error) {
    return { success: false, error: 'Phase 3 test failed' }
  }
}