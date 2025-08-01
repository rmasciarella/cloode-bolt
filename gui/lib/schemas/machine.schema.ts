import { z } from 'zod'

export const machineFormSchema = z.object({
  name: z.string()
    .min(1, 'Machine name is required')
    .max(255, 'Name must be 255 characters or less'),
  capacity: z.number()
    .int()
    .min(1, 'Capacity must be at least 1'),
  cost_per_hour: z.number()
    .min(0, 'Cost must be non-negative'),
  department_id: z.string()
    .optional()
    .transform(val => val === '' || val === 'none' ? undefined : val),
  cell_id: z.string()
    .min(1, 'Work cell is required'),
  setup_time_minutes: z.number()
    .int()
    .min(0, 'Setup time must be non-negative'),
  teardown_time_minutes: z.number()
    .int()
    .min(0, 'Teardown time must be non-negative'),
  maintenance_window_start: z.number()
    .int()
    .min(0, 'Time must be non-negative')
    .max(95, 'Maximum 95 time units (23:45)')
    .optional()
    .transform(val => val === 0 ? undefined : val),
  maintenance_window_end: z.number()
    .int()
    .min(0, 'Time must be non-negative')
    .max(95, 'Maximum 95 time units (23:45)')
    .optional()
    .transform(val => val === 0 ? undefined : val),
  last_maintenance_date: z.string()
    .optional()
    .transform(val => val === '' ? undefined : val),
  next_maintenance_due: z.string()
    .optional()
    .transform(val => val === '' ? undefined : val),
  maintenance_interval_hours: z.number()
    .int()
    .min(1, 'Interval must be at least 1 hour'),
  machine_type: z.string()
    .optional()
    .transform(val => val === '' ? undefined : val),
  manufacturer: z.string()
    .optional()
    .transform(val => val === '' ? undefined : val),
  model: z.string()
    .optional()
    .transform(val => val === '' ? undefined : val),
  year_installed: z.number()
    .int()
    .min(1980, 'Year must be 1980 or later')
    .max(new Date().getFullYear() + 5, 'Year cannot be more than 5 years in the future')
    .optional(),
  efficiency_rating: z.number()
    .min(0.1, 'Efficiency must be at least 0.1')
    .max(2.0, 'Efficiency cannot exceed 2.0'),
  average_utilization_percent: z.number()
    .int()
    .min(0, 'Utilization must be non-negative')
    .max(100, 'Utilization cannot exceed 100%')
    .optional(),
  uptime_target_percent: z.number()
    .int()
    .min(0, 'Uptime target must be non-negative')
    .max(100, 'Uptime target cannot exceed 100%'),
  calendar_id: z.string()
    .optional()
    .transform(val => val === '' ? undefined : val),
  is_active: z.boolean()
}).refine(data => {
  if (data.maintenance_window_start !== undefined && data.maintenance_window_end !== undefined) {
    return data.maintenance_window_start < data.maintenance_window_end
  }
  return true
}, {
  message: 'Maintenance window start time must be before end time',
  path: ['maintenance_window_end']
})

export type MachineFormData = z.infer<typeof machineFormSchema>