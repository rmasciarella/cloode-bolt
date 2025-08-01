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

type Machine = {
  machine_resource_id: string
  name: string
  capacity: number
  cost_per_hour: number
  department_id: string | null
  cell_id: string
  setup_time_minutes: number
  teardown_time_minutes: number
  maintenance_window_start: number | null
  maintenance_window_end: number | null
  last_maintenance_date: string | null
  next_maintenance_due: string | null
  maintenance_interval_hours: number
  machine_type: string | null
  manufacturer: string | null
  model: string | null
  year_installed: number | null
  efficiency_rating: number
  average_utilization_percent: number | null
  uptime_target_percent: number
  calendar_id: string | null
  is_active: boolean
}

type Department = {
  department_id: string
  name: string
  code: string
}

type WorkCell = {
  cell_id: string
  name: string
  department_id: string | null
}

type MachineFormData = {
  name: string
  capacity: number
  cost_per_hour: number
  department_id: string
  cell_id: string
  setup_time_minutes: number
  teardown_time_minutes: number
  maintenance_window_start: number
  maintenance_window_end: number
  last_maintenance_date: string
  next_maintenance_due: string
  maintenance_interval_hours: number
  machine_type: string
  manufacturer: string
  model: string
  year_installed: number
  efficiency_rating: number
  average_utilization_percent: number
  uptime_target_percent: number
  calendar_id: string
  is_active: boolean
}

export default function MachineForm() {
  const [machines, setMachines] = useState<Machine[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [workCells, setWorkCells] = useState<WorkCell[]>([])
  const [filteredWorkCells, setFilteredWorkCells] = useState<WorkCell[]>([])
  const [loading, setLoading] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<MachineFormData>({
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

  const selectedDepartmentId = watch('department_id')

  const fetchMachines = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('machines')
        .select('*')
        .order('name', { ascending: true })

      if (error) throw error
      setMachines(data || [])
    } catch (error) {
      console.error('Error fetching machines:', error)
      toast({
        title: "Error",
        description: "Failed to fetch machines",
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

  const fetchWorkCells = async () => {
    try {
      const { data, error } = await supabase
        .from('work_cells')
        .select('*')
        .order('name', { ascending: true })

      if (error) throw error
      setWorkCells(data || [])
    } catch (error) {
      console.error('Error fetching work cells:', error)
    }
  }

  useEffect(() => {
    fetchMachines()
    fetchDepartments()
    fetchWorkCells()
  }, [])

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
    try {
      const formData = {
        name: data.name,
        capacity: data.capacity,
        cost_per_hour: data.cost_per_hour,
        department_id: data.department_id || null,
        cell_id: data.cell_id,
        setup_time_minutes: data.setup_time_minutes,
        teardown_time_minutes: data.teardown_time_minutes,
        maintenance_window_start: data.maintenance_window_start || null,
        maintenance_window_end: data.maintenance_window_end || null,
        last_maintenance_date: data.last_maintenance_date || null,
        next_maintenance_due: data.next_maintenance_due || null,
        maintenance_interval_hours: data.maintenance_interval_hours,
        machine_type: data.machine_type || null,
        manufacturer: data.manufacturer || null,
        model: data.model || null,
        year_installed: data.year_installed || null,
        efficiency_rating: data.efficiency_rating,
        average_utilization_percent: data.average_utilization_percent || null,
        uptime_target_percent: data.uptime_target_percent,
        calendar_id: data.calendar_id || null,
        is_active: data.is_active
      }

      if (editingId) {
        const { error } = await supabase
          .from('machines')
          .update(formData)
          .eq('machine_resource_id', editingId)

        if (error) throw error

        toast({
          title: "Success",
          description: "Machine updated successfully"
        })
      } else {
        const { error } = await supabase
          .from('machines')
          .insert([formData])

        if (error) throw error

        toast({
          title: "Success",
          description: "Machine created successfully"
        })
      }

      reset()
      setEditingId(null)
      fetchMachines()
    } catch (error) {
      console.error('Error saving machine:', error)
      toast({
        title: "Error",
        description: "Failed to save machine",
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
    if (!confirm('Are you sure you want to delete this machine?')) return

    try {
      const { error } = await supabase
        .from('machines')
        .delete()
        .eq('machine_resource_id', id)

      if (error) throw error

      toast({
        title: "Success",
        description: "Machine deleted successfully"
      })
      fetchMachines()
    } catch (error) {
      console.error('Error deleting machine:', error)
      toast({
        title: "Error",
        description: "Failed to delete machine",
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
                  {...register('name', { 
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
                  {...register('machine_type')}
                  placeholder="e.g., CNC, Assembly, Testing"
                />
              </div>

              {/* Department - Foreign Key Dropdown */}
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

              {/* Work Cell - Required, Filtered by Department */}
              <div className="space-y-2">
                <Label htmlFor="cell_id">Work Cell *</Label>
                <Select onValueChange={(value) => setValue('cell_id', value)}>
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
                  {...register('capacity', { 
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
                  {...register('cost_per_hour', { 
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
                  max="96"
                  {...register('maintenance_window_start', { 
                    valueAsNumber: true,
                    min: { value: 0, message: 'Time must be non-negative' },
                    max: { value: 96, message: 'Maximum 96 time units (24 hours)' }
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
                  max="96"
                  {...register('maintenance_window_end', { 
                    valueAsNumber: true,
                    min: { value: 0, message: 'Time must be non-negative' },
                    max: { value: 96, message: 'Maximum 96 time units (24 hours)' }
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
                  {...register('efficiency_rating', { 
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
              <Button type="submit" disabled={isSubmitting || !watch('cell_id')}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingId ? 'Update' : 'Create'} Machine
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Machines List */}
      <Card>
        <CardHeader>
          <CardTitle>Machines</CardTitle>
          <CardDescription>Manage existing machines</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : machines.length === 0 ? (
            <p className="text-center text-gray-500 py-4">No machines found</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Name</th>
                    <th className="text-left p-2">Type</th>
                    <th className="text-left p-2">Department</th>
                    <th className="text-left p-2">Capacity</th>
                    <th className="text-left p-2">Cost/Hour</th>
                    <th className="text-left p-2">Efficiency</th>
                    <th className="text-left p-2">Uptime Target</th>
                    <th className="text-left p-2">Status</th>
                    <th className="text-left p-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {machines.map((machine) => {
                    const department = departments.find(d => d.department_id === machine.department_id)
                    const workCell = workCells.find(c => c.cell_id === machine.cell_id)
                    return (
                      <tr key={machine.machine_resource_id} className="border-b hover:bg-gray-50">
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
                        <td className="p-2">{machine.uptime_target_percent}%</td>
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
                              onClick={() => handleEdit(machine)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDelete(machine.machine_resource_id)}
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