"use client"

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, Edit, Trash2 } from 'lucide-react'

type SequenceResource = {
  sequence_id: string
  name: string
  description: string | null
  department_id: string | null
  setup_time_minutes: number
  teardown_time_minutes: number
  max_concurrent_jobs: number
  resource_type: string
  priority: number
  is_active: boolean
  created_at: string
}

type Department = {
  department_id: string
  name: string
  code: string
}

type SequenceResourceFormData = {
  sequence_id: string
  name: string
  description: string
  department_id: string
  setup_time_minutes: number
  teardown_time_minutes: number
  max_concurrent_jobs: number
  resource_type: string
  priority: number
  is_active: boolean
}

const resourceTypes = [
  { value: 'exclusive', label: 'Exclusive' },
  { value: 'shared', label: 'Shared' },
  { value: 'pooled', label: 'Pooled' }
]

export default function SequenceResourceForm() {
  const [sequenceResources, setSequenceResources] = useState<SequenceResource[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<SequenceResourceFormData>({
    defaultValues: {
      sequence_id: '',
      name: '',
      description: '',
      department_id: '',
      setup_time_minutes: 0,
      teardown_time_minutes: 0,
      max_concurrent_jobs: 1,
      resource_type: 'exclusive',
      priority: 1,
      is_active: true
    }
  })

  const fetchSequenceResources = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('sequence_resources')
        .select('*')
        .order('name', { ascending: true })

      if (error) throw error
      setSequenceResources(data || [])
    } catch (error) {
      console.error('Error fetching sequence resources:', error)
      toast({
        title: "Error",
        description: "Failed to fetch sequence resources",
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
    fetchSequenceResources()
    fetchDepartments()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const onSubmit = async (data: SequenceResourceFormData) => {
    setIsSubmitting(true)
    try {
      const formData = {
        sequence_id: data.sequence_id,
        name: data.name,
        description: data.description || null,
        department_id: data.department_id === 'none' ? null : data.department_id || null,
        setup_time_minutes: data.setup_time_minutes,
        teardown_time_minutes: data.teardown_time_minutes,
        max_concurrent_jobs: data.max_concurrent_jobs,
        resource_type: data.resource_type,
        priority: data.priority,
        is_active: data.is_active
      }

      if (editingId) {
        const { error } = await supabase
          .from('sequence_resources')
          .update(formData)
          .eq('sequence_id', editingId)

        if (error) throw error

        toast({
          title: "Success",
          description: "Sequence resource updated successfully"
        })
      } else {
        const { error } = await supabase
          .from('sequence_resources')
          .insert([formData])

        if (error) throw error

        toast({
          title: "Success",
          description: "Sequence resource created successfully"
        })
      }

      reset()
      setEditingId(null)
      fetchSequenceResources()
    } catch (error) {
      console.error('Error saving sequence resource:', error)
      toast({
        title: "Error",
        description: "Failed to save sequence resource",
        variant: "destructive"
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = (resource: SequenceResource) => {
    setEditingId(resource.sequence_id)
    setValue('sequence_id', resource.sequence_id)
    setValue('name', resource.name)
    setValue('description', resource.description || '')
    setValue('department_id', resource.department_id || 'none')
    setValue('setup_time_minutes', resource.setup_time_minutes)
    setValue('teardown_time_minutes', resource.teardown_time_minutes)
    setValue('max_concurrent_jobs', resource.max_concurrent_jobs)
    setValue('resource_type', resource.resource_type)
    setValue('priority', resource.priority)
    setValue('is_active', resource.is_active)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this sequence resource?')) return

    try {
      const { error } = await supabase
        .from('sequence_resources')
        .delete()
        .eq('sequence_id', id)

      if (error) throw error

      toast({
        title: "Success",
        description: "Sequence resource deleted successfully"
      })
      fetchSequenceResources()
    } catch (error) {
      console.error('Error deleting sequence resource:', error)
      toast({
        title: "Error",
        description: "Failed to delete sequence resource",
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
          <CardTitle>{editingId ? 'Edit Sequence Resource' : 'Create New Sequence Resource'}</CardTitle>
          <CardDescription>
            {editingId ? 'Update sequence resource information' : 'Add a new sequence resource for exclusive access constraints (e.g., Opto, BAT, QC)'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Sequence ID - Required */}
              <div className="space-y-2">
                <Label htmlFor="sequence_id">Sequence ID *</Label>
                <Input
                  id="sequence_id"
                  {...register('sequence_id', { 
                    required: 'Sequence ID is required',
                    maxLength: { value: 100, message: 'ID must be 100 characters or less' }
                  })}
                  placeholder="e.g., Opto, BAT, QC"
                  disabled={!!editingId}
                />
                {editingId && <p className="text-xs text-gray-500">Sequence ID cannot be changed when editing</p>}
                {errors.sequence_id && <p className="text-sm text-red-600">{errors.sequence_id.message}</p>}
              </div>

              {/* Name - Required */}
              <div className="space-y-2">
                <Label htmlFor="name">Resource Name *</Label>
                <Input
                  id="name"
                  {...register('name', { 
                    required: 'Resource name is required',
                    maxLength: { value: 255, message: 'Name must be 255 characters or less' }
                  })}
                  placeholder="e.g., Optical Testing Sequence"
                />
                {errors.name && <p className="text-sm text-red-600">{errors.name.message}</p>}
              </div>

              {/* Department */}
              <div className="space-y-2">
                <Label htmlFor="department_id">Department</Label>
                <Select 
                  value={watch('department_id') || undefined}
                  onValueChange={(value) => setValue('department_id', value)}
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

              {/* Resource Type */}
              <div className="space-y-2">
                <Label htmlFor="resource_type">Resource Type</Label>
                <Select 
                  value={watch('resource_type') || undefined}
                  onValueChange={(value) => setValue('resource_type', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select resource type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="exclusive">
                      <div>
                        <div className="font-medium">Exclusive</div>
                        <div className="text-xs text-gray-500">One job at a time (e.g., Opto, BAT)</div>
                      </div>
                    </SelectItem>
                    <SelectItem value="shared">
                      <div>
                        <div className="font-medium">Shared</div>
                        <div className="text-xs text-gray-500">Multiple jobs simultaneously (e.g., Oven)</div>
                      </div>
                    </SelectItem>
                    <SelectItem value="pooled">
                      <div>
                        <div className="font-medium">Pooled</div>
                        <div className="text-xs text-gray-500">Pool of identical units (e.g., QC Stations)</div>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">
                  <strong>Exclusive:</strong> Only 1 job uses resource. <strong>Shared:</strong> Multiple jobs share resource. <strong>Pooled:</strong> Jobs assigned to available units.
                </p>
              </div>

              {/* Setup Time */}
              <div className="space-y-2">
                <Label htmlFor="setup_time_minutes">Setup Time (minutes)</Label>
                <Input
                  id="setup_time_minutes"
                  type="number"
                  min="0"
                  {...register('setup_time_minutes', { 
                    valueAsNumber: true,
                    min: { value: 0, message: 'Setup time must be non-negative' }
                  })}
                  placeholder="e.g., 15"
                />
                <p className="text-xs text-gray-500">
                  Time to prepare resource for job (calibration, tool changeover, material loading)
                </p>
                {errors.setup_time_minutes && <p className="text-sm text-red-600">{errors.setup_time_minutes.message}</p>}
              </div>

              {/* Teardown Time */}
              <div className="space-y-2">
                <Label htmlFor="teardown_time_minutes">Teardown Time (minutes)</Label>
                <Input
                  id="teardown_time_minutes"
                  type="number"
                  min="0"
                  {...register('teardown_time_minutes', { 
                    valueAsNumber: true,
                    min: { value: 0, message: 'Teardown time must be non-negative' }
                  })}
                  placeholder="e.g., 10"
                />
                <p className="text-xs text-gray-500">
                  Time to clean/reset resource after job (cleaning, documentation, tool removal)
                </p>
                {errors.teardown_time_minutes && <p className="text-sm text-red-600">{errors.teardown_time_minutes.message}</p>}
              </div>

              {/* Max Concurrent Jobs */}
              <div className="space-y-2">
                <Label htmlFor="max_concurrent_jobs">Max Concurrent Jobs</Label>
                <Input
                  id="max_concurrent_jobs"
                  type="number"
                  min="1"
                  {...register('max_concurrent_jobs', { 
                    valueAsNumber: true,
                    min: { value: 1, message: 'Must allow at least 1 concurrent job' }
                  })}
                  placeholder="e.g., 1"
                />
                <p className="text-xs text-gray-500">
                  Maximum number of jobs that can use this resource simultaneously
                </p>
                {errors.max_concurrent_jobs && <p className="text-sm text-red-600">{errors.max_concurrent_jobs.message}</p>}
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
                <p className="text-xs text-gray-500">Higher numbers = higher priority for conflict resolution</p>
                {errors.priority && <p className="text-sm text-red-600">{errors.priority.message}</p>}
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                {...register('description')}
                placeholder="Detailed description of the sequence resource and its purpose"
                rows={3}
              />
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
                {editingId ? 'Update' : 'Create'} Resource
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Sequence Resources List */}
      <Card>
        <CardHeader>
          <CardTitle>Sequence Resources</CardTitle>
          <CardDescription>Manage existing sequence resources</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : sequenceResources.length === 0 ? (
            <p className="text-center text-gray-500 py-4">No sequence resources found</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">ID</th>
                    <th className="text-left p-2">Name</th>
                    <th className="text-left p-2">Department</th>
                    <th className="text-left p-2">Type</th>
                    <th className="text-left p-2">Max Concurrent</th>
                    <th className="text-left p-2">Setup/Teardown</th>
                    <th className="text-left p-2">Priority</th>
                    <th className="text-left p-2">Status</th>
                    <th className="text-left p-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sequenceResources.map((resource) => {
                    const department = departments.find(d => d.department_id === resource.department_id)
                    return (
                      <tr key={resource.sequence_id} className="border-b hover:bg-gray-50">
                        <td className="p-2 font-medium">{resource.sequence_id}</td>
                        <td className="p-2">{resource.name}</td>
                        <td className="p-2">{department ? `${department.name} (${department.code})` : '-'}</td>
                        <td className="p-2 capitalize">{resource.resource_type}</td>
                        <td className="p-2">{resource.max_concurrent_jobs}</td>
                        <td className="p-2">
                          <div className="text-sm">
                            <div>Setup: {resource.setup_time_minutes}m</div>
                            <div>Teardown: {resource.teardown_time_minutes}m</div>
                          </div>
                        </td>
                        <td className="p-2">{resource.priority}</td>
                        <td className="p-2">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            resource.is_active 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {resource.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="p-2">
                          <div className="flex space-x-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEdit(resource)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDelete(resource.sequence_id)}
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