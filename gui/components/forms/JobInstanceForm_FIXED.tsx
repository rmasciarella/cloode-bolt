"use client"

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, Edit, Trash2 } from 'lucide-react'

type JobInstance = {
  instance_id: string
  template_id: string  // FIXED: Changed from pattern_id
  name: string
  department_id: string | null
  priority: number
  due_date: string | null
  earliest_start_date: string
  customer_order_id: string | null
  batch_id: string | null
  quantity: number
  estimated_cost: number | null
  actual_cost: number | null
  revenue_value: number | null
  status: string
  estimated_duration_hours: number | null
  actual_duration_hours: number | null
  created_at: string
}

type JobTemplate = {  // FIXED: Changed from JobOptimizedPattern
  template_id: string  // FIXED: Changed from pattern_id
  name: string
}

type Department = {
  department_id: string
  name: string
  code: string
}

type JobInstanceFormData = {
  template_id: string  // FIXED: Changed from pattern_id
  name: string
  department_id: string
  priority: number
  due_date: string
  earliest_start_date: string
  customer_order_id: string
  batch_id: string
  quantity: number
  estimated_cost: number
  revenue_value: number
  status: string
  estimated_duration_hours: number
}

const statusOptions = [
  { value: 'pending', label: 'Pending' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'on_hold', label: 'On Hold' }
]

