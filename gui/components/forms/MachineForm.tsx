"use client"

import { useState, useEffect, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { machineService, departmentService, workCellService } from '@/lib/services'
import { machineFormSchema, type MachineFormData } from '@/lib/schemas'
import { Database } from '@/lib/database.types'
import { useToast } from '@/hooks/use-toast'
import { useFormPerformance } from '@/lib/hooks/use-form-performance'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { MassUploader } from '@/components/ui/mass-uploader'
import { Loader2, Edit, Trash2, Upload, Search, Filter } from 'lucide-react'
import { AdvancedFilter, BulkOperations, useAdvancedTable } from '@/components/ui/advanced-patterns'

type Machine = Database['public']['Tables']['machines']['Row']
type Department = Database['public']['Tables']['departments']['Row']  
type WorkCell = Database['public']['Tables']['work_cells']['Row']

export default function MachineForm() {
  const [machines, setMachines] = useState<Machine[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [workCells, setWorkCells] = useState<WorkCell[]>([])
  const [filteredWorkCells, setFilteredWorkCells] = useState<WorkCell[]>([])
  const [loading, setLoading] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()

  // Initialize performance monitoring
  const performanceTracker = useFormPerformance('machine-form')

  // Advanced table functionality
  const advancedTable = useAdvancedTable(
    machines,
    (machine) => machine.machine_resource_id,
    {
      enableFiltering: true,
      enableBulkOperations: true,
      enableSorting: true
    }
  )

  const filterOptions = [
    { key: 'name', label: 'Name', type: 'text' as const },
    { key: 'machine_type', label: 'Type', type: 'text' as const },
    { key: 'manufacturer', label: 'Manufacturer', type: 'text' as const },
    { key: 'is_active', label: 'Active', type: 'boolean' as const }
  ]

  // Bulk operations handlers
  const handleBulkDelete = async (ids: string[]) => {
    for (const id of ids) {
      const response = await machineService.delete(id)
      if (!response.success) {
        toast({
          title: "Error",
          description: `Failed to delete machine: ${response.error}`,
          variant: "destructive"
        })
        return
      }
    }
    toast({
      title: "Success", 
      description: `Successfully deleted ${ids.length} machines`
    })
    fetchMachines()
    advancedTable.clearSelection()
  }

  const handleBulkToggleActive = async (ids: string[]) => {
    for (const id of ids) {
      const machine = machines.find(m => m.machine_resource_id === id)
      if (machine) {
        const response = await machineService.update(id, { is_active: !machine.is_active })
        if (!response.success) {
          toast({
            title: "Error",
            description: `Failed to update machine: ${response.error}`,
            variant: "destructive"
          })
          return
        }
      }
    }
    toast({
      title: "Success",
      description: `Successfully updated ${ids.length} machines`
    })
    fetchMachines()
    advancedTable.clearSelection()
  }

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<MachineFormData>({
    resolver: zodResolver(machineFormSchema),
    defaultValues: {
      name: '',
      capacity: 1,
      cost_per_hour: 0,
      department_id: '',
      cell_id: '',
      setup_time_minutes: 0,
      teardown_time_minutes: 0,
      maintenance_window_start: 0,
      maintenance_window_end: 0,
      last_maintenance_date: '',
      next_maintenance_due: '',
      maintenance_interval_hours: 720,
      machine_type: '',
      manufacturer: '',
      model: '',
      year_installed: new Date().getFullYear(),
      efficiency_rating: 1.0,
      average_utilization_percent: 85,
      uptime_target_percent: 95,
      calendar_id: '',
      is_active: true
    }
  })

  // Enhanced register function with performance tracking
  const registerWithPerformance = useCallback((name: keyof MachineFormData, validation?: any) => {
    return {
      ...register(name, validation),
      onFocus: (e: any) => {
        performanceTracker.trackInteraction('focus', name)
        // React Hook Form doesn't provide onFocus, handle manually
      },
      onBlur: (e: any) => {
        // Track field validation
        performanceTracker.startValidation(name)
        
        // Let react-hook-form handle validation
        const hasError = !!errors[name]
        performanceTracker.trackValidation(name, hasError)
        
        // Call original onBlur if it exists
        register(name, validation).onBlur?.(e)
      },
      onChange: (e: any) => {
        performanceTracker.trackInteraction('change', name)
        register(name, validation).onChange?.(e)
      }
    }
  }, [register, performanceTracker, errors])

  const selectedDepartmentId = watch('department_id')

  const fetchMachines = useCallback(async () => {
    setLoading(true)
    const response = await machineService.getAll()
    
    if (response.success && response.data) {
      setMachines(response.data)
    } else {
      console.error('Error fetching machines:', response.error)
      toast({
        title: "Error",
        description: response.error || "Failed to fetch machines",
        variant: "destructive"
      })
    }
    setLoading(false)
  }, [toast])

  const fetchDepartments = useCallback(async () => {
    const response = await departmentService.getAll(true) // activeOnly = true
    
    if (response.success && response.data) {
      setDepartments(response.data)
    } else {
      console.error('Error fetching departments:', response.error)
    }
  }, [])

  const fetchWorkCells = useCallback(async () => {
    const response = await workCellService.getAll(true) // activeOnly = true
    
    if (response.success && response.data) {
      setWorkCells(response.data)
    } else {
      console.error('Error fetching work cells:', response.error)
    }
  }, [])

  useEffect(() => {
    fetchMachines()
    fetchDepartments()
    fetchWorkCells()
  }, [fetchMachines, fetchDepartments, fetchWorkCells])

  // Filter work cells based on selected department
  useEffect(() => {
    if (selectedDepartmentId) {
      setFilteredWorkCells(workCells.filter(cell => cell.department_id === selectedDepartmentId))
    } else {
      setFilteredWorkCells(workCells)
    }
    // Reset cell selection when department changes
    setValue('cell_id', '')
  }, [selectedDepartmentId, workCells, setValue])

  const onSubmit = async (data: MachineFormData) => {
    setIsSubmitting(true)
    performanceTracker.trackSubmissionStart()
    
    try {
      // Track validation start
      performanceTracker.startValidation('form')
      
      // Ensure required fields are present and transform data
      const submitData: any = {
        ...data,
        department_id: data.department_id === 'none' ? null : data.department_id
      }
      
      // Track validation end
      performanceTracker.trackValidation('form', false)
      
      let response
      if (editingId) {
        response = await machineService.update(editingId, submitData)
      } else {
        response = await machineService.create(submitData)
      }

      if (response.success) {
        performanceTracker.trackSubmissionEnd(true)
        toast({
          title: "Success",
          description: `Machine ${editingId ? 'updated' : 'created'} successfully`
        })
        reset()
        setEditingId(null)
        fetchMachines()
      } else {
        performanceTracker.trackSubmissionEnd(false)
        console.error('Error saving machine:', response.error)
        toast({
          title: "Error",
          description: response.error || "Failed to save machine",
          variant: "destructive"
        })
      }
    } catch (error) {
      performanceTracker.trackSubmissionEnd(false)
      console.error('Unexpected error saving machine:', error)
      toast({
        title: "Error",
        description: "An unexpected error occurred while saving the machine",
        variant: "destructive"
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = (machine: Machine) => {
    setEditingId(machine.machine_resource_id)
    setValue('name', machine.name)
    setValue('capacity', machine.capacity)
    setValue('cost_per_hour', machine.cost_per_hour)
    setValue('department_id', machine.department_id || '')
    setValue('cell_id', machine.cell_id)
    setValue('setup_time_minutes', machine.setup_time_minutes)
    setValue('teardown_time_minutes', machine.teardown_time_minutes)
    setValue('maintenance_window_start', machine.maintenance_window_start || 0)
    setValue('maintenance_window_end', machine.maintenance_window_end || 0)
    setValue('last_maintenance_date', machine.last_maintenance_date || '')
    setValue('next_maintenance_due', machine.next_maintenance_due || '')
    setValue('maintenance_interval_hours', machine.maintenance_interval_hours)
    setValue('machine_type', machine.machine_type || '')
    setValue('manufacturer', machine.manufacturer || '')
    setValue('model', machine.model || '')
    setValue('year_installed', machine.year_installed || new Date().getFullYear())
    setValue('efficiency_rating', machine.efficiency_rating)
    setValue('average_utilization_percent', machine.average_utilization_percent || 85)
    setValue('uptime_target_percent', machine.uptime_target_percent)
    setValue('calendar_id', machine.calendar_id || '')
    setValue('is_active', machine.is_active)
  }

  const handleDelete = async (id: string) => {
    const machine = machines.find(m => m.machine_resource_id === id)
    if (!machine) return

    if (!confirm(`Are you sure you want to delete "${machine.name}"?\n\nThis action cannot be undone.`)) return

    const response = await machineService.delete(id)
    
    if (response.success) {
      toast({
        title: "Success",
        description: `Machine "${machine.name}" deleted successfully`
      })
      fetchMachines()
    } else {
      console.error('Error deleting machine:', response.error)
      
      let errorMessage = response.error || "Failed to delete machine"
      let errorDetails = ""
      
      // Check for common constraint violation errors
      if (response.error?.includes('foreign key constraint') || 
          response.error?.includes('violates foreign key')) {
        errorMessage = "Cannot delete machine - it's still in use"
        errorDetails = "This machine has related records (job instances, assignments, etc.). Either delete those first or deactivate this machine instead."
      } else if (response.error?.includes('dependent')) {
        errorMessage = "Cannot delete machine - has dependencies"
        errorDetails = "Other records depend on this machine. Consider deactivating instead."
      }

      toast({
        title: "Error",
        description: errorDetails || errorMessage,
        variant: "destructive"
      })
    }
  }

  const handleCancel = () => {
    reset()
    setEditingId(null)
  }

  const sampleMachineData = {
    name: 'CNC Machine 01',
    capacity: 1,
    cost_per_hour: 45.50,
    department_id: null,
    cell_id: '',
    setup_time_minutes: 15,
    teardown_time_minutes: 10,
    maintenance_window_start: null,
    maintenance_window_end: null,
    last_maintenance_date: null,
    next_maintenance_due: null,
    maintenance_interval_hours: 168,
    machine_type: 'CNC',
    manufacturer: 'Haas',
    model: 'VF-2',
    year_installed: 2020,
    efficiency_rating: 0.95,
    average_utilization_percent: null,
    uptime_target_percent: 0.90,
    calendar_id: null,
    is_active: true
  }

  return (
    <div className="space-y-6">
      {/* Performance Debug Panel - Development Only */}
      {process.env.NODE_ENV === 'development' && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-yellow-800 flex items-center gap-2">
              🚀 Performance Monitor - MachineForm
              <span className="text-xs px-2 py-1 bg-yellow-200 rounded">
                {performanceTracker.isSlowLoading ? '⚠️ Slow' : '✅ Fast'} Load: {performanceTracker.loadTime || 'N/A'}ms
              </span>
              {performanceTracker.submissionTime && (
                <span className="text-xs px-2 py-1 bg-yellow-200 rounded">
                  {performanceTracker.isSlowSubmission ? '⚠️ Slow' : '✅ Fast'} Submit: {performanceTracker.submissionTime}ms
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-4 gap-4 text-xs">
              <div>
                <strong>User Interactions:</strong>
                <div>Total: {performanceTracker.interactionCount}</div>
                <div>First: {performanceTracker.firstInteraction || 'N/A'}ms</div>
              </div>
              <div>
                <strong>Validation:</strong>
                <div>Errors: {performanceTracker.errorCount}</div>
                <div>Form Errors: {Object.keys(errors).length}</div>
              </div>
              <div>
                <strong>Performance:</strong>
                <div>High Error Rate: {performanceTracker.hasHighErrorRate ? 'Yes' : 'No'}</div>
              </div>
              <div>
                <strong>Status:</strong>
                <div>Loading: {loading ? 'Yes' : 'No'}</div>
                <div>Submitting: {isSubmitting ? 'Yes' : 'No'}</div>
                <div>Editing: {editingId ? 'Yes' : 'No'}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="form" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="form">Single Entry</TabsTrigger>
          <TabsTrigger value="bulk">Mass Upload</TabsTrigger>
        </TabsList>
        
        <TabsContent value="form" className="space-y-6">
          {/* Form Card */}
          <Card>
        <CardHeader>
          <CardTitle>{editingId ? 'Edit Machine' : 'Create New Machine'}</CardTitle>
          <CardDescription>
            {editingId ? 'Update machine information' : 'Add a new machine resource to the production system'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Name - Required */}
              <div className="space-y-2">
                <Label htmlFor="name">Machine Name *</Label>
                <Input
                  id="name"
                  {...registerWithPerformance('name', { 
                    required: 'Machine name is required',
                    maxLength: { value: 255, message: 'Name must be 255 characters or less' }
                  })}
                  placeholder="e.g., CNC Machine 01"
                />
                {errors.name && <p className="text-sm text-red-600">{errors.name.message}</p>}
              </div>

              {/* Machine Type */}
              <div className="space-y-2">
                <Label htmlFor="machine_type">Machine Type</Label>
                <Input
                  id="machine_type"
                  {...registerWithPerformance('machine_type')}
                  placeholder="e.g., CNC, Assembly, Testing"
                />
              </div>

              {/* Department - Foreign Key Dropdown */}
              <div className="space-y-2">
                <Label htmlFor="department_id">Department</Label>
                <Select onValueChange={(value) => {
                  performanceTracker.trackInteraction('click', 'department_id')
                  setValue('department_id', value)
                }}>
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

              {/* Work Cell - Required, Filtered by Department */}
              <div className="space-y-2">
                <Label htmlFor="cell_id">Work Cell *</Label>
                <Select onValueChange={(value) => {
                  performanceTracker.trackInteraction('click', 'cell_id')
                  setValue('cell_id', value)
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select work cell" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredWorkCells.map((cell) => (
                      <SelectItem key={cell.cell_id} value={cell.cell_id}>
                        {cell.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!watch('cell_id') && <p className="text-sm text-red-600">Work cell is required</p>}
              </div>

              {/* Capacity */}
              <div className="space-y-2">
                <Label htmlFor="capacity">Capacity</Label>
                <Input
                  id="capacity"
                  type="number"
                  min="1"
                  {...registerWithPerformance('capacity', { 
                    valueAsNumber: true,
                    min: { value: 1, message: 'Capacity must be at least 1' }
                  })}
                />
                {errors.capacity && <p className="text-sm text-red-600">{errors.capacity.message}</p>}
              </div>

              {/* Hourly Cost */}
              <div className="space-y-2">
                <Label htmlFor="cost_per_hour">Hourly Cost ($)</Label>
                <Input
                  id="cost_per_hour"
                  type="number"
                  min="0"
                  step="0.01"
                  {...registerWithPerformance('cost_per_hour', { 
                    valueAsNumber: true,
                    min: { value: 0, message: 'Cost must be non-negative' }
                  })}
                />
                {errors.cost_per_hour && <p className="text-sm text-red-600">{errors.cost_per_hour.message}</p>}
              </div>

              {/* Manufacturer */}
              <div className="space-y-2">
                <Label htmlFor="manufacturer">Manufacturer</Label>
                <Input
                  id="manufacturer"
                  {...register('manufacturer')}
                  placeholder="e.g., Haas, Fanuc, Siemens"
                />
              </div>

              {/* Model */}
              <div className="space-y-2">
                <Label htmlFor="model">Model</Label>
                <Input
                  id="model"
                  {...register('model')}
                  placeholder="e.g., VF-2SS, R-2000iB"
                />
              </div>

              {/* Year Installed */}
              <div className="space-y-2">
                <Label htmlFor="year_installed">Year Installed</Label>
                <Input
                  id="year_installed"
                  type="number"
                  min="1980"
                  max={new Date().getFullYear() + 5}
                  {...register('year_installed', { 
                    valueAsNumber: true,
                    min: { value: 1980, message: 'Year must be 1980 or later' },
                    max: { value: new Date().getFullYear() + 5, message: 'Year cannot be more than 5 years in the future' }
                  })}
                />
                {errors.year_installed && <p className="text-sm text-red-600">{errors.year_installed.message}</p>}
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
                />
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
                />
                {errors.teardown_time_minutes && <p className="text-sm text-red-600">{errors.teardown_time_minutes.message}</p>}
              </div>

              {/* Maintenance Window Start */}
              <div className="space-y-2">
                <Label htmlFor="maintenance_window_start">Maintenance Window Start (time units)</Label>
                <Input
                  id="maintenance_window_start"
                  type="number"
                  min="0"
                  max="95"
                  {...register('maintenance_window_start', { 
                    valueAsNumber: true,
                    min: { value: 0, message: 'Time must be non-negative' },
                    max: { value: 95, message: 'Maximum 95 time units (23:45)' }
                  })}
                />
                {errors.maintenance_window_start && <p className="text-sm text-red-600">{errors.maintenance_window_start.message}</p>}
              </div>

              {/* Maintenance Window End */}
              <div className="space-y-2">
                <Label htmlFor="maintenance_window_end">Maintenance Window End (time units)</Label>
                <Input
                  id="maintenance_window_end"
                  type="number"
                  min="0"
                  max="95"
                  {...register('maintenance_window_end', { 
                    valueAsNumber: true,
                    min: { value: 0, message: 'Time must be non-negative' },
                    max: { value: 95, message: 'Maximum 95 time units (23:45)' }
                  })}
                />
                {errors.maintenance_window_end && <p className="text-sm text-red-600">{errors.maintenance_window_end.message}</p>}
              </div>

              {/* Last Maintenance Date */}
              <div className="space-y-2">
                <Label htmlFor="last_maintenance_date">Last Maintenance Date</Label>
                <Input
                  id="last_maintenance_date"
                  type="date"
                  {...register('last_maintenance_date')}
                />
              </div>

              {/* Next Maintenance Due */}
              <div className="space-y-2">
                <Label htmlFor="next_maintenance_due">Next Maintenance Due</Label>
                <Input
                  id="next_maintenance_due"
                  type="date"
                  {...register('next_maintenance_due')}
                />
              </div>

              {/* Maintenance Interval Hours */}
              <div className="space-y-2">
                <Label htmlFor="maintenance_interval_hours">Maintenance Interval (hours)</Label>
                <Input
                  id="maintenance_interval_hours"
                  type="number"
                  min="1"
                  {...register('maintenance_interval_hours', { 
                    valueAsNumber: true,
                    min: { value: 1, message: 'Interval must be at least 1 hour' }
                  })}
                />
                {errors.maintenance_interval_hours && <p className="text-sm text-red-600">{errors.maintenance_interval_hours.message}</p>}
              </div>

              {/* Efficiency Rating */}
              <div className="space-y-2">
                <Label htmlFor="efficiency_rating">Efficiency Rating</Label>
                <Input
                  id="efficiency_rating"
                  type="number"
                  min="0.1"
                  max="2.0"
                  step="0.1"
                  {...registerWithPerformance('efficiency_rating', { 
                    valueAsNumber: true,
                    min: { value: 0.1, message: 'Efficiency must be at least 0.1' },
                    max: { value: 2.0, message: 'Efficiency cannot exceed 2.0' }
                  })}
                />
                {errors.efficiency_rating && <p className="text-sm text-red-600">{errors.efficiency_rating.message}</p>}
              </div>

              {/* Average Utilization */}
              <div className="space-y-2">
                <Label htmlFor="average_utilization_percent">Average Utilization (%)</Label>
                <Input
                  id="average_utilization_percent"
                  type="number"
                  min="0"
                  max="100"
                  {...register('average_utilization_percent', { 
                    valueAsNumber: true,
                    min: { value: 0, message: 'Utilization must be non-negative' },
                    max: { value: 100, message: 'Utilization cannot exceed 100%' }
                  })}
                />
                {errors.average_utilization_percent && <p className="text-sm text-red-600">{errors.average_utilization_percent.message}</p>}
              </div>

              {/* Uptime Target */}
              <div className="space-y-2">
                <Label htmlFor="uptime_target_percent">Uptime Target (%)</Label>
                <Input
                  id="uptime_target_percent"
                  type="number"
                  min="0"
                  max="100"
                  {...register('uptime_target_percent', { 
                    valueAsNumber: true,
                    min: { value: 0, message: 'Uptime target must be non-negative' },
                    max: { value: 100, message: 'Uptime target cannot exceed 100%' }
                  })}
                />
                {errors.uptime_target_percent && <p className="text-sm text-red-600">{errors.uptime_target_percent.message}</p>}
              </div>

              {/* Calendar ID */}
              <div className="space-y-2">
                <Label htmlFor="calendar_id">Calendar ID</Label>
                <Input
                  id="calendar_id"
                  {...register('calendar_id')}
                  placeholder="Optional calendar reference"
                />
              </div>
            </div>

            {/* Active Checkbox */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_active"
                checked={watch('is_active')}
                onCheckedChange={(checked) => {
                  performanceTracker.trackInteraction('click', 'is_active')
                  setValue('is_active', checked as boolean)
                }}
              />
              <Label htmlFor="is_active">Active</Label>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-2 pt-4">
              {editingId && (
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    performanceTracker.trackInteraction('click', 'cancel-button')
                    handleCancel()
                  }}
                >
                  Cancel
                </Button>
              )}
              <Button 
                type="submit" 
                disabled={isSubmitting || !watch('cell_id')}
                onClick={() => performanceTracker.trackInteraction('click', 'submit-button')}
              >
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingId ? 'Update' : 'Create'} Machine
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
        </TabsContent>
        
        <TabsContent value="bulk" className="space-y-6">
          <MassUploader
            tableName="machine_resources"
            entityName="Machine"
            sampleData={sampleMachineData}
            onUploadComplete={fetchMachines}
            requiredFields={['name', 'cell_id']}
            fieldDescriptions={{
              name: 'Machine display name',
              capacity: 'Maximum concurrent jobs (default: 1)',
              cost_per_hour: 'Operating cost per hour',
              cell_id: 'Work cell ID (required)',
              efficiency_rating: 'Efficiency (0.0 to 1.0)',
              uptime_target_percent: 'Target uptime (0.0 to 1.0)'
            }}
          />
        </TabsContent>
      </Tabs>

      {/* Advanced Machines List */}
      <Card>
        <CardHeader>
          <CardTitle>Machines ({advancedTable.filteredCount} of {advancedTable.totalCount})</CardTitle>
          <CardDescription>Manage existing machines with advanced filtering and bulk operations</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Advanced Filter */}
          <AdvancedFilter
            options={filterOptions}
            values={advancedTable.filters}
            onChange={advancedTable.setFilters}
            placeholder="Search machines..."
          />

          {/* Bulk Operations */}
          <BulkOperations
            items={advancedTable.filteredItems}
            selectedItems={advancedTable.selectedItems}
            onToggleSelection={advancedTable.toggleSelection}
            onSelectAll={advancedTable.selectAll}
            onClearSelection={advancedTable.clearSelection}
            onBulkDelete={handleBulkDelete}
            onBulkEdit={handleBulkToggleActive}
            getId={(machine) => machine.machine_resource_id}
            isSelectionMode={advancedTable.isSelectionMode}
            onEnterSelectionMode={advancedTable.enterSelectionMode}
          />

          {loading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : advancedTable.isEmpty ? (
            <p className="text-center text-gray-500 py-4">
              {advancedTable.filters.length > 0 ? 'No machines match your filters' : 'No machines found'}
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
                            advancedTable.selectedItems.size === advancedTable.filteredItems.length ? advancedTable.clearSelection() : advancedTable.selectAll()
                          }}
                          className="rounded"
                        />
                      </th>
                    )}
                    <th className="text-left p-2 font-medium cursor-pointer hover:bg-gray-50" onClick={() => advancedTable.setSortBy('name')}>Name ↕</th>
                    <th className="text-left p-2 font-medium">Type</th>
                    <th className="text-left p-2 font-medium">Department</th>
                    <th className="text-left p-2 font-medium">Capacity</th>
                    <th className="text-left p-2 font-medium">Cost/Hour</th>
                    <th className="text-left p-2 font-medium">Efficiency</th>
                    <th className="text-left p-2 font-medium">Status</th>
                    <th className="text-left p-2 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {advancedTable.filteredItems.map((machine) => {
                    const department = departments.find(d => d.department_id === machine.department_id)
                    const workCell = workCells.find(c => c.cell_id === machine.cell_id)
                    return (
                      <tr key={machine.machine_resource_id} className="border-b hover:bg-gray-50">
                        {advancedTable.isSelectionMode && (
                          <td className="p-2">
                            <input
                              type="checkbox"
                              checked={advancedTable.selectedItems.has(machine.machine_resource_id)}
                              onChange={() => advancedTable.toggleSelection(machine.machine_resource_id)}
                              className="rounded"
                            />
                          </td>
                        )}
                        <td className="p-2 font-medium">{machine.name}</td>
                        <td className="p-2">{machine.machine_type || '-'}</td>
                        <td className="p-2">
                          <div>
                            {department ? `${department.name} (${department.code})` : '-'}
                            {workCell && <div className="text-xs text-gray-500">Cell: {workCell.name}</div>}
                          </div>
                        </td>
                        <td className="p-2">{machine.capacity}</td>
                        <td className="p-2">${machine.cost_per_hour.toFixed(2)}</td>
                        <td className="p-2">{machine.efficiency_rating.toFixed(1)}</td>
                        <td className="p-2">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            machine.is_active 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {machine.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="p-2">
                          <div className="flex space-x-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                performanceTracker.trackInteraction('click', 'edit-button')
                                handleEdit(machine)
                              }}
                              disabled={loading}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                performanceTracker.trackInteraction('click', 'toggle-active-button')
                                handleBulkToggleActive([machine.machine_resource_id])
                              }}
                              className={machine.is_active ? "text-orange-600 hover:bg-orange-50" : "text-green-600 hover:bg-green-50"}
                              disabled={loading}
                            >
                              {machine.is_active ? "Deactivate" : "Reactivate"}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                performanceTracker.trackInteraction('click', 'delete-button')
                                handleDelete(machine.machine_resource_id)
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