"use client"

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { workCellService, departmentService } from '@/lib/services'
import { workCellFormSchema, type WorkCellFormData, cellTypes } from '@/lib/schemas'
import { Database } from '@/lib/database.types'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, Edit, Trash2 } from 'lucide-react'

type WorkCell = Database['public']['Tables']['work_cells']['Row']
type Department = Database['public']['Tables']['departments']['Row']

export default function WorkCellForm() {
  const [workCells, setWorkCells] = useState<WorkCell[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<WorkCellFormData>({
    resolver: zodResolver(workCellFormSchema),
    defaultValues: {
      name: '',
      capacity: 1,
      department_id: '',
      wip_limit: 5,
      flow_priority: 1,
      floor_location: '',
      cell_type: 'production',
      target_utilization: 85,  // Form input expects percentage (0-100)
      calendar_id: '',
      average_throughput_per_hour: 0,
      is_active: true
    }
  })

  const fetchWorkCells = async () => {
    setLoading(true)
    const response = await workCellService.getAll()
    
    if (response.success && response.data) {
      setWorkCells(response.data)
    } else {
      console.error('Error fetching work cells:', response.error)
      toast({
        title: "Error",
        description: response.error || "Failed to fetch work cells",
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
    fetchWorkCells()
    fetchDepartments()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const onSubmit = async (data: WorkCellFormData) => {
    setIsSubmitting(true)
    
    // Data is already transformed by Zod schema (percentage to decimal)
    let response
    if (editingId) {
      response = await workCellService.update(editingId, data)
    } else {
      response = await workCellService.create(data)
    }

    if (response.success) {
      toast({
        title: "Success",
        description: `Work cell ${editingId ? 'updated' : 'created'} successfully`
      })
      reset()
      setEditingId(null)
      fetchWorkCells()
    } else {
      console.error('Error saving work cell:', response.error)
      toast({
        title: "Error",
        description: response.error || "Failed to save work cell",
        variant: "destructive"
      })
    }
    
    setIsSubmitting(false)
  }

  const handleEdit = (workCell: WorkCell) => {
    setEditingId(workCell.cell_id)
    setValue('name', workCell.name)
    setValue('capacity', workCell.capacity)
    setValue('department_id', workCell.department_id || '')
    setValue('wip_limit', workCell.wip_limit || 0)
    setValue('target_utilization', workCell.target_utilization * 100) // Convert decimal to %
    setValue('flow_priority', workCell.flow_priority)
    setValue('floor_location', workCell.floor_location || '')
    setValue('cell_type', workCell.cell_type as typeof cellTypes[number])
    setValue('is_active', workCell.is_active)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this work cell?')) return

    const response = await workCellService.delete(id)
    
    if (response.success) {
      toast({
        title: "Success",
        description: "Work cell deleted successfully"
      })
      fetchWorkCells()
    } else {
      console.error('Error deleting work cell:', response.error)
      toast({
        title: "Error",
        description: response.error || "Failed to delete work cell",
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
                  {...register('name')}
                  placeholder="e.g., Production Cell A"
                />
                {errors.name && <p className="text-sm text-red-600">{errors.name.message}</p>}
              </div>

              {/* Cell Type */}
              <div className="space-y-2">
                <Label htmlFor="cell_type">Cell Type</Label>
                <Select onValueChange={(value) => setValue('cell_type', value as typeof cellTypes[number])}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select cell type" />
                  </SelectTrigger>
                  <SelectContent>
                    {cellTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Department */}
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
                  {...register('capacity', { valueAsNumber: true })}
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
                  {...register('wip_limit', { valueAsNumber: true })}
                />
                <p className="text-xs text-gray-500">Work-in-progress limit for constraint generation</p>
                {errors.wip_limit && <p className="text-sm text-red-600">{errors.wip_limit.message}</p>}
              </div>

              {/* Target Utilization % */}
              <div className="space-y-2">
                <Label htmlFor="utilization_target_percent">Target Utilization (%)</Label>
                <Input
                  id="utilization_target_percent"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  {...register('target_utilization', { valueAsNumber: true })}
                  placeholder="85.0"
                />
                <p className="text-xs text-gray-500">Target capacity utilization percentage for optimization</p>
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
            </div>

            {/* Active Checkbox */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_active"
                checked={watch('is_active')}
                onCheckedChange={(checked) => setValue('is_active', !!checked)}
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