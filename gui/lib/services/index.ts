// Export all services from a central location
export { BaseService } from './base.service'
export { DepartmentService, departmentService } from './department.service'
export { JobTemplateService, jobTemplateService } from './job-template.service'
export { WorkCellService, workCellService } from './work-cell.service'

// Export types
export type { ServiceResponse, ServiceError } from './base.service'