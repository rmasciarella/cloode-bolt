"use client"

import { useState, useEffect, useRef, useCallback } from 'react'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { MassUploader } from '@/components/ui/mass-uploader'
import { Loader2, Edit, Trash2, Upload, Search, Filter } from 'lucide-react'
import { AdvancedFilter, BulkOperations, useAdvancedTable } from '@/components/ui/advanced-patterns'
import { useFormPerformance } from '@/lib/hooks/use-form-performance'

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
  
  // Performance monitoring setup
  const performanceTracker = useFormPerformance('job-template-form')

  // Advanced table functionality
  const advancedTable = useAdvancedTable(
    jobTemplates,
    (template) => template.pattern_id,
    {
      enableFiltering: true,
      enableBulkOperations: true,
      enableSorting: true
    }
  )

  const filterOptions = [
    { key: 'name', label: 'Name', type: 'text' as const },
    { key: 'description', label: 'Description', type: 'text' as const },
    { key: 'is_active', label: 'Active', type: 'boolean' as const }
  ]

  // Bulk operations handlers
  const handleBulkDelete = async (ids: string[]) => {
    performanceTracker.trackInteraction('click', 'bulk_delete')
    
    try {
      for (const id of ids) {
        const response = await jobTemplateService.delete(id)
        if (!response.success) {
          toast({
            title: "Error",
            description: `Failed to delete job template: ${response.error}`,
            variant: "destructive"
          })
          return
        }
      }
      
      toast({
        title: "Success", 
        description: `Successfully deleted ${ids.length} job templates`
      })
      fetchJobTemplates()
      advancedTable.clearSelection()
    } catch (error) {
      console.error('Error in handleBulkDelete:', error)
    }
  }

  const handleBulkToggleActive = async (ids: string[]) => {
    performanceTracker.trackInteraction('click', 'bulk_toggle_active')
    
    try {
      for (const id of ids) {
        const template = jobTemplates.find(t => t.pattern_id === id)
        if (template) {
          const response = await jobTemplateService.update(id, { is_active: !template.is_active })
          if (!response.success) {
            toast({
              title: "Error",
              description: `Failed to update job template: ${response.error}`,
              variant: "destructive"
            })
            return
          }
        }
      }
      
      toast({
        title: "Success",
        description: `Successfully updated ${ids.length} job templates`
      })
      fetchJobTemplates()
      advancedTable.clearSelection()
    } catch (error) {
      console.error('Error in handleBulkToggleActive:', error)
    }
  }

  const { register, handleSubmit, reset, setValue, watch, formState: { errors, isValidating } } = useForm({
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
    
    try {
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
    } catch (error) {
      console.error('Error in fetchJobTemplates:', error)
    } finally {
      setLoading(false)
    }
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
    const initializeForm = async () => {
      await Promise.all([
        fetchJobTemplates(),
        fetchDepartments()
      ])
    }
    
    initializeForm()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  
  // Track validation errors when form state changes
  useEffect(() => {
    const errorCount = Object.keys(errors).length
    if (errorCount > 3) {
      console.warn(`[FORM-PERF] High validation error count: ${errorCount} errors`)
    }
  }, [errors])

  const onSubmit = async (data: any) => {
    performanceTracker.trackSubmissionStart()
    setIsSubmitting(true)
    
    try {
      // Track validation start time
      performanceTracker.startValidation('solver_parameters')
      
      // Validate solver parameters using the service
      const validationResponse = await jobTemplateService.validateSolverParameters(data.solver_parameters)
      
      // Track validation time
      performanceTracker.trackValidation('solver_parameters', !validationResponse.success)
      
      if (!validationResponse.success) {
        toast({
          title: "Error",
          description: validationResponse.error || "Invalid solver parameters",
          variant: "destructive"
        })
        performanceTracker.trackSubmissionEnd(false)
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
        performanceTracker.trackSubmissionEnd(true)
      } else {
        console.error('Error saving job template:', response.error)
        toast({
          title: "Error",
          description: response.error || "Failed to save job template",
          variant: "destructive"
        })
        performanceTracker.trackSubmissionEnd(false)
      }
    } catch (error) {
      console.error('Error in form submission:', error)
      performanceTracker.trackSubmissionEnd(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = (template: JobTemplate) => {
    performanceTracker.trackInteraction('click', 'edit_template')
    
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
    
    performanceTracker.trackInteraction('click', 'delete_template')

    try {
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
    } catch (error) {
      console.error('Error in handleDelete:', error)
    }
  }

  const handleCancel = () => {
    performanceTracker.trackInteraction('click', 'cancel')
    reset()
    setEditingId(null)
  }

  const sampleJobTemplateData = {
    name: 'Standard Assembly Job',
    description: 'Standard assembly process for product line A',
    department_id: null,
    estimated_duration_minutes: 120,
    priority_weight: 1.0,
    solver_parameters: defaultSolverParameters,
    is_active: true
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="form" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger 
            value="form" 
            onClick={() => performanceTracker.trackInteraction('click', 'button_click')}
          >
            Single Entry
          </TabsTrigger>
          <TabsTrigger 
            value="bulk" 
            onClick={() => performanceTracker.trackInteraction('click', 'button_click')}
          >
            Mass Upload
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="form" className="space-y-6">
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
                  onFocus={() => performanceTracker.trackInteraction('focus', 'field_focus')}
                  onClick={() => performanceTracker.trackInteraction('click', 'button_click')}
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
                  onFocus={() => performanceTracker.trackInteraction('focus', 'field_focus')}
                  onClick={() => performanceTracker.trackInteraction('click', 'button_click')}
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
                  onFocus={() => performanceTracker.trackInteraction('focus', 'field_focus')}
                  onClick={() => performanceTracker.trackInteraction('click', 'button_click')}
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
                  onFocus={() => performanceTracker.trackInteraction('focus', 'field_focus')}
                  onClick={() => performanceTracker.trackInteraction('click', 'button_click')}
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
                onFocus={() => performanceTracker.trackInteraction('focus', 'field_focus')}
                onClick={() => performanceTracker.trackInteraction('click', 'button_click')}
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
                onFocus={() => performanceTracker.trackInteraction('focus', 'field_focus')}
                onClick={() => performanceTracker.trackInteraction('click', 'button_click')}
              />
              {errors.solver_parameters && <p className="text-sm text-red-600">{errors.solver_parameters.message}</p>}
              <p className="text-xs text-gray-500">
                Configure CP-SAT solver parameters for optimal performance. Default values shown above are production-tested.
              </p>
              {isValidating && (
                <div className="flex items-center text-xs text-blue-600">
                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                  Validating parameters...
                </div>
              )}
            </div>


            {/* Action Buttons */}
            <div className="flex justify-end space-x-2 pt-4">
              {editingId && (
                <Button type="button" variant="outline" onClick={handleCancel}>
                  Cancel
                </Button>
              )}
              <Button 
                type="submit" 
                disabled={isSubmitting}
                onClick={() => performanceTracker.trackInteraction('click', 'button_click')}
              >
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingId ? 'Update' : 'Create'} Template
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
        </TabsContent>
        
        <TabsContent value="bulk" className="space-y-6">
          <MassUploader
            tableName="job_optimized_patterns"
            entityName="Job Template"
            sampleData={sampleJobTemplateData}
            onUploadComplete={() => {
              performanceTracker.trackInteraction('click', 'upload_complete')
              fetchJobTemplates()
            }}
            requiredFields={['name']}
            fieldDescriptions={{
              name: 'Template display name',
              description: 'Template description',
              estimated_duration_minutes: 'Expected duration in minutes',
              priority_weight: 'Priority weight (1.0 = normal)',
              solver_parameters: 'JSON object with solver parameters'
            }}
          />
        </TabsContent>
      </Tabs>

      {/* Templates List */}
      <Card>
        <CardHeader>
          <CardTitle>Job Templates ({advancedTable.filteredCount} of {advancedTable.totalCount})</CardTitle>
          <CardDescription>Manage existing job templates with advanced filtering and bulk operations</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Advanced Filter */}
          <AdvancedFilter
            options={filterOptions}
            values={advancedTable.filters}
            onChange={(filters) => {
              performanceTracker.trackInteraction('click', 'filter_change')
              advancedTable.setFilters(filters)
            }}
            placeholder="Search job templates..."
          />

          {/* Bulk Operations */}
          <BulkOperations
            items={advancedTable.filteredItems}
            selectedItems={advancedTable.selectedItems}
            onToggleSelection={(id) => {
              performanceTracker.trackInteraction('click', 'toggle_selection')
              advancedTable.toggleSelection(id)
            }}
            onSelectAll={() => {
              performanceTracker.trackInteraction('click', 'select_all')
              advancedTable.selectAll()
            }}
            onClearSelection={() => {
              performanceTracker.trackInteraction('click', 'clear_selection')
              advancedTable.clearSelection()
            }}
            onBulkDelete={handleBulkDelete}
            onBulkEdit={handleBulkToggleActive}
            getId={(template) => template.pattern_id}
            isSelectionMode={advancedTable.isSelectionMode}
            onEnterSelectionMode={() => {
              performanceTracker.trackInteraction('click', 'enter_selection_mode')
              advancedTable.enterSelectionMode()
            }}
          />

          {loading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : advancedTable.isEmpty ? (
            <p className="text-center text-gray-500 py-4">
              {advancedTable.filters.length > 0 ? 'No job templates match your filters' : 'No job templates found'}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    {advancedTable.isSelectionMode && (
                      <th className="text-left p-2 w-12">
                        <input
                          type="checkbox"
                          checked={advancedTable.selectedItems.size === advancedTable.filteredItems.length}
                          onChange={() => {
                            performanceTracker.trackInteraction('click', 'select_all_toggle')
                            advancedTable.selectedItems.size === advancedTable.filteredItems.length ? advancedTable.clearSelection() : advancedTable.selectAll()
                          }}
                          className="rounded"
                        />
                      </th>
                    )}
                    <th className="text-left p-2 font-medium cursor-pointer hover:bg-gray-50" onClick={() => {
                      performanceTracker.trackInteraction('click', 'sort_by_name')
                      advancedTable.setSortBy('name')
                    }}>Name ↕</th>
                    <th className="text-left p-2 font-medium">Task Count</th>
                    <th className="text-left p-2 font-medium">Description</th>
                    <th className="text-left p-2 font-medium">Status</th>
                    <th className="text-left p-2 font-medium">Created</th>
                    <th className="text-left p-2 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {advancedTable.filteredItems.map((template) => {
                    return (
                      <tr key={template.pattern_id} className="border-b hover:bg-gray-50">
                        {advancedTable.isSelectionMode && (
                          <td className="p-2">
                            <input
                              type="checkbox"
                              checked={advancedTable.selectedItems.has(template.pattern_id)}
                              onChange={() => {
                                performanceTracker.trackInteraction('click', 'row_select')
                                advancedTable.toggleSelection(template.pattern_id)
                              }}
                              className="rounded"
                            />
                          </td>
                        )}
                        <td className="p-2 font-medium">
                          <div>
                            {template.name}
                            {template.description && (
                              <div className="text-xs text-gray-500 truncate max-w-xs">{template.description}</div>
                            )}
                          </div>
                        </td>
                        <td className="p-2">{template.task_count}</td>
                        <td className="p-2">{template.description || '-'}</td>
                        <td className="p-2">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            template.is_active 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {template.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="p-2">
                          {new Date(template.created_at).toLocaleDateString()}
                        </td>
                        <td className="p-2">
                          <div className="flex space-x-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                performanceTracker.trackInteraction('click', 'edit_button')
                                handleEdit(template)
                              }}
                              disabled={loading}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                performanceTracker.trackInteraction('click', 'toggle_active_button')
                                handleBulkToggleActive([template.pattern_id])
                              }}
                              className={template.is_active ? "text-orange-600 hover:bg-orange-50" : "text-green-600 hover:bg-green-50"}
                              disabled={loading}
                            >
                              {template.is_active ? "Deactivate" : "Reactivate"}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                performanceTracker.trackInteraction('click', 'delete_button')
                                handleDelete(template.pattern_id)
                              }}
                              className="text-red-600 hover:bg-red-50"
                              disabled={loading}
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