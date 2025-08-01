// Export all services from a central location
export { BaseService } from './base.service'
export { DepartmentService, departmentService } from './department.service'
export { JobTemplateService, jobTemplateService } from './job-template.service'
export { WorkCellService, workCellService } from './work-cell.service'
export { MachineService, machineService } from './machine.service'
export { SolverService, solverService } from './solver.service'

// Export types
export type { ServiceResponse, ServiceError } from './base.service'
export type { 
  SolverJobRequest, 
  JobInstanceRequest, 
  ConstraintSettings,
  SolverResponse,
  SolutionResult,
  TaskAssignment,
  ResourceUtilization,
  PerformanceMetrics,
  PatternInfo,
  ValidationResult
} from './solver.service'