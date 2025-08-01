// Example: Enhanced form component using Form Hooks
"use client"

import { useState, useEffect, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useFormHooks } from '@/lib/hooks/form.hooks'
import { departmentService } from '@/lib/services'
import { departmentFormSchema, type DepartmentFormData } from '@/lib/schemas'
import { Database } from '@/lib/database.types'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { TimeInput } from '@/components/ui/time-input'
import { getTimeRangeDescription } from '@/lib/timeUtils'
import { Loader2, Edit, Trash2 } from 'lucide-react'

type Department = Database['public']['Tables']['departments']['Row']

export default function EnhancedDepartmentForm() {
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()
  
  // Initialize form hooks
  const formHooks = useFormHooks<DepartmentFormData>('departments', departmentFormSchema)

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<DepartmentFormData>({
    resolver: zodResolver(departmentFormSchema),
    defaultValues: {
      code: '',
      name: '',
      description: '',
      parent_department_id: '',
      cost_center: '',
      default_shift_start: 32,
      default_shift_end: 64,
      overtime_allowed: true,
      is_active: true
    }
  })

  // Register custom hooks for department-specific behavior
  useEffect(() => {
    // Custom validation hook for business rules
    const unregisterValidation = formHooks.register('customValidation', async (data) => {
      const errors: Record<string, string> = {}
      
      // Check for duplicate department codes
      const existingDept = departments.find(d => 
        d.code.toLowerCase() === data.code.toLowerCase() && 
        (!editingId || d.department_id !== editingId)
      )
      if (existingDept) {
        errors.code = 'Department code already exists'
      }
      
      // Validate shift times
      if (data.default_shift_start >= data.default_shift_end) {
        errors.default_shift_end = 'End time must be after start time'
      }
      
      return errors
    })
    
    // Data transformation hook
    const unregisterTransform = formHooks.register('transformSubmitData', async (data, isEditing) => {
      // Log the transformation for audit
      console.log(`Transforming department data for ${isEditing ? 'update' : 'create'}`, data)
      
      return {
        ...data,
        code: data.code.toUpperCase(), // Always uppercase department codes
        parent_department_id: data.parent_department_id === "none" ? null : data.parent_department_id || null,
        cost_center: data.cost_center || null,
        description: data.description || null,
      }
    })
    
    // Before submit hook for confirmation
    const unregisterBeforeSubmit = formHooks.register('beforeSubmit', async (data, isEditing) => {
      if (isEditing) {
        const currentDept = departments.find(d => d.department_id === editingId)
        if (currentDept && currentDept.is_active && !data.is_active) {
          return confirm(`Are you sure you want to deactivate "${currentDept.name}"? This may affect scheduling.`)
        }
      }
      
      // Check for high-impact changes
      if (data.parent_department_id && !isEditing) {
        toast({
          title: "Info",
          description: "Creating department with parent hierarchy - scheduling constraints will be inherited.",
        })
      }
      
      return true
    })
    
    // Success hooks
    const unregisterSuccess = formHooks.register('afterSubmitSuccess', (data, result, isEditing) => {
      toast({
        title: "Success",
        description: `Department ${isEditing ? 'updated' : 'created'} successfully`
      })
      
      // Auto-refresh data
      fetchDepartments()
      
      // Reset form
      reset()
      setEditingId(null)
    })
    
    // Error handling hook
    const unregisterError = formHooks.register('afterSubmitError', (data, error, isEditing) => {
      let errorMessage = error || "Failed to save department"
      let errorDetails = ""
      
      // Enhanced error handling
      if (typeof error === 'string') {
        if (error.includes('foreign key constraint') || error.includes('violates foreign key')) {
          errorMessage = "Cannot save department - data integrity issue"
          errorDetails = "This operation would violate data constraints. Please check related records."
        }
      }
      
      toast({
        title: "Error",
        description: errorDetails || errorMessage,
        variant: "destructive"
      })
    })
    
    // Data loading hooks
    const unregisterBeforeLoad = formHooks.register('beforeDataLoad', async (filters) => {
      console.log('Loading departments with filters:', filters)
      return { ...filters, includeInactive: true }
    })
    
    const unregisterAfterLoad = formHooks.register('afterDataLoad', (data) => {
      console.log(`Loaded ${data.length} departments`)
      if (data.length === 0) {
        toast({
          title: "Info",
          description: "No departments found. Create your first department to get started.",
        })
      }
    })
    
    return () => {
      // Cleanup all hooks
      unregisterValidation()
      unregisterTransform()
      unregisterBeforeSubmit()
      unregisterSuccess()
      unregisterError()
      unregisterBeforeLoad()
      unregisterAfterLoad()
    }
  }, [formHooks, departments, editingId, toast, reset])

  const fetchDepartments = useCallback(async () => {
    setLoading(true)
    
    // Execute data loading hooks
    const filters = await formHooks.execute('beforeDataLoad')
    
    const response = await departmentService.getAll()
    
    if (response.success && response.data) {
      // Transform loaded data through hooks
      const transformedData = await formHooks.execute('transformLoadedData', response.data)
      setDepartments(transformedData || response.data)
      
      // Execute after load hooks
      await formHooks.execute('afterDataLoad', transformedData || response.data)
    } else {
      console.error('Error fetching departments:', response.error)
      toast({
        title: "Error",
        description: response.error || "Failed to fetch departments",
        variant: "destructive"
      })
    }
    setLoading(false)
  }, [formHooks, toast])

  useEffect(() => {
    fetchDepartments()
  }, [fetchDepartments])

  const onSubmit = async (data: DepartmentFormData) => {
    setIsSubmitting(true)
    
    try {
      // Execute custom validation hooks
      const validationErrors = await formHooks.execute('customValidation', data)
      if (Object.keys(validationErrors).length > 0) {
        // Apply validation errors to form
        Object.entries(validationErrors).forEach(([field, message]) => {
          // In a real implementation, you'd set these on the form
          console.error(`Validation error for ${field}: ${message}`)
        })
        setIsSubmitting(false)
        return
      }
      
      // Execute before submit hooks
      const shouldSubmit = await formHooks.execute('beforeSubmit', data, !!editingId)
      if (!shouldSubmit) {
        setIsSubmitting(false)
        return
      }
      
      // Transform data through hooks
      const transformedData = await formHooks.execute('transformSubmitData', data, !!editingId)
      
      // Execute the actual submission
      let response
      if (editingId) {
        // Execute before update hook
        const updateData = await formHooks.execute('beforeUpdate', editingId, transformedData)
        response = await departmentService.update(editingId, updateData || transformedData)
        
        if (response.success) {
          await formHooks.execute('afterUpdate', editingId, updateData || transformedData, response.data)
        }
      } else {
        // Execute before create hook
        const createData = await formHooks.execute('beforeCreate', transformedData)
        response = await departmentService.create(createData || transformedData)
        
        if (response.success) {
          await formHooks.execute('afterCreate', createData || transformedData, response.data)
        }
      }
      
      // Execute result hooks
      if (response.success) {
        await formHooks.execute('afterSubmitSuccess', data, response.data, !!editingId)
      } else {
        await formHooks.execute('afterSubmitError', data, response.error, !!editingId)
      }
    } catch (error) {
      await formHooks.execute('afterSubmitError', data, error, !!editingId)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = async (department: Department) => {
    // Execute before edit hook
    const canEdit = await formHooks.execute('beforeEdit', department)
    if (!canEdit) return
    
    setEditingId(department.department_id)
    setValue('code', department.code)
    setValue('name', department.name)
    setValue('description', department.description || '')
    setValue('parent_department_id', department.parent_department_id || 'none')
    setValue('cost_center', department.cost_center || '')
    setValue('default_shift_start', department.default_shift_start)
    setValue('default_shift_end', department.default_shift_end)
    setValue('overtime_allowed', department.overtime_allowed)
    setValue('is_active', department.is_active)
    
    // Execute after edit hook
    await formHooks.execute('afterEdit', department, { setValue, watch, reset })
  }

  const handleDelete = async (id: string) => {
    const department = departments.find(d => d.department_id === id)
    if (!department) return

    // Execute before delete hook
    const canDelete = await formHooks.execute('beforeDelete', id, department)
    if (!canDelete) return

    const response = await departmentService.delete(id)
    
    if (response.success) {
      await formHooks.execute('afterDelete', id, department)
      toast({
        title: "Success",
        description: `Department "${department.name}" deleted successfully`
      })
      fetchDepartments()
    } else {
      await formHooks.execute('afterSubmitError', department, response.error, false)
    }
  }

  const handleCancel = async () => {
    // Execute before cancel hook
    const canCancel = await formHooks.execute('beforeCancel')
    if (!canCancel) return
    
    reset()
    setEditingId(null)
    
    // Execute after cancel hook
    await formHooks.execute('afterCancel')
  }

  // Filter departments for parent selection (prevent circular references)
  const parentDepartments = departments.filter(dept => {
    if (!editingId) return true
    if (dept.department_id === editingId) return false
    return true
  })

  return (
    <div className="space-y-6">
      {/* Form Card */}
      <Card>
        <CardHeader>
          <CardTitle>{editingId ? 'Edit Department' : 'Create New Department'}</CardTitle>
          <CardDescription>
            {editingId ? 'Update department information and hierarchy' : 'Create a department - use "None (Root Department)" for standalone departments or select a parent for hierarchy'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Form fields remain the same but now enhanced with hooks */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="code">Code *</Label>
                <Input
                  id="code"
                  {...register('code')}
                  placeholder="e.g., production, quality, DEPT_A"
                />
                {errors.code && <p className="text-sm text-red-600">{errors.code.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  {...register('name')}
                  placeholder="e.g., Production Department"
                />
                {errors.name && <p className="text-sm text-red-600">{errors.name.message}</p>}
              </div>

              {/* Parent Department with enhanced options */}
              <div className="space-y-2">
                <Label htmlFor="parent_department_id">Parent Department</Label>
                <Select 
                  value={watch('parent_department_id') || undefined}
                  onValueChange={(value) => setValue('parent_department_id', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select parent department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None (Root Department)</SelectItem>
                    {parentDepartments.map((dept) => (
                      <SelectItem key={dept.department_id} value={dept.department_id}>
                        {dept.name} ({dept.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Other form fields... */}
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-2 pt-4">
              {editingId && (
                <Button type="button" variant="outline" onClick={handleCancel}>
                  Cancel
                </Button>
              )}
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingId ? 'Update' : 'Create'} Department
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Departments List with enhanced functionality */}
      <Card>
        <CardHeader>
          <CardTitle>Departments</CardTitle>
          <CardDescription>Manage existing departments</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : departments.length === 0 ? (
            <p className="text-center text-gray-500 py-4">No departments found</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Code</th>
                    <th className="text-left p-2">Name</th>
                    <th className="text-left p-2">Cost Center</th>
                    <th className="text-left p-2">Shift Times</th>
                    <th className="text-left p-2">Status</th>
                    <th className="text-left p-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {departments.map((department) => (
                    <tr key={department.department_id} className="border-b hover:bg-gray-50">
                      <td className="p-2 font-medium">{department.code}</td>
                      <td className="p-2">{department.name}</td>
                      <td className="p-2">{department.cost_center || '-'}</td>
                      <td className="p-2">
                        {getTimeRangeDescription(department.default_shift_start, department.default_shift_end)}
                      </td>
                      <td className="p-2">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          department.is_active 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {department.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="p-2">
                        <div className="flex space-x-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(department)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDelete(department.department_id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// Example usage: Register department-specific hooks from plugins
/*
// In a plugin file:
import { formHooks } from '@/lib/hooks/form.hooks'

// Add custom validation for department hierarchy depth
formHooks.register('customValidation', async (data) => {
  if (data.parent_department_id && getHierarchyDepth(data.parent_department_id) >= 5) {
    return { parent_department_id: 'Department hierarchy cannot exceed 5 levels' }
  }
  return {}
})

// Add automatic cost center generation
formHooks.register('beforeCreate', async (data) => {
  if (!data.cost_center) {
    return {
      ...data,
      cost_center: `CC-${data.code}-${Date.now().toString().slice(-4)}`
    }
  }
  return data
})

// Add integration with external systems
formHooks.register('afterCreate', async (data, result) => {
  // Sync with ERP system
  await syncWithERP('department', result)
  
  // Send notification to administrators
  await notifyAdmins(`New department created: ${data.name}`)
})
*/