export default function JobInstanceForm() {
  const [jobInstances, setJobInstances] = useState<JobInstance[]>([])
  const [jobTemplates, setJobTemplates] = useState<JobTemplate[]>([])  // FIXED: Changed from jobOptimizedPatterns
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<JobInstanceFormData>({
    defaultValues: {
      template_id: '',  // FIXED: Changed from pattern_id
      name: '',
      department_id: '',
      priority: 1,
      due_date: '',
      earliest_start_date: new Date().toISOString().split('T')[0],
      customer_order_id: '',
      batch_id: '',
      quantity: 1,
      estimated_cost: 0,
      revenue_value: 0,
      status: 'pending',
      estimated_duration_hours: 0
    }
  })

  const fetchJobInstances = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('job_instances')
        .select(`
          *,
          job_templates!inner(name)
        `)  // FIXED: Changed from job_optimized_patterns!inner(name)
        .order('created_at', { ascending: false })

      if (error) throw error
      setJobInstances(data || [])
    } catch (error) {
      console.error('Error fetching job instances:', error)
      toast({
        title: "Error",
        description: "Failed to fetch job instances",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchJobTemplates = async () => {  // FIXED: Changed from fetchJobOptimizedPatterns
    try {
      const { data, error } = await supabase
        .from('job_templates')  // FIXED: Changed from job_optimized_patterns
        .select('template_id, name')  // FIXED: Changed from pattern_id
        .eq('is_active', true)  // FIXED: Added active filter
        .order('name', { ascending: true })

      if (error) throw error
      setJobTemplates(data || [])  // FIXED: Changed from setJobOptimizedPatterns
    } catch (error) {
      console.error('Error fetching job templates:', error)
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
    fetchJobInstances()
    fetchJobTemplates()  // FIXED: Changed from fetchJobOptimizedPatterns
    fetchDepartments()
  }, [])

  const onSubmit = async (data: JobInstanceFormData) => {
    setIsSubmitting(true)
    try {
      const formData = {
        template_id: data.template_id,  // FIXED: Changed from pattern_id
        name: data.name,
        department_id: data.department_id || null,
        priority: data.priority,
        due_date: data.due_date || null,
        earliest_start_date: data.earliest_start_date,
        customer_order_id: data.customer_order_id || null,
        batch_id: data.batch_id || null,
        quantity: data.quantity,
        estimated_cost: data.estimated_cost || null,
        revenue_value: data.revenue_value || null,
        status: data.status,
        estimated_duration_hours: data.estimated_duration_hours || null
      }

      if (editingId) {
        const { error } = await supabase
          .from('job_instances')
          .update(formData)
          .eq('instance_id', editingId)

        if (error) throw error

        toast({
          title: "Success",
          description: "Job instance updated successfully"
        })
      } else {
        const { error } = await supabase
          .from('job_instances')
          .insert([formData])

        if (error) throw error

        toast({
          title: "Success",
          description: "Job instance created successfully"
        })
      }

      reset()
      setEditingId(null)
      fetchJobInstances()
    } catch (error) {
      console.error('Error saving job instance:', error)
      toast({
        title: "Error",
        description: "Failed to save job instance",
        variant: "destructive"
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = (instance: JobInstance) => {
    setEditingId(instance.instance_id)
    setValue('template_id', instance.template_id)  // FIXED: Changed from pattern_id
    setValue('name', instance.name)
    setValue('department_id', instance.department_id || '')
    setValue('priority', instance.priority)
    setValue('due_date', instance.due_date ? instance.due_date.split('T')[0] : '')
    setValue('earliest_start_date', instance.earliest_start_date.split('T')[0])
    setValue('customer_order_id', instance.customer_order_id || '')
    setValue('batch_id', instance.batch_id || '')
    setValue('quantity', instance.quantity)
    setValue('estimated_cost', instance.estimated_cost || 0)
    setValue('revenue_value', instance.revenue_value || 0)
    setValue('status', instance.status)
    setValue('estimated_duration_hours', instance.estimated_duration_hours || 0)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this job instance?')) return

    try {
      const { error } = await supabase
        .from('job_instances')
        .delete()
        .eq('instance_id', id)

      if (error) throw error

      toast({
        title: "Success",
        description: "Job instance deleted successfully"
      })
      fetchJobInstances()
    } catch (error) {
      console.error('Error deleting job instance:', error)
      toast({
        title: "Error",
        description: "Failed to delete job instance",
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
          <CardTitle>{editingId ? 'Edit Job Instance' : 'Create New Job Instance'}</CardTitle>
          <CardDescription>
            {editingId ? 'Update job instance information' : 'Create a new job instance based on a job template'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Template - Required */}
              <div className="space-y-2">
                <Label htmlFor="template_id">Job Template *</Label>
                <Select 
                  value={watch('template_id')} 
                  onValueChange={(value) => setValue('template_id', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select job template" />
                  </SelectTrigger>
                  <SelectContent>
                    {jobTemplates.map((template) => (
                      <SelectItem key={template.template_id} value={template.template_id}>
                        {template.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!watch('template_id') && <p className="text-sm text-red-600">Job template is required</p>}
              </div>

              {/* Name - Required */}
              <div className="space-y-2">
                <Label htmlFor="name">Job Instance Name *</Label>
                <Input
                  id="name"
                  {...register('name', { 
                    required: 'Job instance name is required',
                    maxLength: { value: 255, message: 'Name must be 255 characters or less' }
                  })}
                  placeholder="e.g., Production Run #001"
                />
                {errors.name && <p className="text-sm text-red-600">{errors.name.message}</p>}
              </div>

              {/* Department */}
              <div className="space-y-2">
                <Label htmlFor="department_id">Department</Label>
                <Select 
                  value={watch('department_id')} 
                  onValueChange={(value) => setValue('department_id', value === 'none' ? '' : value)}
                >
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

              {/* Status */}
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select 
                  value={watch('status')} 
                  onValueChange={(value) => setValue('status', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((status) => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Priority */}
              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Input
                  id="priority"
                  type="number"
                  min="1"
                  {...register('priority', { 
                    valueAsNumber: true,
                    min: { value: 1, message: 'Priority must be at least 1' }
                  })}
                />
                <p className="text-xs text-gray-500">Higher numbers = higher priority</p>
                {errors.priority && <p className="text-sm text-red-600">{errors.priority.message}</p>}
              </div>

              {/* Quantity */}
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  {...register('quantity', { 
                    valueAsNumber: true,
                    min: { value: 1, message: 'Quantity must be at least 1' }
                  })}
                />
                {errors.quantity && <p className="text-sm text-red-600">{errors.quantity.message}</p>}
              </div>

              {/* Due Date - CRITICAL for minimize lateness objective */}
              <div className="space-y-2">
                <Label htmlFor="due_date">Due Date</Label>
                <Input
                  id="due_date"
                  type="date"
                  {...register('due_date')}
                />
                <p className="text-xs text-gray-500">Critical for minimize lateness objective</p>
              </div>

              {/* Earliest Start Date */}
              <div className="space-y-2">
                <Label htmlFor="earliest_start_date">Earliest Start Date</Label>
                <Input
                  id="earliest_start_date"
                  type="date"
                  {...register('earliest_start_date', {
                    required: 'Earliest start date is required'
                  })}
                />
                {errors.earliest_start_date && <p className="text-sm text-red-600">{errors.earliest_start_date.message}</p>}
              </div>

              {/* Customer Order ID */}
              <div className="space-y-2">
                <Label htmlFor="customer_order_id">Customer Order ID</Label>
                <Input
                  id="customer_order_id"
                  {...register('customer_order_id')}
                  placeholder="e.g., ORD-2024-001"
                />
              </div>

              {/* Batch ID */}
              <div className="space-y-2">
                <Label htmlFor="batch_id">Batch ID</Label>
                <Input
                  id="batch_id"
                  {...register('batch_id')}
                  placeholder="e.g., BATCH-001"
                />
              </div>

              {/* Estimated Cost */}
              <div className="space-y-2">
                <Label htmlFor="estimated_cost">Estimated Cost ($)</Label>
                <Input
                  id="estimated_cost"
                  type="number"
                  min="0"
                  step="0.01"
                  {...register('estimated_cost', { 
                    valueAsNumber: true,
                    min: { value: 0, message: 'Cost must be non-negative' }
                  })}
                />
                {errors.estimated_cost && <p className="text-sm text-red-600">{errors.estimated_cost.message}</p>}
              </div>

              {/* Revenue Value */}
              <div className="space-y-2">
                <Label htmlFor="revenue_value">Revenue Value ($)</Label>
                <Input
                  id="revenue_value"
                  type="number"
                  min="0"
                  step="0.01"
                  {...register('revenue_value', { 
                    valueAsNumber: true,
                    min: { value: 0, message: 'Revenue must be non-negative' }
                  })}
                />
                {errors.revenue_value && <p className="text-sm text-red-600">{errors.revenue_value.message}</p>}
              </div>

              {/* Estimated Duration */}
              <div className="space-y-2">
                <Label htmlFor="estimated_duration_hours">Estimated Duration (hours)</Label>
                <Input
                  id="estimated_duration_hours"
                  type="number"
                  min="0"
                  step="0.1"
                  {...register('estimated_duration_hours', { 
                    valueAsNumber: true,
                    min: { value: 0, message: 'Duration must be non-negative' }
                  })}
                />
                {errors.estimated_duration_hours && <p className="text-sm text-red-600">{errors.estimated_duration_hours.message}</p>}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-2 pt-4">
              {editingId && (
                <Button type="button" variant="outline" onClick={handleCancel}>
                  Cancel
                </Button>
              )}
              <Button type="submit" disabled={isSubmitting || !watch('template_id')}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingId ? 'Update' : 'Create'} Job Instance
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Job Instances List */}
      <Card>
        <CardHeader>
          <CardTitle>Job Instances</CardTitle>
          <CardDescription>Manage existing job instances</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : jobInstances.length === 0 ? (
            <p className="text-center text-gray-500 py-4">No job instances found</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Name</th>
                    <th className="text-left p-2">Template</th>
                    <th className="text-left p-2">Department</th>
                    <th className="text-left p-2">Priority</th>
                    <th className="text-left p-2">Due Date</th>
                    <th className="text-left p-2">Quantity</th>
                    <th className="text-left p-2">Status</th>
                    <th className="text-left p-2">Est. Cost</th>
                    <th className="text-left p-2">Revenue</th>
                    <th className="text-left p-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {jobInstances.map((instance: any) => {
                    const department = departments.find(d => d.department_id === instance.department_id)
                    return (
                      <tr key={instance.instance_id} className="border-b hover:bg-gray-50">
                        <td className="p-2 font-medium">
                          <div>
                            {instance.name}
                            {instance.customer_order_id && (
                              <div className="text-xs text-gray-500">Order: {instance.customer_order_id}</div>
                            )}
                          </div>
                        </td>
                        <td className="p-2">{instance.job_templates?.name || 'Unknown'}</td>
                        <td className="p-2">{department ? `${department.name} (${department.code})` : '-'}</td>
                        <td className="p-2">{instance.priority}</td>
                        <td className="p-2">
                          {instance.due_date ? new Date(instance.due_date).toLocaleDateString() : '-'}
                        </td>
                        <td className="p-2">{instance.quantity}</td>
                        <td className="p-2">
                          <span className={`px-2 py-1 rounded-full text-xs capitalize ${
                            instance.status === 'completed' 
                              ? 'bg-green-100 text-green-800'
                              : instance.status === 'in_progress'
                              ? 'bg-blue-100 text-blue-800'
                              : instance.status === 'cancelled'
                              ? 'bg-red-100 text-red-800'
                              : instance.status === 'on_hold'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {instance.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="p-2">
                          {instance.estimated_cost ? `$${instance.estimated_cost.toFixed(2)}` : '-'}
                        </td>
                        <td className="p-2">
                          {instance.revenue_value ? `$${instance.revenue_value.toFixed(2)}` : '-'}
                        </td>
                        <td className="p-2">
                          <div className="flex space-x-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEdit(instance)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDelete(instance.instance_id)}
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