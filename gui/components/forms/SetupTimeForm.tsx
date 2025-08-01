"use client"

import { useState, useEffect, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import { usePerformanceMonitor, performanceUtils } from '@/hooks/use-performance-monitor'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { MassUploader } from '@/components/ui/mass-uploader'
import { PerformanceDashboard } from '@/components/ui/performance-dashboard'
import { Loader2, Edit, Trash2, Upload } from 'lucide-react'

type SetupTime = {
  setup_time_id: string
  from_optimized_task_id: string
  to_optimized_task_id: string
  machine_resource_id: string
  setup_time_minutes: number
  setup_type: string
  complexity_level: string
  requires_operator_skill: string | null
  requires_certification: boolean
  requires_supervisor_approval: boolean
  setup_cost: number
  efficiency_impact_percent: number
  created_at: string
}

type OptimizedTask = {
  optimized_task_id: string
  name: string
  pattern_id: string
  pattern_name: string
}

type Machine = {
  machine_resource_id: string
  name: string
}

type SetupTimeFormData = {
  from_optimized_task_id: string
  to_optimized_task_id: string
  machine_resource_id: string
  setup_time_minutes: number
  setup_type: string
  complexity_level: string
  requires_operator_skill: string
  requires_certification: boolean
  requires_supervisor_approval: boolean
  setup_cost: number
  efficiency_impact_percent: number
  product_family_from: string
  product_family_to: string
}

const setupTypes = [
  { value: 'standard', label: 'Standard' },
  { value: 'complex', label: 'Complex' },
  { value: 'tooling_change', label: 'Tooling Change' },
  { value: 'calibration', label: 'Calibration' },
  { value: 'cleaning', label: 'Cleaning' }
]

const complexityLevels = [
  { value: 'simple', label: 'Simple' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'complex', label: 'Complex' },
  { value: 'expert_required', label: 'Expert Required' }
]

const skillLevels = [
  { value: 'NOVICE', label: 'Novice' },
  { value: 'COMPETENT', label: 'Competent' },
  { value: 'PROFICIENT', label: 'Proficient' },
  { value: 'EXPERT', label: 'Expert' }
]


export default function SetupTimeForm() {
  const [setupTimes, setSetupTimes] = useState<SetupTime[]>([])
  const [templateTasks, setTemplateTasks] = useState<OptimizedTask[]>([])
  const [machines, setMachines] = useState<Machine[]>([])
  const [loading, setLoading] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()
  const monitor = usePerformanceMonitor('SetupTimeForm')

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<SetupTimeFormData>({
    defaultValues: {
      from_optimized_task_id: '',
      to_optimized_task_id: '',
      machine_resource_id: '',
      setup_time_minutes: 15,
      setup_type: 'standard',
      complexity_level: 'simple',
      requires_operator_skill: '',
      requires_certification: false,
      requires_supervisor_approval: false,
      setup_cost: 0,
      efficiency_impact_percent: 0,
      product_family_from: '',
      product_family_to: ''
    }
  })

  // Performance monitoring for field validation
  const validateField = useCallback((fieldName: string, value: any) => {
    const startTime = performance.now()
    let isValid = true
    let error = ''

    try {
      switch (fieldName) {
        case 'setup_time_minutes':
          isValid = value >= 0
          error = isValid ? '' : 'Setup time must be non-negative'
          break
        case 'setup_cost':
          isValid = value >= 0
          error = isValid ? '' : 'Cost must be non-negative'
          break
        case 'efficiency_impact_percent':
          isValid = value >= 0 && value <= 100
          error = isValid ? '' : 'Impact must be between 0 and 100%'
          break
        default:
          isValid = true
      }
    } catch (err) {
      isValid = false
      error = String(err)
    }

    const duration = performance.now() - startTime
    monitor.recordValidation(fieldName, duration, isValid, error)
    
    return { isValid, error }
  }, [monitor])

  const fetchSetupTimes = async () => {
    setLoading(true)
    monitor.startTimer('fetch_setup_times')
    
    try {
      const { result } = await performanceUtils.measureAsync(
        async () => {
          const { data, error } = await supabase
            .from('optimized_task_setup_times')
            .select(`*`)
            .limit(10)

          if (error) throw error
          return data || []
        },
        'SetupTimeForm',
        'supabase_fetch_setup_times',
        { table: 'optimized_task_setup_times', limit: 10 }
      )
      
      setSetupTimes(result)
      monitor.endTimer('fetch_setup_times', 'fetch_setup_times_complete', true)
    } catch (error) {
      const errorMsg = String(error)
      console.error('Error fetching setup times:', error)
      monitor.endTimer('fetch_setup_times', 'fetch_setup_times_error', false, errorMsg)
      monitor.recordError(errorMsg, 'fetch_setup_times')
      
      toast({
        title: "Error",
        description: "Failed to fetch setup times",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchTemplateTasks = async () => {
    try {
      const { result } = await performanceUtils.measureAsync(
        async () => {
          const { data, error } = await supabase
            .from('optimized_tasks')
            .select(`
              optimized_task_id,
              name,
              pattern_id,
              job_optimized_patterns!inner(name)
            `)
            .order('name', { ascending: true })

          if (error) throw error
          
          const formattedTasks = data?.map(task => ({
            optimized_task_id: task.optimized_task_id,
            name: task.name,
            pattern_id: task.pattern_id,
            pattern_name: (task.job_optimized_patterns as any)?.name || 'Unknown Pattern'
          })) || []
          
          return formattedTasks
        },
        'SetupTimeForm',
        'supabase_fetch_template_tasks',
        { table: 'optimized_tasks', orderBy: 'name' }
      )
      
      setTemplateTasks(result)
    } catch (error) {
      const errorMsg = String(error)
      console.error('Error fetching template tasks:', error)
      monitor.recordError(errorMsg, 'fetch_template_tasks')
    }
  }

  const fetchMachines = async () => {
    try {
      const { result } = await performanceUtils.measureAsync(
        async () => {
          const { data, error } = await supabase
            .from('machines')
            .select('machine_resource_id, name')
            .eq('is_active', true)
            .order('name', { ascending: true })

          if (error) throw error
          return data || []
        },
        'SetupTimeForm',
        'supabase_fetch_machines',
        { table: 'machines', filter: 'is_active=true' }
      )
      
      setMachines(result)
    } catch (error) {
      const errorMsg = String(error)
      console.error('Error fetching machines:', error)
      monitor.recordError(errorMsg, 'fetch_machines')
    }
  }

  useEffect(() => {
    const loadFormData = async () => {
      monitor.startTimer('form_load')
      
      try {
        await Promise.all([
          fetchSetupTimes(),
          fetchTemplateTasks(),
          fetchMachines()
        ])
        
        const loadDuration = monitor.endTimer('form_load', 'form_initial_load', true)
        monitor.recordFormLoad(loadDuration)
      } catch (error) {
        const errorMsg = String(error)
        monitor.endTimer('form_load', 'form_initial_load', false, errorMsg)
        monitor.recordError(errorMsg, 'form_initial_load')
      }
    }
    
    loadFormData()
  }, [monitor]) // eslint-disable-line react-hooks/exhaustive-deps

  const onSubmit = async (data: SetupTimeFormData) => {
    setIsSubmitting(true)
    monitor.startTimer('form_submission')
    
    try {
      // Client-side validation with performance tracking
      const validationStart = performance.now()
      
      if (data.from_optimized_task_id === data.to_optimized_task_id) {
        const validationDuration = performance.now() - validationStart
        monitor.recordValidation('task_ids_different', validationDuration, false, 'From and To tasks must be different')
        monitor.endTimer('form_submission', 'form_submission_validation_error', false, 'From and To tasks must be different')
        
        toast({
          title: "Error",
          description: "From and To tasks must be different",
          variant: "destructive"
        })
        setIsSubmitting(false)
        return
      }
      
      const validationDuration = performance.now() - validationStart
      monitor.recordValidation('form_validation', validationDuration, true)

      const formData = {
        from_optimized_task_id: data.from_optimized_task_id,
        to_optimized_task_id: data.to_optimized_task_id,
        machine_resource_id: data.machine_resource_id,
        setup_time_minutes: data.setup_time_minutes,
        setup_type: data.setup_type,
        complexity_level: data.complexity_level,
        requires_operator_skill: data.requires_operator_skill || null,
        requires_certification: data.requires_certification,
        requires_supervisor_approval: data.requires_supervisor_approval,
        setup_cost: data.setup_cost,
        efficiency_impact_percent: data.efficiency_impact_percent,
        product_family_from: data.product_family_from || null,
        product_family_to: data.product_family_to || null,
      }

      const { duration } = await performanceUtils.measureAsync(
        async () => {
          if (editingId) {
            const { error } = await supabase
              .from('optimized_task_setup_times')
              .update(formData)
              .eq('setup_time_id', editingId)

            if (error) throw error
            
            return 'update'
          } else {
            const { error } = await supabase
              .from('optimized_task_setup_times')
              .insert([formData])

            if (error) throw error
            
            return 'insert'
          }
        },
        'SetupTimeForm',
        editingId ? 'supabase_update_setup_time' : 'supabase_insert_setup_time',
        { 
          editing: !!editingId,
          setup_time_minutes: data.setup_time_minutes,
          setup_type: data.setup_type,
          complexity_level: data.complexity_level
        }
      )

      const totalDuration = monitor.endTimer('form_submission', 'form_submission_success', true)
      monitor.recordSubmission(totalDuration, true, undefined, {
        operation: editingId ? 'update' : 'create',
        database_duration: duration,
        total_duration: totalDuration
      })

      toast({
        title: "Success",
        description: editingId ? "Setup time updated successfully" : "Setup time created successfully"
      })

      reset()
      setEditingId(null)
      fetchSetupTimes()
    } catch (error) {
      const errorMsg = String(error)
      console.error('Error saving setup time:', error)
      
      const totalDuration = monitor.endTimer('form_submission', 'form_submission_error', false, errorMsg)
      monitor.recordSubmission(totalDuration, false, errorMsg, {
        operation: editingId ? 'update' : 'create'
      })
      
      toast({
        title: "Error",
        description: "Failed to save setup time",
        variant: "destructive"
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = (setupTime: SetupTime) => {
    monitor.recordInteraction('edit_button_click', undefined, { setup_time_id: setupTime.setup_time_id })
    
    monitor.startTimer('populate_form')
    setEditingId(setupTime.setup_time_id)
    setValue('from_optimized_task_id', setupTime.from_optimized_task_id)
    setValue('to_optimized_task_id', setupTime.to_optimized_task_id)
    setValue('machine_resource_id', setupTime.machine_resource_id)
    setValue('setup_time_minutes', setupTime.setup_time_minutes)
    setValue('setup_type', setupTime.setup_type)
    setValue('complexity_level', setupTime.complexity_level)
    setValue('requires_certification', setupTime.requires_certification)
    setValue('setup_cost', setupTime.setup_cost)
    monitor.endTimer('populate_form', 'populate_form_for_edit', true)
  }

  const handleDelete = async (id: string) => {
    monitor.recordInteraction('delete_button_click', undefined, { setup_time_id: id })
    
    if (!confirm('Are you sure you want to delete this setup time?')) {
      monitor.recordInteraction('delete_cancelled')
      return
    }
    
    monitor.recordInteraction('delete_confirmed')
    monitor.startTimer('delete_operation')

    try {
      const { duration } = await performanceUtils.measureAsync(
        async () => {
          const { error } = await supabase
            .from('optimized_task_setup_times')
            .delete()
            .eq('setup_time_id', id)

          if (error) throw error
        },
        'SetupTimeForm',
        'supabase_delete_setup_time',
        { setup_time_id: id }
      )

      monitor.endTimer('delete_operation', 'delete_operation_success', true)

      toast({
        title: "Success",
        description: "Setup time deleted successfully"
      })
      fetchSetupTimes()
    } catch (error) {
      const errorMsg = String(error)
      console.error('Error deleting setup time:', error)
      monitor.endTimer('delete_operation', 'delete_operation_error', false, errorMsg)
      monitor.recordError(errorMsg, 'delete_setup_time')
      
      toast({
        title: "Error",
        description: "Failed to delete setup time",
        variant: "destructive"
      })
    }
  }

  const handleCancel = () => {
    monitor.recordInteraction('cancel_button_click')
    reset()
    setEditingId(null)
  }

  // Field interaction handlers with performance monitoring
  const handleFieldFocus = useCallback((fieldId: string) => {
    monitor.recordInteraction('focus', fieldId)
  }, [monitor])

  const handleFieldBlur = useCallback((fieldId: string, value: any) => {
    monitor.recordInteraction('blur', fieldId)
    validateField(fieldId, value)
  }, [monitor, validateField])

  const handleFieldChange = useCallback((fieldId: string, value: any) => {
    monitor.recordInteraction('change', fieldId, { value: typeof value === 'string' ? value.length : value })
    validateField(fieldId, value)
  }, [monitor, validateField])

  const sampleSetupTimeData = {
    from_optimized_task_id: '',
    to_optimized_task_id: '',
    machine_resource_id: '',
    setup_time_minutes: 30,
    teardown_time_minutes: 15,
    changeover_cost: 25.0,
    complexity_factor: 1.2,
    is_active: true
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="form" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="form">Single Entry</TabsTrigger>
          <TabsTrigger value="bulk">Mass Upload</TabsTrigger>
        </TabsList>
        
        <TabsContent value="form" className="space-y-6">
          {/* Form Card */}
          <Card>
        <CardHeader>
          <CardTitle>{editingId ? 'Edit Setup Time' : 'Create New Setup Time'}</CardTitle>
          <CardDescription>
            {editingId ? 'Update setup time configuration' : 'Define setup times between template tasks for constraint generation'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* From Template Task - Required */}
              <div className="space-y-2">
                <Label htmlFor="from_optimized_task_id">From Template Task *</Label>
                <Select 
                  onValueChange={(value) => {
                    setValue('from_optimized_task_id', value)
                    handleFieldChange('from_optimized_task_id', value)
                  }}
                  onOpenChange={(open) => {
                    if (open) handleFieldFocus('from_optimized_task_id')
                    else handleFieldBlur('from_optimized_task_id', watch('from_optimized_task_id'))
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select from task" />
                  </SelectTrigger>
                  <SelectContent>
                    {templateTasks.map((task) => (
                      <SelectItem key={task.optimized_task_id} value={task.optimized_task_id}>
                        {task.pattern_name} - {task.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!watch('from_optimized_task_id') && <p className="text-sm text-red-600">From task is required</p>}
              </div>

              {/* To Template Task - Required */}
              <div className="space-y-2">
                <Label htmlFor="to_optimized_task_id">To Template Task *</Label>
                <Select 
                  onValueChange={(value) => {
                    setValue('to_optimized_task_id', value)
                    handleFieldChange('to_optimized_task_id', value)
                  }}
                  onOpenChange={(open) => {
                    if (open) handleFieldFocus('to_optimized_task_id')
                    else handleFieldBlur('to_optimized_task_id', watch('to_optimized_task_id'))
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select to task" />
                  </SelectTrigger>
                  <SelectContent>
                    {templateTasks
                      .filter(task => task.optimized_task_id !== watch('from_optimized_task_id'))
                      .map((task) => (
                        <SelectItem key={task.optimized_task_id} value={task.optimized_task_id}>
                          {task.pattern_name} - {task.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                {!watch('to_optimized_task_id') && <p className="text-sm text-red-600">To task is required</p>}
              </div>

              {/* Machine Resource - Required */}
              <div className="space-y-2">
                <Label htmlFor="machine_resource_id">Machine *</Label>
                <Select 
                  onValueChange={(value) => {
                    setValue('machine_resource_id', value)
                    handleFieldChange('machine_resource_id', value)
                  }}
                  onOpenChange={(open) => {
                    if (open) handleFieldFocus('machine_resource_id')
                    else handleFieldBlur('machine_resource_id', watch('machine_resource_id'))
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select machine" />
                  </SelectTrigger>
                  <SelectContent>
                    {machines.map((machine) => (
                      <SelectItem key={machine.machine_resource_id} value={machine.machine_resource_id}>
                        {machine.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!watch('machine_resource_id') && <p className="text-sm text-red-600">Machine is required</p>}
              </div>

              {/* Setup Time Minutes - Required */}
              <div className="space-y-2">
                <Label htmlFor="setup_time_minutes">Setup Time (minutes) *</Label>
                <Input
                  id="setup_time_minutes"
                  type="number"
                  min="0"
                  {...register('setup_time_minutes', { 
                    valueAsNumber: true,
                    required: 'Setup time is required',
                    min: { value: 0, message: 'Setup time must be non-negative' }
                  })}
                  onFocus={() => handleFieldFocus('setup_time_minutes')}
                  onBlur={(e) => handleFieldBlur('setup_time_minutes', parseFloat(e.target.value) || 0)}
                  onChange={(e) => handleFieldChange('setup_time_minutes', parseFloat(e.target.value) || 0)}
                />
                {errors.setup_time_minutes && <p className="text-sm text-red-600">{errors.setup_time_minutes.message}</p>}
              </div>

              {/* Setup Type */}
              <div className="space-y-2">
                <Label htmlFor="setup_type">Setup Type</Label>
                <Select 
                  onValueChange={(value) => {
                    setValue('setup_type', value)
                    handleFieldChange('setup_type', value)
                  }}
                  onOpenChange={(open) => {
                    if (open) handleFieldFocus('setup_type')
                    else handleFieldBlur('setup_type', watch('setup_type'))
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select setup type" />
                  </SelectTrigger>
                  <SelectContent>
                    {setupTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Complexity Level */}
              <div className="space-y-2">
                <Label htmlFor="complexity_level">Complexity Level</Label>
                <Select 
                  onValueChange={(value) => {
                    setValue('complexity_level', value)
                    handleFieldChange('complexity_level', value)
                  }}
                  onOpenChange={(open) => {
                    if (open) handleFieldFocus('complexity_level')
                    else handleFieldBlur('complexity_level', watch('complexity_level'))
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select complexity" />
                  </SelectTrigger>
                  <SelectContent>
                    {complexityLevels.map((level) => (
                      <SelectItem key={level.value} value={level.value}>
                        {level.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Required Operator Skill */}
              <div className="space-y-2">
                <Label htmlFor="requires_operator_skill">Required Operator Skill</Label>
                <Select 
                  onValueChange={(value) => {
                    setValue('requires_operator_skill', value)
                    handleFieldChange('requires_operator_skill', value)
                  }}
                  onOpenChange={(open) => {
                    if (open) handleFieldFocus('requires_operator_skill')
                    else handleFieldBlur('requires_operator_skill', watch('requires_operator_skill'))
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select skill level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Specific Requirement</SelectItem>
                    {skillLevels.map((skill) => (
                      <SelectItem key={skill.value} value={skill.value}>
                        {skill.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Setup Cost */}
              <div className="space-y-2">
                <Label htmlFor="setup_cost">Setup Cost ($)</Label>
                <Input
                  id="setup_cost"
                  type="number"
                  min="0"
                  step="0.01"
                  {...register('setup_cost', { 
                    valueAsNumber: true,
                    min: { value: 0, message: 'Cost must be non-negative' }
                  })}
                  onFocus={() => handleFieldFocus('setup_cost')}
                  onBlur={(e) => handleFieldBlur('setup_cost', parseFloat(e.target.value) || 0)}
                  onChange={(e) => handleFieldChange('setup_cost', parseFloat(e.target.value) || 0)}
                />
                {errors.setup_cost && <p className="text-sm text-red-600">{errors.setup_cost.message}</p>}
              </div>

              {/* Efficiency Impact */}
              <div className="space-y-2">
                <Label htmlFor="efficiency_impact_percent">Efficiency Impact (%)</Label>
                <Input
                  id="efficiency_impact_percent"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  {...register('efficiency_impact_percent', { 
                    valueAsNumber: true,
                    min: { value: 0, message: 'Impact must be non-negative' },
                    max: { value: 100, message: 'Impact cannot exceed 100%' }
                  })}
                  onFocus={() => handleFieldFocus('efficiency_impact_percent')}
                  onBlur={(e) => handleFieldBlur('efficiency_impact_percent', parseFloat(e.target.value) || 0)}
                  onChange={(e) => handleFieldChange('efficiency_impact_percent', parseFloat(e.target.value) || 0)}
                />
                {errors.efficiency_impact_percent && <p className="text-sm text-red-600">{errors.efficiency_impact_percent.message}</p>}
              </div>

              {/* Product Family From */}
              <div className="space-y-2">
                <Label htmlFor="product_family_from">Product Family From</Label>
                <Input
                  id="product_family_from"
                  {...register('product_family_from')}
                  placeholder="e.g., Product A, Family X"
                  onFocus={() => handleFieldFocus('product_family_from')}
                  onBlur={(e) => handleFieldBlur('product_family_from', e.target.value)}
                  onChange={(e) => handleFieldChange('product_family_from', e.target.value)}
                />
              </div>

              {/* Product Family To */}
              <div className="space-y-2">
                <Label htmlFor="product_family_to">Product Family To</Label>
                <Input
                  id="product_family_to"
                  {...register('product_family_to')}
                  placeholder="e.g., Product B, Family Y"
                  onFocus={() => handleFieldFocus('product_family_to')}
                  onBlur={(e) => handleFieldBlur('product_family_to', e.target.value)}
                  onChange={(e) => handleFieldChange('product_family_to', e.target.value)}
                />
              </div>
            </div>

            {/* Checkboxes */}
            <div className="flex flex-col space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="requires_certification"
                  checked={watch('requires_certification')}
                  onCheckedChange={(checked) => {
                    setValue('requires_certification', checked as boolean)
                    handleFieldChange('requires_certification', checked)
                  }}
                  onFocus={() => handleFieldFocus('requires_certification')}
                  onBlur={() => handleFieldBlur('requires_certification', watch('requires_certification'))}
                />
                <Label htmlFor="requires_certification">Requires Certification</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="requires_supervisor_approval"
                  checked={watch('requires_supervisor_approval')}
                  onCheckedChange={(checked) => {
                    setValue('requires_supervisor_approval', checked as boolean)
                    handleFieldChange('requires_supervisor_approval', checked)
                  }}
                  onFocus={() => handleFieldFocus('requires_supervisor_approval')}
                  onBlur={() => handleFieldBlur('requires_supervisor_approval', watch('requires_supervisor_approval'))}
                />
                <Label htmlFor="requires_supervisor_approval">Requires Supervisor Approval</Label>
              </div>
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
                disabled={isSubmitting || !watch('from_optimized_task_id') || !watch('to_optimized_task_id') || !watch('machine_resource_id')}
                onClick={() => monitor.recordInteraction('submit_button_click')}
              >
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingId ? 'Update' : 'Create'} Setup Time
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
        </TabsContent>
        
        <TabsContent value="bulk" className="space-y-6">
          <MassUploader
            tableName="setup_times"
            entityName="Setup Time"
            sampleData={sampleSetupTimeData}
            onUploadComplete={fetchSetupTimes}
            requiredFields={['from_optimized_task_id', 'to_optimized_task_id', 'machine_resource_id', 'setup_time_minutes']}
            fieldDescriptions={{
              from_optimized_task_id: 'Source task ID',
              to_optimized_task_id: 'Target task ID',
              machine_resource_id: 'Machine ID (required)',
              setup_time_minutes: 'Setup duration in minutes',
              teardown_time_minutes: 'Teardown duration in minutes',
              changeover_cost: 'Cost of changeover operation'
            }}
          />
        </TabsContent>
      </Tabs>

      {/* Performance Monitoring Dashboard (Development Mode) */}
      {process.env.NODE_ENV === 'development' && (
        <Card>
          <CardHeader>
            <CardTitle>Performance Monitoring</CardTitle>
            <CardDescription>Real-time form performance metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <PerformanceDashboard monitor={monitor} />
          </CardContent>
        </Card>
      )}

      {/* Setup Times List */}
      <Card>
        <CardHeader>
          <CardTitle>Setup Times</CardTitle>
          <CardDescription>Manage existing setup times between template tasks</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : setupTimes.length === 0 ? (
            <p className="text-center text-gray-500 py-4">No setup times found</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">From Task</th>
                    <th className="text-left p-2">To Task</th>
                    <th className="text-left p-2">Machine</th>
                    <th className="text-left p-2">Time (min)</th>
                    <th className="text-left p-2">Type</th>
                    <th className="text-left p-2">Complexity</th>
                    <th className="text-left p-2">Cost</th>
                    <th className="text-left p-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {setupTimes.map((setupTime: any) => (
                    <tr key={setupTime.setup_time_id} className="border-b hover:bg-gray-50">
                      <td className="p-2">
                        <div className="text-sm">
                          <div className="font-medium">{setupTime.from_task?.name || 'Unknown'}</div>
                        </div>
                      </td>
                      <td className="p-2">
                        <div className="text-sm">
                          <div className="font-medium">{setupTime.to_task?.name || 'Unknown'}</div>
                        </div>
                      </td>
                      <td className="p-2">{setupTime.machine?.name || 'Unknown'}</td>
                      <td className="p-2 font-medium">{setupTime.setup_time_minutes}</td>
                      <td className="p-2">
                        <span className="capitalize">{setupTime.setup_type?.replace('_', ' ') || 'Standard'}</span>
                      </td>
                      <td className="p-2">
                        <span className="capitalize">{setupTime.complexity_level?.replace('_', ' ') || 'Simple'}</span>
                      </td>
                      <td className="p-2">${setupTime.setup_cost?.toFixed(2) || '0.00'}</td>
                      <td className="p-2">
                        <div className="flex space-x-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(setupTime)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDelete(setupTime.setup_time_id)}
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