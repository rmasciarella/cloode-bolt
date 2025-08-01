import { z } from 'zod'

const cellTypes = ['production', 'assembly', 'testing', 'packaging', 'storage', 'maintenance'] as const

export const workCellFormSchema = z.object({
  name: z.string()
    .min(1, 'Work cell name is required')
    .max(255, 'Name must be 255 characters or less'),
  capacity: z.number()
    .int()
    .min(1, 'Capacity must be at least 1')
    .max(1000, 'Capacity cannot exceed 1000'),
  department_id: z.string()
    .optional()
    .transform(val => val === '' || val === 'none' ? undefined : val),
  wip_limit: z.number()
    .int()
    .min(1, 'WIP limit must be at least 1')
    .max(10000, 'WIP limit cannot exceed 10000')
    .optional()
    .transform(val => val === 0 ? undefined : val),
  flow_priority: z.number()
    .int()
    .min(1, 'Flow priority must be at least 1')
    .max(100, 'Flow priority cannot exceed 100'),
  floor_location: z.string()
    .optional()
    .transform(val => val === '' ? undefined : val),
  cell_type: z.enum(cellTypes, {
    errorMap: () => ({ message: 'Please select a valid cell type' })
  }),
  target_utilization: z.number()
    .min(0, 'Target utilization must be between 0 and 100')
    .max(100, 'Target utilization must be between 0 and 100')
    .transform(val => val / 100), // Convert percentage to decimal for database
  calendar_id: z.string()
    .optional()
    .transform(val => val === '' || val === 'none' ? undefined : val),
  average_throughput_per_hour: z.number()
    .min(0, 'Throughput must be non-negative')
    .max(10000, 'Throughput cannot exceed 10000')
    .optional()
    .transform(val => val === 0 ? undefined : val),
  is_active: z.boolean()
})

export type WorkCellFormData = z.infer<typeof workCellFormSchema>
export { cellTypes }