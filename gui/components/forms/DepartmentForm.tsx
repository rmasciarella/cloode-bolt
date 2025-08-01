"use client"

import { useState, useEffect, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
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
import { indexToTime12, getTimeRangeDescription } from '@/lib/timeUtils'
import { Loader2, Plus, Edit, Trash2 } from 'lucide-react'

type Department = Database['public']['Tables']['departments']['Row']

export default function DepartmentForm() {
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<DepartmentFormData>({
    resolver: zodResolver(departmentFormSchema),
    defaultValues: {
      code: '',
      name: '',
      description: '',
      parent_department_id: '',
      cost_center: '',
      default_shift_start: 32, // 8 AM
      default_shift_end: 64,   // 4 PM
      overtime_allowed: true,
      is_active: true
    }
  })

  const fetchDepartments = useCallback(async () => {
    setLoading(true)
    const response = await departmentService.getAll()
    
    if (response.success && response.data) {
      setDepartments(response.data)
    } else {
      console.error('Error fetching departments:', response.error)
      toast({
        title: "Error",
        description: response.error || "Failed to fetch departments",
        variant: "destructive"
      })
    }
    setLoading(false)
  }, [toast])

  useEffect(() => {
    fetchDepartments()
  }, [fetchDepartments])

  const onSubmit = async (data: DepartmentFormData) => {
    setIsSubmitting(true)
    
    // Ensure required fields are present
    const submitData = {
      ...data,
      code: data.code || '',
      name: data.name || ''
    }
    
    let response
    if (editingId) {
      response = await departmentService.update(editingId, submitData)
    } else {
      response = await departmentService.create(submitData)
    }

    if (response.success) {
      toast({
        title: "Success",
        description: `Department ${editingId ? 'updated' : 'created'} successfully`
      })
      reset()
      setEditingId(null)
      fetchDepartments()
    } else {
      console.error('Error saving department:', response.error)
      toast({
        title: "Error",
        description: response.error || "Failed to save department",
        variant: "destructive"
      })
    }
    
    setIsSubmitting(false)
  }

  const handleEdit = (department: Department) => {
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
  }

  const handleDelete = async (id: string) => {
    const department = departments.find(d => d.department_id === id)
    if (!department) return

    if (!confirm(`Are you sure you want to delete "${department.name}"?\n\nThis action cannot be undone.`)) return

    const response = await departmentService.delete(id)
    
    if (response.success) {
      toast({
        title: "Success",
        description: `Department "${department.name}" deleted successfully`
      })
      fetchDepartments()
    } else {
      console.error('Error deleting department:', response.error)
      
      let errorMessage = response.error || "Failed to delete department"
      let errorDetails = ""
      
      // Check for common constraint violation errors
      if (response.error?.includes('foreign key constraint') || 
          response.error?.includes('violates foreign key')) {
        errorMessage = "Cannot delete department - it's still in use"
        errorDetails = "This department has related records (job instances, operators, etc.). Either delete those first or deactivate this department instead."
      } else if (response.error?.includes('dependent')) {
        errorMessage = "Cannot delete department - has dependencies"
        errorDetails = "Other departments or records depend on this one. Consider deactivating instead."
      }

      toast({
        title: "Error",
        description: errorDetails || errorMessage,
        variant: "destructive"
      })
    }
  }

  const handleToggleActive = async (id: string) => {
    const department = departments.find(d => d.department_id === id)
    if (!department) return

    const newStatus = !department.is_active
    const action = newStatus ? 'reactivate' : 'deactivate'
    
    if (!confirm(`Are you sure you want to ${action} "${department.name}"?`)) return

    const response = await departmentService.toggleActive(id)
    
    if (response.success) {
      toast({
        title: "Success",
        description: `Department "${department.name}" ${newStatus ? 'reactivated' : 'deactivated'} successfully`
      })
      fetchDepartments()
    } else {
      console.error(`Error ${action}ing department:`, response.error)
      toast({
        title: "Error",
        description: response.error || `Failed to ${action} department`,
        variant: "destructive"
      })
    }
  }

  const handleCancel = () => {
    reset()
    setEditingId(null)
  }


  // Allow all departments as potential parents, but prevent circular references
  const parentDepartments = departments.filter(dept => {
    // When creating new department, show all departments
    if (!editingId) return true
    
    // When editing, exclude self to prevent self-reference
    if (dept.department_id === editingId) return false
    
    // TODO: Add circular reference prevention logic here
    // For now, just prevent direct self-reference
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Code - Required */}
              <div className="space-y-2">
                <Label htmlFor="code">Code *</Label>
                <Input
                  id="code"
                  {...register('code', { 
                    required: 'Department code is required',
                    maxLength: { value: 50, message: 'Code must be 50 characters or less' }
                  })}
                  placeholder="e.g., production, quality, DEPT_A"
                />
                {errors.code && <p className="text-sm text-red-600">{errors.code.message}</p>}
              </div>

              {/* Name - Required */}
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  {...register('name', { 
                    required: 'Department name is required',
                    maxLength: { value: 255, message: 'Name must be 255 characters or less' }
                  })}
                  placeholder="e.g., Production Department"
                />
                {errors.name && <p className="text-sm text-red-600">{errors.name.message}</p>}
              </div>

              {/* Parent Department */}
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
                <p className="text-xs text-gray-500">
                  <strong>For single department use:</strong> Select &quot;None (Root Department)&quot; to make this a top-level department.<br/>
                  <strong>For hierarchy:</strong> Child departments inherit scheduling constraints from parent.
                </p>
              </div>

              {/* Cost Center */}
              <div className="space-y-2">
                <Label htmlFor="cost_center">Cost Center Code</Label>
                <Input
                  id="cost_center"
                  {...register('cost_center')}
                  placeholder="e.g., CC-PROD-001"
                />
                <p className="text-xs text-gray-500">
                  Optional: For financial tracking and cost allocation (not currently mapped to solver constraints)
                </p>
              </div>

              {/* Shift Start Time */}
              <TimeInput
                label="Default Shift Start Time"
                value={watch('default_shift_start') || 32}
                onChange={(index) => setValue('default_shift_start', index)}
                id="default_shift_start"
                placeholder="Select start time"
                helperText="Default start time for this department's shifts"
                required
              />

              {/* Shift End Time */}
              <TimeInput
                label="Default Shift End Time"
                value={watch('default_shift_end') || 64}
                onChange={(index) => setValue('default_shift_end', index)}
                id="default_shift_end"
                placeholder="Select end time"
                helperText="Default end time for this department's shifts"
                required
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                {...register('description')}
                placeholder="Department description and responsibilities"
                rows={3}
              />
            </div>

            {/* Checkboxes */}
            <div className="flex flex-col space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="overtime_allowed"
                  checked={watch('overtime_allowed')}
                  onCheckedChange={(checked) => setValue('overtime_allowed', checked as boolean)}
                />
                <Label htmlFor="overtime_allowed">Overtime Allowed</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="is_active"
                  checked={watch('is_active')}
                  onCheckedChange={(checked) => setValue('is_active', checked as boolean)}
                />
                <Label htmlFor="is_active">Active</Label>
              </div>
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

      {/* Departments List */}
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
                            onClick={() => handleToggleActive(department.department_id)}
                            className={department.is_active ? "text-orange-600 hover:bg-orange-50" : "text-green-600 hover:bg-green-50"}
                          >
                            {department.is_active ? "Deactivate" : "Reactivate"}
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