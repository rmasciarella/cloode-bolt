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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { MassUploader } from '@/components/ui/mass-uploader'
import { Loader2, Edit, Trash2, Upload } from 'lucide-react'

type TemplatePrecedence = {
  optimized_precedence_id: string
  pattern_id: string
  predecessor_optimized_task_id: string
  successor_optimized_task_id: string
  min_delay_minutes: number
  max_delay_minutes: number | null
  requires_department_transfer: boolean
  transfer_time_minutes: number
  created_at: string
}

type OptimizedTask = {
  optimized_task_id: string
  name: string
  pattern_id: string
  pattern_name: string
}

type JobOptimizedPattern = {
  pattern_id: string
  name: string
}

type TemplatePrecedenceFormData = {
  pattern_id: string
  predecessor_optimized_task_id: string
  successor_optimized_task_id: string
  min_delay_minutes: number
  max_delay_minutes: number
  requires_department_transfer: boolean
  transfer_time_minutes: number
}

export default function TemplatePrecedenceForm() {
  const [templatePrecedences, setTemplatePrecedences] = useState<TemplatePrecedence[]>([])
  const [optimizedTasks, setOptimizedTasks] = useState<OptimizedTask[]>([])
  const [patterns, setPatterns] = useState<JobOptimizedPattern[]>([])
  const [loading, setLoading] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<TemplatePrecedenceFormData>({
    defaultValues: {
      pattern_id: '',
      predecessor_optimized_task_id: '',
      successor_optimized_task_id: '',
      min_delay_minutes: 0,
      max_delay_minutes: 0,
      requires_department_transfer: false,
      transfer_time_minutes: 0
    }
  })

  const fetchTemplatePrecedences = async () => {
    setLoading(true)
    try {
      // Check if table exists first by testing a simple query
      const { data, error } = await supabase
        .from('optimized_precedences')
        .select('*')
        .limit(1)

      if (error) {
        // If table doesn't exist, just set empty data instead of throwing error
        if (error.code === '42703' || error.code === '42P01') {
          console.warn('optimized_precedences table does not exist yet:', error.message)
          setTemplatePrecedences([])
          return
        }
        throw error
      }
      
      // If table exists, fetch full data
      const { data: fullData, error: fullError } = await supabase
        .from('optimized_precedences')
        .select('*')
        .limit(10)
        
      if (fullError) throw fullError
      setTemplatePrecedences(fullData || [])
    } catch (error: any) {
      console.error('Error fetching template precedences:', error)
      console.error('Error details:', {
        message: error?.message,
        details: error?.details,
        hint: error?.hint,
        code: error?.code
      })
      toast({
        title: "Warning",
        description: "Template precedences table not available yet",
        variant: "default"
      })
      setTemplatePrecedences([])
    } finally {
      setLoading(false)
    }
  }

  const fetchOptimizedTasks = async () => {
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
      
      setOptimizedTasks(formattedTasks)
    } catch (error) {
      console.error('Error fetching optimized tasks:', error)
    }
  }

  const fetchPatterns = async () => {
    try {
      const { data, error } = await supabase
        .from('job_optimized_patterns')
        .select('pattern_id, name')
        .order('name', { ascending: true })

      if (error) throw error
      setPatterns(data || [])
    } catch (error) {
      console.error('Error fetching patterns:', error)
    }
  }

  useEffect(() => {
    fetchTemplatePrecedences()
    fetchOptimizedTasks()
    fetchPatterns()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const onSubmit = async (data: TemplatePrecedenceFormData) => {
    setIsSubmitting(true)
    try {
      if (data.predecessor_optimized_task_id === data.successor_optimized_task_id) {
        toast({
          title: "Error",
          description: "Predecessor and successor tasks must be different",
          variant: "destructive"
        })
        setIsSubmitting(false)
        return
      }

      const formData = {
        pattern_id: data.pattern_id,
        predecessor_optimized_task_id: data.predecessor_optimized_task_id,
        successor_optimized_task_id: data.successor_optimized_task_id,
        min_delay_minutes: data.min_delay_minutes,
        max_delay_minutes: data.max_delay_minutes || null,
        requires_department_transfer: data.requires_department_transfer,
        transfer_time_minutes: data.transfer_time_minutes
      }

      if (editingId) {
        const { error } = await supabase
          .from('optimized_precedences')
          .update(formData)
          .eq('optimized_precedence_id', editingId)

        if (error) throw error

        toast({
          title: "Success",
          description: "Template precedence updated successfully"
        })
      } else {
        const { error } = await supabase
          .from('optimized_precedences')
          .insert([formData])

        if (error) throw error

        toast({
          title: "Success",
          description: "Template precedence created successfully"
        })
      }

      reset()
      setEditingId(null)
      fetchTemplatePrecedences()
    } catch (error) {
      console.error('Error saving template precedence:', error)
      toast({
        title: "Error",
        description: "Failed to save template precedence",
        variant: "destructive"
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = (precedence: TemplatePrecedence) => {
    setEditingId(precedence.optimized_precedence_id)
    setValue('pattern_id', precedence.pattern_id)
    setValue('predecessor_optimized_task_id', precedence.predecessor_optimized_task_id)
    setValue('successor_optimized_task_id', precedence.successor_optimized_task_id)
    setValue('min_delay_minutes', precedence.min_delay_minutes)
    setValue('max_delay_minutes', precedence.max_delay_minutes || 0)
    setValue('requires_department_transfer', precedence.requires_department_transfer)
    setValue('transfer_time_minutes', precedence.transfer_time_minutes)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this template precedence?')) return

    try {
      const { error } = await supabase
        .from('optimized_precedences')
        .delete()
        .eq('optimized_precedence_id', id)

      if (error) throw error

      toast({
        title: "Success",
        description: "Template precedence deleted successfully"
      })
      fetchTemplatePrecedences()
    } catch (error) {
      console.error('Error deleting template precedence:', error)
      toast({
        title: "Error",
        description: "Failed to delete template precedence",
        variant: "destructive"
      })
    }
  }

  const handleCancel = () => {
    reset()
    setEditingId(null)
  }

  const getFilteredTasks = (selectedPatternId: string, excludeTaskId: string = '') => {
    return optimizedTasks.filter(task => 
      task.pattern_id === selectedPatternId && task.optimized_task_id !== excludeTaskId
    )
  }

  const selectedPatternId = watch('pattern_id')
  const selectedPredecessorId = watch('predecessor_optimized_task_id')

  const sampleTemplatePrecedenceData = {
    pattern_id: 'PATTERN_001',
    predecessor_optimized_task_id: 'TASK_001',
    successor_optimized_task_id: 'TASK_002',
    min_delay_minutes: 0,
    max_delay_minutes: 120,
    requires_department_transfer: false,
    transfer_time_minutes: 0,
    is_mandatory: true
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
          <CardTitle>{editingId ? 'Edit Template Precedence' : 'Create New Template Precedence'}</CardTitle>
          <CardDescription>
            {editingId ? 'Update template precedence relationship' : 'Define precedence constraints between tasks in optimized patterns'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Pattern - Required */}
              <div className="space-y-2">
                <Label htmlFor="pattern_id">Job Optimized Pattern *</Label>
                <Select onValueChange={(value) => {
                  setValue('pattern_id', value)
                  setValue('predecessor_optimized_task_id', '')
                  setValue('successor_optimized_task_id', '')
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select pattern" />
                  </SelectTrigger>
                  <SelectContent>
                    {patterns.map((pattern) => (
                      <SelectItem key={pattern.pattern_id} value={pattern.pattern_id}>
                        {pattern.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!watch('pattern_id') && <p className="text-sm text-red-600">Pattern is required</p>}
              </div>

              {/* Predecessor Task - Required */}
              <div className="space-y-2">
                <Label htmlFor="predecessor_optimized_task_id">Predecessor Task *</Label>
                <Select 
                  onValueChange={(value) => setValue('predecessor_optimized_task_id', value)}
                  disabled={!selectedPatternId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select predecessor task" />
                  </SelectTrigger>
                  <SelectContent>
                    {getFilteredTasks(selectedPatternId, selectedPredecessorId).map((task) => (
                      <SelectItem key={task.optimized_task_id} value={task.optimized_task_id}>
                        {task.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!watch('predecessor_optimized_task_id') && selectedPatternId && 
                  <p className="text-sm text-red-600">Predecessor task is required</p>}
              </div>

              {/* Successor Task - Required */}
              <div className="space-y-2">
                <Label htmlFor="successor_optimized_task_id">Successor Task *</Label>
                <Select 
                  onValueChange={(value) => setValue('successor_optimized_task_id', value)}
                  disabled={!selectedPatternId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select successor task" />
                  </SelectTrigger>
                  <SelectContent>
                    {getFilteredTasks(selectedPatternId, selectedPredecessorId).map((task) => (
                      <SelectItem key={task.optimized_task_id} value={task.optimized_task_id}>
                        {task.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!watch('successor_optimized_task_id') && selectedPatternId && 
                  <p className="text-sm text-red-600">Successor task is required</p>}
              </div>

              {/* Min Delay Minutes */}
              <div className="space-y-2">
                <Label htmlFor="min_delay_minutes">Minimum Delay (minutes)</Label>
                <Input
                  id="min_delay_minutes"
                  type="number"
                  min="0"
                  {...register('min_delay_minutes', { 
                    valueAsNumber: true,
                    min: { value: 0, message: 'Minimum delay must be non-negative' }
                  })}
                />
                <p className="text-xs text-gray-500">Minimum time between predecessor completion and successor start</p>
                {errors.min_delay_minutes && <p className="text-sm text-red-600">{errors.min_delay_minutes.message}</p>}
              </div>

              {/* Max Delay Minutes */}
              <div className="space-y-2">
                <Label htmlFor="max_delay_minutes">Maximum Delay (minutes)</Label>
                <Input
                  id="max_delay_minutes"
                  type="number"
                  min="0"
                  {...register('max_delay_minutes', { 
                    valueAsNumber: true,
                    min: { value: 0, message: 'Maximum delay must be non-negative' }
                  })}
                />
                <p className="text-xs text-gray-500">Maximum time between tasks (0 = no limit)</p>
                {errors.max_delay_minutes && <p className="text-sm text-red-600">{errors.max_delay_minutes.message}</p>}
              </div>

              {/* Transfer Time Minutes */}
              <div className="space-y-2">
                <Label htmlFor="transfer_time_minutes">Transfer Time (minutes)</Label>
                <Input
                  id="transfer_time_minutes"
                  type="number"
                  min="0"
                  {...register('transfer_time_minutes', { 
                    valueAsNumber: true,
                    min: { value: 0, message: 'Transfer time must be non-negative' }
                  })}
                />
                <p className="text-xs text-gray-500">Time required for material transfer between departments</p>
                {errors.transfer_time_minutes && <p className="text-sm text-red-600">{errors.transfer_time_minutes.message}</p>}
              </div>
            </div>

            {/* Checkboxes */}
            <div className="flex flex-col space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="requires_department_transfer"
                  checked={watch('requires_department_transfer')}
                  onCheckedChange={(checked) => setValue('requires_department_transfer', checked as boolean)}
                />
                <Label htmlFor="requires_department_transfer">Requires Department Transfer</Label>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-2 pt-4">
              {editingId && (
                <Button type="button" variant="outline" onClick={handleCancel}>
                  Cancel
                </Button>
              )}
              <Button type="submit" disabled={isSubmitting || !watch('pattern_id') || !watch('predecessor_optimized_task_id') || !watch('successor_optimized_task_id')}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingId ? 'Update' : 'Create'} Template Precedence
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
        </TabsContent>
        
        <TabsContent value="bulk" className="space-y-6">
          <MassUploader
            tableName="optimized_precedences"
            entityName="Template Precedence"
            sampleData={sampleTemplatePrecedenceData}
            onUploadComplete={fetchTemplatePrecedences}
            requiredFields={['pattern_id', 'predecessor_optimized_task_id', 'successor_optimized_task_id']}
            fieldDescriptions={{
              pattern_id: 'Job optimized pattern ID (required)',
              predecessor_optimized_task_id: 'Task that must complete first (required)',
              successor_optimized_task_id: 'Task that follows the predecessor (required)',
              min_delay_minutes: 'Minimum time delay between tasks in minutes (default: 0)',
              max_delay_minutes: 'Maximum time delay between tasks in minutes (0 = no limit)',
              requires_department_transfer: 'Whether tasks require department transfer (true/false)',
              transfer_time_minutes: 'Time required for material transfer between departments (default: 0)',
              is_mandatory: 'Whether this precedence constraint is mandatory (true/false)'
            }}
          />
        </TabsContent>
      </Tabs>

      {/* Template Precedences List */}
      <Card>
        <CardHeader>
          <CardTitle>Template Precedences</CardTitle>
          <CardDescription>Manage existing precedence relationships between template tasks</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : templatePrecedences.length === 0 ? (
            <p className="text-center text-gray-500 py-4">No template precedences found</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Pattern</th>
                    <th className="text-left p-2">Predecessor</th>
                    <th className="text-left p-2">Successor</th>
                    <th className="text-left p-2">Min Delay</th>
                    <th className="text-left p-2">Max Delay</th>
                    <th className="text-left p-2">Transfer</th>
                    <th className="text-left p-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {templatePrecedences.map((precedence: any) => {
                    const pattern = patterns.find(p => p.pattern_id === precedence.pattern_id)
                    const predecessorTask = optimizedTasks.find(t => t.optimized_task_id === precedence.predecessor_optimized_task_id)
                    const successorTask = optimizedTasks.find(t => t.optimized_task_id === precedence.successor_optimized_task_id)
                    
                    return (
                      <tr key={precedence.optimized_precedence_id} className="border-b hover:bg-gray-50">
                        <td className="p-2 font-medium">{pattern?.name || 'Unknown'}</td>
                        <td className="p-2">{predecessorTask?.name || 'Unknown'}</td>
                        <td className="p-2">{successorTask?.name || 'Unknown'}</td>
                        <td className="p-2">{precedence.min_delay_minutes}m</td>
                        <td className="p-2">{precedence.max_delay_minutes ? `${precedence.max_delay_minutes}m` : 'No limit'}</td>
                        <td className="p-2">
                          {precedence.requires_department_transfer ? (
                            <span className="text-orange-600">
                              {precedence.transfer_time_minutes}m
                            </span>
                          ) : (
                            <span className="text-gray-400">No</span>
                          )}
                        </td>
                        <td className="p-2">
                          <div className="flex space-x-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEdit(precedence)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDelete(precedence.optimized_precedence_id)}
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