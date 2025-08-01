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

type WorkCell = {
  cell_id: string
  name: string
  capacity: number
  department_id: string | null
  wip_limit: number | null
  target_utilization: number
  flow_priority: number
  floor_location: string | null
  cell_type: string
  calendar_id: string | null
  average_throughput_per_hour: number | null
  utilization_target_percent: number
  is_active: boolean
  created_at: string
}

type Department = {
  department_id: string
  name: string
  code: string
}

// FIXED: Remove non-existent fields (description, location) and add missing fields
type WorkCellFormData = {
  name: string
  capacity: number
  department_id: string
  wip_limit: number
  flow_priority: number
  floor_location: string
  cell_type: string
  target_utilization: number  // FIXED: Use single utilization field
  calendar_id: string
  average_throughput_per_hour: number
  is_active: boolean
}

const cellTypes = [
  { value: 'production', label: 'Production' },
  { value: 'assembly', label: 'Assembly' },
  { value: 'testing', label: 'Testing' },
  { value: 'packaging', label: 'Packaging' },
  { value: 'storage', label: 'Storage' },
  { value: 'maintenance', label: 'Maintenance' }
]

export default function WorkCellForm() {
  const [workCells, setWorkCells] = useState<WorkCell[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<WorkCellFormData>({
    defaultValues: {
      name: '',
      capacity: 1,
      department_id: '',
      wip_limit: 5,
      flow_priority: 1,
      floor_location: '',
      cell_type: 'production',
      target_utilization: 0.85,  // FIXED: Store as decimal (0.85 = 85%)
      calendar_id: '',
      average_throughput_per_hour: 0,
      is_active: true
    }
  })

  const fetchWorkCells = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('work_cells')
        .select('*')
        .order('name', { ascending: true })

      if (error) throw error
      setWorkCells(data || [])
    } catch (error) {
      console.error('Error fetching work cells:', error)
      toast({
        title: "Error",
        description: "Failed to fetch work cells",
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
    fetchWorkCells()
    fetchDepartments()
  }, [])

  const onSubmit = async (data: WorkCellFormData) => {
    setIsSubmitting(true)
    try {
      // FIXED: Remove non-existent fields and handle nulls properly
      const formData = {
        name: data.name,
        capacity: data.capacity,
        department_id: data.department_id || null,  // FIXED: Handle null properly
        wip_limit: data.wip_limit || null,
        target_utilization: data.target_utilization,  // FIXED: No conversion needed
        flow_priority: data.flow_priority,
        floor_location: data.floor_location || null,
        cell_type: data.cell_type,
        calendar_id: data.calendar_id || null,  // FIXED: Include calendar_id
        average_throughput_per_hour: data.average_throughput_per_hour || null,  // FIXED: Include throughput
        is_active: data.is_active
      }

      if (editingId) {
        const { error } = await supabase
          .from('work_cells')
          .update(formData)
          .eq('cell_id', editingId)

        if (error) throw error

        toast({
          title: "Success",
          description: "Work cell updated successfully"
        })
      } else {
        const { error } = await supabase
          .from('work_cells')
          .insert([formData])

        if (error) throw error

        toast({
          title: "Success",
          description: "Work cell created successfully"
        })
      }

      reset()
      setEditingId(null)
      fetchWorkCells()
    } catch (error) {
      console.error('Error saving work cell:', error)
      toast({
        title: "Error",
        description: "Failed to save work cell",
        variant: "destructive"
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = (workCell: WorkCell) => {
    setEditingId(workCell.cell_id)
    setValue('name', workCell.name)
    setValue('capacity', workCell.capacity)
    setValue('department_id', workCell.department_id || '')
    setValue('wip_limit', workCell.wip_limit || 0)
    setValue('target_utilization', workCell.target_utilization)  // FIXED: No conversion
    setValue('flow_priority', workCell.flow_priority)
    setValue('floor_location', workCell.floor_location || '')
    setValue('cell_type', workCell.cell_type)
    setValue('calendar_id', workCell.calendar_id || '')  // FIXED: Include calendar_id
    setValue('average_throughput_per_hour', workCell.average_throughput_per_hour || 0)  // FIXED: Include throughput
    setValue('is_active', workCell.is_active)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this work cell?')) return

    try {
      const { error } = await supabase
        .from('work_cells')
        .delete()
        .eq('cell_id', id)

      if (error) throw error

      toast({
        title: "Success",
        description: "Work cell deleted successfully"
      })
      fetchWorkCells()
    } catch (error) {
      console.error('Error deleting work cell:', error)
      toast({
        title: "Error",
        description: "Failed to delete work cell",
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
          <CardTitle>{editingId ? 'Edit Work Cell' : 'Create New Work Cell'}</CardTitle>
          <CardDescription>
            {editingId ? 'Update work cell information' : 'Add a new work cell for capacity and WIP constraints'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Name - Required */}
              <div className="space-y-2">
                <Label htmlFor="name">Cell Name *</Label>
                <Input
                  id="name"
                  {...register('name', { 
                    required: 'Cell name is required',
                    maxLength: { value: 255, message: 'Name must be 255 characters or less' }
                  })}
                  placeholder="e.g., Production Cell A"
                />
                {errors.name && <p className="text-sm text-red-600">{errors.name.message}</p>}
              </div>

              {/* Cell Type - FIXED: Add value prop for proper binding */}
              <div className="space-y-2">
                <Label htmlFor="cell_type">Cell Type</Label>
                <Select 
                  value={watch('cell_type')} 
                  onValueChange={(value) => setValue('cell_type', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select cell type" />
                  </SelectTrigger>
                  <SelectContent>
                    {cellTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Department - FIXED: Add value prop and handle null properly */}
              <div className="space-y-2">
                <Label htmlFor="department_id">Department</Label>
                <Select 
                  value={watch('department_id')} 
                  onValueChange={(value) => setValue('department_id', value === 'null' ? '' : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No Department</SelectItem>
                    {departments.map((dept) => (
                      <SelectItem key={dept.department_id} value={dept.department_id}>
                        {dept.name} ({dept.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Floor Location */}
              <div className="space-y-2">
                <Label htmlFor="floor_location">Floor Location</Label>
                <Input
                  id="floor_location"
                  {...register('floor_location')}
                  placeholder="e.g., Building A, Floor 2, Zone 3"
                />
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

              {/* WIP Limit */}
              <div className="space-y-2">
                <Label htmlFor="wip_limit">WIP Limit</Label>
                <Input
                  id="wip_limit"
                  type="number"
                  min="0"
                  {...register('wip_limit', { 
                    valueAsNumber: true,
                    min: { value: 0, message: 'WIP limit must be non-negative' }
                  })}
                />
                <p className="text-xs text-gray-500">Work-in-progress limit for constraint generation</p>
                {errors.wip_limit && <p className="text-sm text-red-600">{errors.wip_limit.message}</p>}
              </div>

              {/* FIXED: Target Utilization as decimal */}
              <div className="space-y-2">
                <Label htmlFor="target_utilization">Target Utilization (0-1)</Label>
                <Input
                  id="target_utilization"
                  type="number"
                  min="0"
                  max="1"
                  step="0.01"
                  {...register('target_utilization', { 
                    valueAsNumber: true,
                    min: { value: 0, message: 'Target must be between 0 and 1' },
                    max: { value: 1, message: 'Target must be between 0 and 1' }
                  })}
                  placeholder="0.85"
                />
                <p className="text-xs text-gray-500">Target capacity utilization as decimal (0.85 = 85%)</p>
                {errors.target_utilization && <p className="text-sm text-red-600">{errors.target_utilization.message}</p>}
              </div>

              {/* Flow Priority */}
              <div className="space-y-2">
                <Label htmlFor="flow_priority">Flow Priority</Label>
                <Input
                  id="flow_priority"
                  type="number"
                  min="1"
                  {...register('flow_priority', { 
                    valueAsNumber: true,
                    min: { value: 1, message: 'Priority must be at least 1' }
                  })}
                />
                <p className="text-xs text-gray-500">Higher numbers = higher priority</p>
                {errors.flow_priority && <p className="text-sm text-red-600">{errors.flow_priority.message}</p>}
              </div>

              {/* FIXED: Add Calendar ID field */}
              <div className="space-y-2">
                <Label htmlFor="calendar_id">Business Calendar</Label>
                <Input
                  id="calendar_id"
                  {...register('calendar_id')}
                  placeholder="Calendar ID (optional)"
                />
                <p className="text-xs text-gray-500">Associated business calendar for scheduling</p>
              </div>

              {/* FIXED: Add Average Throughput field */}
              <div className="space-y-2">
                <Label htmlFor="average_throughput_per_hour">Avg Throughput/Hour</Label>
                <Input
                  id="average_throughput_per_hour"
                  type="number"
                  min="0"
                  step="0.1"
                  {...register('average_throughput_per_hour', { 
                    valueAsNumber: true,
                    min: { value: 0, message: 'Throughput must be non-negative' }
                  })}
                  placeholder="10.5"
                />
                <p className="text-xs text-gray-500">Average units processed per hour</p>
                {errors.average_throughput_per_hour && <p className="text-sm text-red-600">{errors.average_throughput_per_hour.message}</p>}
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
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingId ? 'Update' : 'Create'} Work Cell
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Work Cells List */}
      <Card>
        <CardHeader>
          <CardTitle>Work Cells</CardTitle>
          <CardDescription>Manage existing work cells</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : workCells.length === 0 ? (
            <p className="text-center text-gray-500 py-4">No work cells found</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Name</th>
                    <th className="text-left p-2">Type</th>
                    <th className="text-left p-2">Department</th>
                    <th className="text-left p-2">Capacity</th>
                    <th className="text-left p-2">WIP Limit</th>
                    <th className="text-left p-2">Target Util.</th>
                    <th className="text-left p-2">Priority</th>
                    <th className="text-left p-2">Throughput/Hr</th>
                    <th className="text-left p-2">Status</th>
                    <th className="text-left p-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {workCells.map((cell) => {
                    const department = departments.find(d => d.department_id === cell.department_id)
                    return (
                      <tr key={cell.cell_id} className="border-b hover:bg-gray-50">
                        <td className="p-2 font-medium">
                          <div>
                            {cell.name}
                            {cell.floor_location && (
                              <div className="text-xs text-gray-500">{cell.floor_location}</div>
                            )}
                          </div>
                        </td>
                        <td className="p-2 capitalize">{cell.cell_type}</td>
                        <td className="p-2">{department ? `${department.name} (${department.code})` : '-'}</td>
                        <td className="p-2">{cell.capacity}</td>
                        <td className="p-2">{cell.wip_limit || '-'}</td>
                        <td className="p-2">{(cell.target_utilization * 100).toFixed(1)}%</td>
                        <td className="p-2">{cell.flow_priority}</td>
                        <td className="p-2">{cell.average_throughput_per_hour?.toFixed(1) || '-'}</td>
                        <td className="p-2">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            cell.is_active 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {cell.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="p-2">
                          <div className="flex space-x-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEdit(cell)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDelete(cell.cell_id)}
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