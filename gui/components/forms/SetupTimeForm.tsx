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

  const fetchSetupTimes = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('optimized_task_setup_times')
        .select(`*`)
        .limit(10)

      if (error) throw error
      setSetupTimes(data || [])
    } catch (error) {
      console.error('Error fetching setup times:', error)
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
      
      setTemplateTasks(formattedTasks)
    } catch (error) {
      console.error('Error fetching template tasks:', error)
    }
  }

  const fetchMachines = async () => {
    try {
      const { data, error } = await supabase
        .from('machines')
        .select('machine_resource_id, name')
        .eq('is_active', true)
        .order('name', { ascending: true })

      if (error) throw error
      setMachines(data || [])
    } catch (error) {
      console.error('Error fetching machines:', error)
    }
  }

  useEffect(() => {
    fetchSetupTimes()
    fetchTemplateTasks()
    fetchMachines()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const onSubmit = async (data: SetupTimeFormData) => {
    setIsSubmitting(true)
    try {
      if (data.from_optimized_task_id === data.to_optimized_task_id) {
        toast({
          title: "Error",
          description: "From and To tasks must be different",
          variant: "destructive"
        })
        setIsSubmitting(false)
        return
      }

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

      if (editingId) {
        const { error } = await supabase
          .from('optimized_task_setup_times')
          .update(formData)
          .eq('setup_time_id', editingId)

        if (error) throw error

        toast({
          title: "Success",
          description: "Task mode updated successfully"
        })
      } else {
        const { error } = await supabase
          .from('optimized_task_setup_times')
          .insert([formData])

        if (error) throw error

        toast({
          title: "Success",
          description: "Task mode created successfully"
        })
      }

      reset()
      setEditingId(null)
      fetchSetupTimes()
    } catch (error) {
      console.error('Error saving setup time:', error)
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
    setEditingId(setupTime.setup_time_id)
    setValue('from_optimized_task_id', setupTime.from_optimized_task_id)
    setValue('to_optimized_task_id', setupTime.to_optimized_task_id)
    setValue('machine_resource_id', setupTime.machine_resource_id)
    setValue('setup_time_minutes', setupTime.setup_time_minutes)
    setValue('setup_type', setupTime.setup_type)
    setValue('complexity_level', setupTime.complexity_level)
    setValue('requires_certification', setupTime.requires_certification)
    setValue('setup_cost', setupTime.setup_cost)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this task mode?')) return

    try {
      const { error } = await supabase
        .from('optimized_task_setup_times')
        .delete()
        .eq('setup_time_id', id)

      if (error) throw error

      toast({
        title: "Success",
        description: "Task mode deleted successfully"
      })
      fetchSetupTimes()
    } catch (error) {
      console.error('Error deleting task mode:', error)
      toast({
        title: "Error",
        description: "Failed to delete task mode",
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
                <Select onValueChange={(value) => setValue('from_optimized_task_id', value)}>
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
                <Select onValueChange={(value) => setValue('to_optimized_task_id', value)}>
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
                <Select onValueChange={(value) => setValue('machine_resource_id', value)}>
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
                />
                {errors.setup_time_minutes && <p className="text-sm text-red-600">{errors.setup_time_minutes.message}</p>}
              </div>

              {/* Setup Type */}
              <div className="space-y-2">
                <Label htmlFor="setup_type">Setup Type</Label>
                <Select onValueChange={(value) => setValue('setup_type', value)}>
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
                <Select onValueChange={(value) => setValue('complexity_level', value)}>
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
                <Select onValueChange={(value) => setValue('requires_operator_skill', value)}>
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
                />
              </div>

              {/* Product Family To */}
              <div className="space-y-2">
                <Label htmlFor="product_family_to">Product Family To</Label>
                <Input
                  id="product_family_to"
                  {...register('product_family_to')}
                  placeholder="e.g., Product B, Family Y"
                />
              </div>
            </div>

            {/* Checkboxes */}
            <div className="flex flex-col space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="requires_certification"
                  checked={watch('requires_certification')}
                  onCheckedChange={(checked) => setValue('requires_certification', checked as boolean)}
                />
                <Label htmlFor="requires_certification">Requires Certification</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="requires_supervisor_approval"
                  checked={watch('requires_supervisor_approval')}
                  onCheckedChange={(checked) => setValue('requires_supervisor_approval', checked as boolean)}
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
              <Button type="submit" disabled={isSubmitting || !watch('from_optimized_task_id') || !watch('to_optimized_task_id') || !watch('machine_resource_id')}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingId ? 'Update' : 'Create'} Setup Time
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

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