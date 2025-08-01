/**
 * Enhanced Job Template Form
 * Showcases all implemented Phase 2-4 features:
 * - Performance monitoring with existing service hooks
 * - Error boundaries for resilient UI
 * - Custom hooks for data management
 * - Real-time updates with conflict resolution
 * - Advanced UI patterns (filtering, bulk operations)
 */

"use client"

import { useState, useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { jobTemplateFormSchema } from '@/lib/schemas'
import { Database } from '@/lib/database.types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, Edit, Trash2, Copy, AlertCircle, CheckCircle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

// New enhanced hooks and components
import { useJobTemplates, useCreateJobTemplate, useUpdateJobTemplate, useDeleteJobTemplate, useDepartments } from '@/lib/hooks/custom-hooks'
import { useRealtime, useOptimisticRealtime } from '@/lib/realtime/manager'
import { AdvancedFilter, BulkOperations, useAdvancedTable } from '@/components/ui/advanced-patterns'
import { FormErrorBoundary, useAsyncErrorHandler } from '@/components/error-boundary'
import { usePerformanceMonitor } from '@/lib/performance'

type JobTemplate = Database['public']['Tables']['job_optimized_patterns']['Row']

const defaultSolverParameters = {
  "num_search_workers": 8,
  "max_time_in_seconds": 60,
  "linearization_level": 1,
  "search_branching": "FIXED_SEARCH",
  "cp_model_presolve": true,
  "repair_hint": true
}

const filterOptions = [
  { key: 'name', label: 'Name', type: 'text' as const },
  { key: 'task_count', label: 'Task Count', type: 'number' as const },
  { key: 'total_min_duration_minutes', label: 'Duration (min)', type: 'number' as const },
  { key: 'created_at', label: 'Created', type: 'text' as const }
]

export default function JobTemplateFormEnhanced() {
  const [editingId, setEditingId] = useState<string | null>(null)
  
  // Enhanced data fetching with custom hooks
  const { 
    data: jobTemplates = [], 
    isLoading, 
    isError, 
    error,
    refetch 
  } = useJobTemplates()
  
  const { data: departments = [] } = useDepartments()
  
  // Mutation hooks with optimistic updates
  const createMutation = useCreateJobTemplate()
  const updateMutation = useUpdateJobTemplate()
  const deleteMutation = useDeleteJobTemplate()
  
  // Real-time updates with conflict resolution
  const { connectionStatus, isConnected } = useRealtime<JobTemplate>('job_optimized_patterns', {
    conflictResolution: { strategy: 'server-wins' },
    onInsert: (record) => {
      console.log('New job template added:', record.name)
    },
    onUpdate: (record, oldRecord) => {
      console.log('Job template updated:', record.name)
    },
    onDelete: (oldRecord) => {
      console.log('Job template deleted:', oldRecord.name)
    }
  })
  
  // Optimistic updates
  const { applyOptimisticUpdate, clearOptimisticUpdate } = useOptimisticRealtime<JobTemplate>('job_optimized_patterns')
  
  // Performance monitoring
  const performanceMonitor = usePerformanceMonitor('JobTemplateFormEnhanced')
  
  // Error handling
  const { wrapAsync } = useAsyncErrorHandler()
  
  // Advanced table functionality
  const table = useAdvancedTable(jobTemplates, (item) => item.pattern_id, {
    enableFiltering: true,
    enableBulkOperations: true,
    enableSorting: true
  })

  // Form handling
  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm({
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

  // Performance metrics display
  const performanceStats = useMemo(() => {
    const formMetrics = performanceMonitor.getFormMetrics()
    return {
      totalQueries: formMetrics.totalOperations,
      averageQueryTime: formMetrics.submissionTimes.length > 0 
        ? formMetrics.submissionTimes.reduce((a, b) => a + b, 0) / formMetrics.submissionTimes.length 
        : 0,
      slowQueries: formMetrics.submissionTimes.filter(time => time > 1000).length
    }
  }, [performanceMonitor])

  const onSubmit = wrapAsync(async (data: any) => {
    const formData = {
      name: data.name,
      description: data.description || null,
      solver_parameters: data.solver_parameters,
      task_count: data.task_count,
      total_min_duration_minutes: data.total_min_duration_minutes,
      critical_path_length_minutes: data.critical_path_length_minutes
    }

    if (editingId) {
      // Apply optimistic update
      applyOptimisticUpdate(editingId, (old) => ({ ...old, ...formData }), ['jobTemplates'])
      
      await updateMutation.mutateAsync({ id: editingId, data: formData })
      clearOptimisticUpdate(editingId)
    } else {
      await createMutation.mutateAsync(formData)
    }

    reset()
    setEditingId(null)
  }, 'Job Template Form Submission')

  const handleEdit = (template: JobTemplate) => {
    setEditingId(template.pattern_id)
    setValue('name', template.name)
    setValue('description', template.description || '')
    setValue('solver_parameters', JSON.stringify(template.solver_parameters, null, 2))
    setValue('task_count', template.task_count || 1)
    setValue('total_min_duration_minutes', template.total_min_duration_minutes || 60)
    setValue('critical_path_length_minutes', template.critical_path_length_minutes || 60)
  }

  const handleDelete = wrapAsync(async (id: string) => {
    if (!confirm('Are you sure you want to delete this job template?')) return
    await deleteMutation.mutateAsync(id)
  }, 'Job Template Deletion')

  const handleBulkDelete = wrapAsync(async (ids: string[]) => {
    if (!confirm(`Are you sure you want to delete ${ids.length} job templates?`)) return
    
    // Delete in parallel with error handling
    const results = await Promise.allSettled(
      ids.map(id => deleteMutation.mutateAsync(id))
    )
    
    const failed = results.filter(r => r.status === 'rejected').length
    if (failed > 0) {
      console.error(`${failed} deletions failed`)
    }
    
    table.clearSelection()
  }, 'Bulk Job Template Deletion')

  const handleBulkEdit = (ids: string[]) => {
    // For job templates, bulk edit could toggle active status or modify solver parameters
    // For now, just log the selected IDs - this can be extended later
    console.log('Bulk edit requested for job templates:', ids)
    // Could open a bulk edit dialog or perform bulk operations
  }

  const handleCancel = () => {
    reset()
    setEditingId(null)
  }

  const isSubmitting = createMutation.isLoading || updateMutation.isLoading

  return (
    <FormErrorBoundary 
      formName="JobTemplate"
      onFormError={(error, errorInfo) => {
        console.error('Form error:', error, errorInfo)
      }}
    >
      <div className="space-y-6">
        {/* Performance and Connection Status */}
        {process.env.NODE_ENV === 'development' && (
          <Card className="border-blue-200 bg-blue-50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-blue-800">Development Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center gap-4 text-xs">
                <Badge variant={isConnected ? "default" : "destructive"} className="text-xs">
                  Real-time: {connectionStatus}
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  Queries: {performanceStats.totalQueries}
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  Avg: {Math.round(performanceStats.averageQueryTime)}ms
                </Badge>
                {performanceStats.slowQueries > 0 && (
                  <Badge variant="destructive" className="text-xs">
                    Slow: {performanceStats.slowQueries}
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Error Display */}
        {isError && error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error.message}
            </AlertDescription>
          </Alert>
        )}

        {/* Form Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {editingId ? 'Edit Job Template' : 'Create New Job Template'}
              {isConnected && (
                <Badge variant="outline" className="text-xs">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Live
                </Badge>
              )}
            </CardTitle>
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

        {/* Enhanced Templates List with Advanced Features */}
        <Card>
          <CardHeader>
            <CardTitle>Job Templates</CardTitle>
            <CardDescription>
              Manage existing job templates with advanced filtering and bulk operations
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Advanced Filtering */}
            <AdvancedFilter
              options={filterOptions}
              values={table.filters}
              onChange={table.setFilters}
              placeholder="Search job templates..."
            />

            {/* Bulk Operations */}
            <BulkOperations
              items={table.filteredItems}
              selectedItems={table.selectedItems}
              onToggleSelection={table.toggleSelection}
              onSelectAll={() => table.selectAll(table.filteredItems, (item) => item.pattern_id)}
              onClearSelection={table.clearSelection}
              onBulkDelete={handleBulkDelete}
              onBulkEdit={handleBulkEdit}
              getId={(item) => item.pattern_id}
              isSelectionMode={table.isSelectionMode}
              onEnterSelectionMode={table.enterSelectionMode}
            />

            {/* Results Summary */}
            {Object.keys(table.filters).length > 0 && (
              <div className="text-sm text-muted-foreground">
                Showing {table.filteredCount} of {table.totalCount} templates
              </div>
            )}

            {/* Templates Table */}
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : table.isEmpty ? (
              <div className="text-center py-8 text-muted-foreground">
                {Object.keys(table.filters).length > 0 ? 
                  'No templates match your search criteria' : 
                  'No job templates found'
                }
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b">
                      {table.isSelectionMode && <th className="text-left p-2 w-12"></th>}
                      <th className="text-left p-2">Name</th>
                      <th className="text-left p-2">Task Count</th>
                      <th className="text-left p-2">Duration</th>
                      <th className="text-left p-2">Description</th>
                      <th className="text-left p-2">Created</th>
                      <th className="text-left p-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {table.filteredItems.map((template) => (
                      <tr key={template.pattern_id} className="border-b hover:bg-gray-50">
                        {table.isSelectionMode && (
                          <td className="p-2">
                            <input
                              type="checkbox"
                              checked={table.selectedItems.has(template.pattern_id)}
                              onChange={() => table.toggleSelection(template.pattern_id)}
                            />
                          </td>
                        )}
                        <td className="p-2 font-medium">{template.name}</td>
                        <td className="p-2">{template.task_count}</td>
                        <td className="p-2">{template.total_min_duration_minutes}min</td>
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
                              disabled={deleteMutation.isLoading}
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
    </FormErrorBoundary>
  )
}