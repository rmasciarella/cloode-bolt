import { z } from 'zod'

export const departmentFormSchema = z.object({
  code: z.string()
    .min(1, 'Department code is required')
    .max(50, 'Code must be 50 characters or less')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Code can only contain letters, numbers, underscores, and hyphens'),
  name: z.string()
    .min(1, 'Department name is required')
    .max(255, 'Name must be 255 characters or less'),
  description: z.string()
    .optional()
    .transform(val => val === '' ? undefined : val),
  parent_department_id: z.string()
    .optional()
    .transform(val => val === '' || val === 'none' ? undefined : val),
  cost_center: z.string()
    .optional()
    .transform(val => val === '' ? undefined : val),
  default_shift_start: z.number()
    .int()
    .min(0, 'Shift start must be a valid time index')
    .max(95, 'Shift start must be a valid time index'),
  default_shift_end: z.number()
    .int()
    .min(0, 'Shift end must be a valid time index')
    .max(95, 'Shift end must be a valid time index'),
  overtime_allowed: z.boolean(),
  is_active: z.boolean()
}).refine(data => data.default_shift_start < data.default_shift_end, {
  message: 'Shift start time must be before end time',
  path: ['default_shift_end']
})

export type DepartmentFormData = z.infer<typeof departmentFormSchema>