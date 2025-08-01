import { z } from 'zod'

// Custom JSON schema validator
const jsonSchema = z.string()
  .min(1, 'JSON is required')
  .refine((val) => {
    try {
      JSON.parse(val)
      return true
    } catch {
      return false
    }
  }, 'Must be valid JSON')
  .transform((val) => {
    try {
      return JSON.parse(val)
    } catch {
      throw new Error('Invalid JSON')
    }
  })

// Solver parameters schema
const solverParametersSchema = z.object({
  num_search_workers: z.number().int().min(1).max(16).optional(),
  max_time_in_seconds: z.number().min(1).max(3600).optional(),
  linearization_level: z.number().int().min(0).max(2).optional(),
  search_branching: z.enum(['FIXED_SEARCH', 'AUTOMATIC_SEARCH', 'PORTFOLIO_SEARCH']).optional(),
  cp_model_presolve: z.boolean().optional(),
  repair_hint: z.boolean().optional(),
  max_preprocessing_time: z.number().min(0).optional(),
  search_strategy: z.string().optional(),
  use_fast_restart: z.boolean().optional(),
  cp_model_probing_level: z.number().int().min(0).max(3).optional()
}).strict() // Prevent unknown properties

export const jobTemplateFormSchema = z.object({
  name: z.string()
    .min(1, 'Template name is required')
    .max(255, 'Name must be 255 characters or less'),
  description: z.string()
    .optional()
    .transform(val => val === '' ? undefined : val),
  solver_parameters: jsonSchema
    .pipe(solverParametersSchema),
  task_count: z.number()
    .int()
    .min(1, 'Must have at least 1 task')
    .max(1000, 'Task count cannot exceed 1000'),
  total_min_duration_minutes: z.number()
    .int()
    .min(0, 'Duration must be non-negative')
    .max(10080, 'Duration cannot exceed 1 week (10080 minutes)'),
  critical_path_length_minutes: z.number()
    .int()
    .min(0, 'Length must be non-negative')
    .max(10080, 'Length cannot exceed 1 week (10080 minutes)')
}).refine(data => data.critical_path_length_minutes <= data.total_min_duration_minutes, {
  message: 'Critical path length cannot exceed total duration',
  path: ['critical_path_length_minutes']
})

export type JobTemplateFormData = z.infer<typeof jobTemplateFormSchema>