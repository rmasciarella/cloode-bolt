"use client"

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, Edit, Trash2 } from 'lucide-react'

type Operator = {
  operator_id: string
  name: string
  employee_number: string | null
  department_id: string | null
  hourly_rate: number
  max_hours_per_day: number
  max_hours_per_week: number
  overtime_rate_multiplier: number
  employment_status: string
  efficiency_rating: number
  quality_score: number
  safety_score: number
  is_active: boolean
  created_at: string
}

type Department = {
  department_id: string
  name: string
  code: string
}

type OperatorFormData = {
  name: string
  employee_number: string
  department_id: string
  hourly_rate: number
  max_hours_per_day: number
  max_hours_per_week: number
  overtime_rate_multiplier: number
  employment_status: string
  efficiency_rating: number
  quality_score: number
  safety_score: number
  hire_date: string
  is_active: boolean
}

const employmentStatuses = [
  { value: 'active', label: 'Active' },
  { value: 'on_leave', label: 'On Leave' },
  { value: 'terminated', label: 'Terminated' },
  { value: 'retired', label: 'Retired' }
]

export default function OperatorForm() {
  const [operators, setOperators] = useState<Operator[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<OperatorFormData>({
    defaultValues: {
      name: '',
      employee_number: '',
      department_id: '',
      hourly_rate: 25.00,
      max_hours_per_day: 8,
      max_hours_per_week: 40,
      overtime_rate_multiplier: 1.5,
      employment_status: 'active',
      efficiency_rating: 1.00,
      quality_score: 1.00,
      safety_score: 1.00,
      hire_date: '',
      is_active: true
    }
  })

  const fetchOperators = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('operators')
        .select('*')
        .order('name', { ascending: true })

      if (error) throw error
      setOperators(data || [])
    } catch (error) {
      console.error('Error fetching operators:', error)
      toast({
        title: "Error",
        description: "Failed to fetch operators",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchDepartments = async () => {
    try {
      const { data, error } = await supabase
        .from('departments')
        .select('department_id, name, code')
        .eq('is_active', true)
        .order('name', { ascending: true })

      if (error) throw error
      setDepartments(data || [])
    } catch (error) {
      console.error('Error fetching departments:', error)
    }
  }

  useEffect(() => {
    fetchOperators()
    fetchDepartments()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const onSubmit = async (data: OperatorFormData) => {
    setIsSubmitting(true)
    try {
      const formData = {
        name: data.name,
        employee_number: data.employee_number || null,
        department_id: data.department_id || null,
        hourly_rate: data.hourly_rate,
        max_hours_per_day: data.max_hours_per_day,
        max_hours_per_week: data.max_hours_per_week,
        overtime_rate_multiplier: data.overtime_rate_multiplier,
        employment_status: data.employment_status,
        efficiency_rating: data.efficiency_rating,
        quality_score: data.quality_score,
        safety_score: data.safety_score,
        hire_date: data.hire_date || null,
        is_active: data.is_active
      }

      if (editingId) {
        const { error } = await supabase
          .from('operators')
          .update(formData)
          .eq('operator_id', editingId)

        if (error) throw error

        toast({
          title: "Success",
          description: "Operator updated successfully"
        })
      } else {
        const { error } = await supabase
          .from('operators')
          .insert([formData])

        if (error) throw error

        toast({
          title: "Success",
          description: "Operator created successfully"
        })
      }

      reset()
      setEditingId(null)
      fetchOperators()
    } catch (error) {
      console.error('Error saving operator:', error)
      toast({
        title: "Error",
        description: "Failed to save operator",
        variant: "destructive"
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = (operator: Operator) => {
    setEditingId(operator.operator_id)
    setValue('name', operator.name)
    setValue('employee_number', operator.employee_number || '')
    setValue('department_id', operator.department_id || '')
    setValue('hourly_rate', operator.hourly_rate)
    setValue('max_hours_per_day', operator.max_hours_per_day)
    setValue('max_hours_per_week', operator.max_hours_per_week)
    setValue('overtime_rate_multiplier', operator.overtime_rate_multiplier)
    setValue('employment_status', operator.employment_status)
    setValue('efficiency_rating', operator.efficiency_rating)
    setValue('quality_score', operator.quality_score)
    setValue('safety_score', operator.safety_score)
    setValue('is_active', operator.is_active)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this operator?')) return

    try {
      const { error } = await supabase
        .from('operators')
        .delete()
        .eq('operator_id', id)

      if (error) throw error

      toast({
        title: "Success",
        description: "Operator deleted successfully"
      })
      fetchOperators()
    } catch (error) {
      console.error('Error deleting operator:', error)
      toast({
        title: "Error",
        description: "Failed to delete operator",
        variant: "destructive"
      })
    }
  }

  const handleCancel = () => {
    reset()
    setEditingId(null)
  }

  return (
    <div className="space-y-6">
      {/* Form Card */}
      <Card>
        <CardHeader>
          <CardTitle>{editingId ? 'Edit Operator' : 'Create New Operator'}</CardTitle>
          <CardDescription>
            {editingId ? 'Update operator information' : 'Add a new operator to the production system'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Name - Required */}
              <div className="space-y-2">
                <Label htmlFor="name">Operator Name *</Label>
                <Input
                  id="name"
                  {...register('name', { 
                    required: 'Operator name is required',
                    maxLength: { value: 255, message: 'Name must be 255 characters or less' }
                  })}
                  placeholder="e.g., John Smith"
                />
                {errors.name && <p className="text-sm text-red-600">{errors.name.message}</p>}
              </div>

              {/* Employee Number */}
              <div className="space-y-2">
                <Label htmlFor="employee_number">Employee Number</Label>
                <Input
                  id="employee_number"
                  {...register('employee_number')}
                  placeholder="e.g., EMP-001"
                />
              </div>

              {/* Department */}
              <div className="space-y-2">
                <Label htmlFor="department_id">Department</Label>
                <Select onValueChange={(value) => setValue('department_id', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Department</SelectItem>
                    {departments.map((dept) => (
                      <SelectItem key={dept.department_id} value={dept.department_id}>
                        {dept.name} ({dept.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Employment Status */}
              <div className="space-y-2">
                <Label htmlFor="employment_status">Employment Status</Label>
                <Select onValueChange={(value) => setValue('employment_status', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {employmentStatuses.map((status) => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Hourly Rate */}
              <div className="space-y-2">
                <Label htmlFor="hourly_rate">Hourly Rate ($)</Label>
                <Input
                  id="hourly_rate"
                  type="number"
                  min="0"
                  step="0.01"
                  {...register('hourly_rate', { 
                    valueAsNumber: true,
                    min: { value: 0, message: 'Rate must be non-negative' }
                  })}
                />
                {errors.hourly_rate && <p className="text-sm text-red-600">{errors.hourly_rate.message}</p>}
              </div>

              {/* Max Hours Per Day */}
              <div className="space-y-2">
                <Label htmlFor="max_hours_per_day">Max Hours Per Day</Label>
                <Input
                  id="max_hours_per_day"
                  type="number"
                  min="1"
                  max="24"
                  {...register('max_hours_per_day', { 
                    valueAsNumber: true,
                    min: { value: 1, message: 'Must be at least 1 hour' },
                    max: { value: 24, message: 'Cannot exceed 24 hours' }
                  })}
                />
                {errors.max_hours_per_day && <p className="text-sm text-red-600">{errors.max_hours_per_day.message}</p>}
              </div>

              {/* Max Hours Per Week */}
              <div className="space-y-2">
                <Label htmlFor="max_hours_per_week">Max Hours Per Week</Label>
                <Input
                  id="max_hours_per_week"
                  type="number"
                  min="1"
                  max="168"
                  {...register('max_hours_per_week', { 
                    valueAsNumber: true,
                    min: { value: 1, message: 'Must be at least 1 hour' },
                    max: { value: 168, message: 'Cannot exceed 168 hours per week' }
                  })}
                />
                {errors.max_hours_per_week && <p className="text-sm text-red-600">{errors.max_hours_per_week.message}</p>}
              </div>

              {/* Overtime Rate Multiplier */}
              <div className="space-y-2">
                <Label htmlFor="overtime_rate_multiplier">Overtime Rate Multiplier</Label>
                <Input
                  id="overtime_rate_multiplier"
                  type="number"
                  min="1"
                  step="0.1"
                  {...register('overtime_rate_multiplier', { 
                    valueAsNumber: true,
                    min: { value: 1, message: 'Multiplier must be at least 1.0' }
                  })}
                />
                {errors.overtime_rate_multiplier && <p className="text-sm text-red-600">{errors.overtime_rate_multiplier.message}</p>}
              </div>

              {/* Efficiency Rating */}
              <div className="space-y-2">
                <Label htmlFor="efficiency_rating">Efficiency Rating</Label>
                <Input
                  id="efficiency_rating"
                  type="number"
                  min="0"
                  step="0.01"
                  {...register('efficiency_rating', { 
                    valueAsNumber: true,
                    min: { value: 0, message: 'Rating must be non-negative' }
                  })}
                />
                <p className="text-xs text-gray-500">1.0 = standard efficiency, &gt;1.0 = above average</p>
                {errors.efficiency_rating && <p className="text-sm text-red-600">{errors.efficiency_rating.message}</p>}
              </div>

              {/* Quality Score */}
              <div className="space-y-2">
                <Label htmlFor="quality_score">Quality Score</Label>
                <Input
                  id="quality_score"
                  type="number"
                  min="0"
                  step="0.01"
                  {...register('quality_score', { 
                    valueAsNumber: true,
                    min: { value: 0, message: 'Score must be non-negative' }
                  })}
                />
                <p className="text-xs text-gray-500">1.0 = standard quality, &gt;1.0 = above average</p>
                {errors.quality_score && <p className="text-sm text-red-600">{errors.quality_score.message}</p>}
              </div>

              {/* Safety Score */}
              <div className="space-y-2">
                <Label htmlFor="safety_score">Safety Score</Label>
                <Input
                  id="safety_score"
                  type="number"
                  min="0"
                  step="0.01"
                  {...register('safety_score', { 
                    valueAsNumber: true,
                    min: { value: 0, message: 'Score must be non-negative' }
                  })}
                />
                <p className="text-xs text-gray-500">1.0 = standard safety, &gt;1.0 = above average</p>
                {errors.safety_score && <p className="text-sm text-red-600">{errors.safety_score.message}</p>}
              </div>

              {/* Hire Date */}
              <div className="space-y-2">
                <Label htmlFor="hire_date">Hire Date</Label>
                <Input
                  id="hire_date"
                  type="date"
                  {...register('hire_date')}
                />
              </div>
            </div>

            {/* Active Checkbox */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_active"
                checked={watch('is_active')}
                onCheckedChange={(checked) => setValue('is_active', checked as boolean)}
              />
              <Label htmlFor="is_active">Active</Label>
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
                {editingId ? 'Update' : 'Create'} Operator
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Operators List */}
      <Card>
        <CardHeader>
          <CardTitle>Operators</CardTitle>
          <CardDescription>Manage existing operators</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : operators.length === 0 ? (
            <p className="text-center text-gray-500 py-4">No operators found</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Name</th>
                    <th className="text-left p-2">Employee #</th>
                    <th className="text-left p-2">Department</th>
                    <th className="text-left p-2">Rate/Hour</th>
                    <th className="text-left p-2">Max Hours</th>
                    <th className="text-left p-2">Ratings</th>
                    <th className="text-left p-2">Status</th>
                    <th className="text-left p-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {operators.map((operator) => {
                    const department = departments.find(d => d.department_id === operator.department_id)
                    return (
                      <tr key={operator.operator_id} className="border-b hover:bg-gray-50">
                        <td className="p-2 font-medium">{operator.name}</td>
                        <td className="p-2">{operator.employee_number || '-'}</td>
                        <td className="p-2">{department ? `${department.name} (${department.code})` : '-'}</td>
                        <td className="p-2">${operator.hourly_rate.toFixed(2)}</td>
                        <td className="p-2">
                          <div className="text-sm">
                            <div>{operator.max_hours_per_day}h/day</div>
                            <div className="text-gray-500">{operator.max_hours_per_week}h/week</div>
                          </div>
                        </td>
                        <td className="p-2">
                          <div className="text-sm">
                            <div>Eff: {operator.efficiency_rating.toFixed(2)}</div>
                            <div>Qual: {operator.quality_score.toFixed(2)}</div>
                            <div>Safe: {operator.safety_score.toFixed(2)}</div>
                          </div>
                        </td>
                        <td className="p-2">
                          <div className="flex flex-col space-y-1">
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              operator.employment_status === 'active' 
                                ? 'bg-green-100 text-green-800' 
                                : operator.employment_status === 'on_leave'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {operator.employment_status.replace('_', ' ')}
                            </span>
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              operator.is_active 
                                ? 'bg-blue-100 text-blue-800' 
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {operator.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                        </td>
                        <td className="p-2">
                          <div className="flex space-x-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEdit(operator)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDelete(operator.operator_id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}