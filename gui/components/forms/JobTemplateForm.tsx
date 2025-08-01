"use client"

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { jobTemplateService, departmentService } from '@/lib/services'
import { jobTemplateFormSchema, type JobTemplateFormData } from '@/lib/schemas'
import { Database } from '@/lib/database.types'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, Edit, Trash2 } from 'lucide-react'

type JobTemplate = Database['public']['Tables']['job_optimized_patterns']['Row']
type Department = Database['public']['Tables']['departments']['Row']

const defaultSolverParameters = {
  "num_search_workers": 8,
  "max_time_in_seconds": 60,
  "linearization_level": 1,
  "search_branching": "FIXED_SEARCH",
  "cp_model_presolve": true,
  "repair_hint": true
}

export default function JobTemplateForm() {
  const [jobTemplates, setJobTemplates] = useState<JobTemplate[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm({
    resolver: zodResolver(jobTemplateFormSchema),
    defaultValues: {
      name: '',
      description: '',
      solver_parameters: JSON.stringify(defaultSolverParameters, null, 2),
      task_count: 1,
      total_min_duration_minutes: 60,
      critical_path_length_minutes: 60
    }
  })

  const fetchJobTemplates = async () => {
    setLoading(true)
    const response = await jobTemplateService.getAll()
    
    if (response.success && response.data) {
      setJobTemplates(response.data)
    } else {
      console.error('Error fetching job templates:', response.error)
      toast({
        title: "Error",
        description: response.error || "Failed to fetch job templates",
        variant: "destructive"
      })
    }
    setLoading(false)
  }

  const fetchDepartments = async () => {
    const response = await departmentService.getAll(true) // activeOnly = true
    
    if (response.success && response.data) {
      setDepartments(response.data)
    } else {
      console.error('Error fetching departments:', response.error)
    }
  }

  useEffect(() => {
    fetchJobTemplates()
    fetchDepartments()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const onSubmit = async (data: any) => {
    setIsSubmitting(true)
    
    // Validate solver parameters using the service
    const validationResponse = await jobTemplateService.validateSolverParameters(data.solver_parameters)
    if (!validationResponse.success) {
      toast({
        title: "Error",
        description: validationResponse.error || "Invalid solver parameters",
        variant: "destructive"
      })
      setIsSubmitting(false)
      return
    }

    const formData = {
      name: data.name,
      description: data.description || null,
      solver_parameters: data.solver_parameters, // Already parsed by Zod schema
      task_count: data.task_count,
      total_min_duration_minutes: data.total_min_duration_minutes,
      critical_path_length_minutes: data.critical_path_length_minutes
    }

    let response
    if (editingId) {
      response = await jobTemplateService.update(editingId, formData)
    } else {
      response = await jobTemplateService.create(formData)
    }

    if (response.success) {
      toast({
        title: "Success",
        description: `Job template ${editingId ? 'updated' : 'created'} successfully`
      })
      reset()
      setEditingId(null)
      fetchJobTemplates()
    } else {
      console.error('Error saving job template:', response.error)
      toast({
        title: "Error",
        description: response.error || "Failed to save job template",
        variant: "destructive"
      })
    }
    
    setIsSubmitting(false)
  }

  const handleEdit = (template: JobTemplate) => {
    setEditingId(template.pattern_id)
    setValue('name', template.name)
    setValue('description', template.description || '')
    setValue('solver_parameters', JSON.stringify(template.solver_parameters, null, 2))
    setValue('task_count', template.task_count || 1)
    setValue('total_min_duration_minutes', template.total_min_duration_minutes || 60)
    setValue('critical_path_length_minutes', template.critical_path_length_minutes || 60)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this job template?')) return

    const response = await jobTemplateService.delete(id)
    
    if (response.success) {
      toast({
        title: "Success",
        description: "Job template deleted successfully"
      })
      fetchJobTemplates()
    } else {
      console.error('Error deleting job template:', response.error)
      toast({
        title: "Error",
        description: response.error || "Failed to delete job template",
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
          <CardTitle>{editingId ? 'Edit Job Template' : 'Create New Job Template'}</CardTitle>
          <CardDescription>
            {editingId ? 'Update job template information' : 'Add a reusable job template for manufacturing scheduling'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Name - Required */}
              <div className="space-y-2">
                <Label htmlFor="name">Template Name *</Label>
                <Input
                  id="name"
                  {...register('name')}
                  placeholder="e.g., Standard Manufacturing Template"
                />
                {errors.name && <p className="text-sm text-red-600">{errors.name.message}</p>}
              </div>


              {/* Task Count */}
              <div className="space-y-2">
                <Label htmlFor="task_count">Task Count *</Label>
                <Input
                  id="task_count"
                  type="number"
                  min="1"
                  {...register('task_count', { valueAsNumber: true })}
                  placeholder="1"
                />
                <p className="text-xs text-gray-500">Number of tasks in this pattern</p>
                {errors.task_count && <p className="text-sm text-red-600">{errors.task_count.message}</p>}
              </div>

              {/* Total Min Duration */}
              <div className="space-y-2">
                <Label htmlFor="total_min_duration_minutes">Total Min Duration (minutes)</Label>
                <Input
                  id="total_min_duration_minutes"
                  type="number"
                  min="0"
                  {...register('total_min_duration_minutes', { valueAsNumber: true })}
                  placeholder="60"
                />
                <p className="text-xs text-gray-500">Sum of minimum task durations</p>
                {errors.total_min_duration_minutes && <p className="text-sm text-red-600">{errors.total_min_duration_minutes.message}</p>}
              </div>

              {/* Critical Path Length */}
              <div className="space-y-2">
                <Label htmlFor="critical_path_length_minutes">Critical Path Length (minutes)</Label>
                <Input
                  id="critical_path_length_minutes"
                  type="number"
                  min="0"
                  {...register('critical_path_length_minutes', { valueAsNumber: true })}
                  placeholder="60"
                />
                <p className="text-xs text-gray-500">Minimum time to complete pattern (longest path)</p>
                {errors.critical_path_length_minutes && <p className="text-sm text-red-600">{errors.critical_path_length_minutes.message}</p>}
              </div>

            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                {...register('description')}
                placeholder="Template description and use cases"
                rows={3}
              />
            </div>

            {/* Blessed Solver Parameters */}
            <div className="space-y-2">
              <Label htmlFor="solver_parameters">Blessed Solver Parameters (JSON) *</Label>
              <Textarea
                id="solver_parameters"
                {...register('solver_parameters')}
                rows={8}
                className="font-mono text-sm"
                placeholder={JSON.stringify(defaultSolverParameters, null, 2)}
              />
              {errors.solver_parameters && <p className="text-sm text-red-600">{errors.solver_parameters.message}</p>}
              <p className="text-xs text-gray-500">
                Configure CP-SAT solver parameters for optimal performance. Default values shown above are production-tested.
              </p>
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
                {editingId ? 'Update' : 'Create'} Template
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Templates List */}
      <Card>
        <CardHeader>
          <CardTitle>Job Templates</CardTitle>
          <CardDescription>Manage existing job templates</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : jobTemplates.length === 0 ? (
            <p className="text-center text-gray-500 py-4">No job templates found</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Name</th>
                    <th className="text-left p-2">Task Count</th>
                    <th className="text-left p-2">Description</th>
                    <th className="text-left p-2">Created</th>
                    <th className="text-left p-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {jobTemplates.map((template) => {
                    return (
                      <tr key={template.pattern_id} className="border-b hover:bg-gray-50">
                        <td className="p-2 font-medium">{template.name}</td>
                        <td className="p-2">{template.task_count}</td>
                        <td className="p-2">{template.description || '-'}</td>
                        <td className="p-2">
                          {new Date(template.created_at).toLocaleDateString()}
                        </td>
                        <td className="p-2">
                          <div className="flex space-x-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEdit(template)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDelete(template.pattern_id)}
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