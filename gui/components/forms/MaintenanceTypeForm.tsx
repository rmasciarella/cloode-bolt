"use client"

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, Edit, Trash2 } from 'lucide-react'

type MaintenanceType = {
  maintenance_type_id: string
  name: string
  description: string | null
  is_preventive: boolean
  is_emergency: boolean
  typical_duration_hours: number
  blocks_production: boolean
  allows_emergency_override: boolean
  requires_shutdown: boolean
  required_skill_level: string | null
  requires_external_vendor: boolean
  created_at: string
}

type MaintenanceTypeFormData = {
  name: string
  description: string
  is_preventive: boolean
  is_emergency: boolean
  typical_duration_hours: number
  blocks_production: boolean
  allows_emergency_override: boolean
  requires_shutdown: boolean
  required_skill_level: string
  requires_external_vendor: boolean
}

const skillLevels = [
  { value: 'NOVICE', label: 'Novice' },
  { value: 'COMPETENT', label: 'Competent' },
  { value: 'PROFICIENT', label: 'Proficient' },
  { value: 'EXPERT', label: 'Expert' }
]

export default function MaintenanceTypeForm() {
  const [maintenanceTypes, setMaintenanceTypes] = useState<MaintenanceType[]>([])
  const [loading, setLoading] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<MaintenanceTypeFormData>({
    defaultValues: {
      name: '',
      description: '',
      is_preventive: true,
      is_emergency: false,
      typical_duration_hours: 2.0,
      blocks_production: true,
      allows_emergency_override: false,
      requires_shutdown: true,
      required_skill_level: '',
      requires_external_vendor: false
    }
  })

  const fetchMaintenanceTypes = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('maintenance_types')
        .select('*')
        .order('name', { ascending: true })

      if (error) throw error
      setMaintenanceTypes(data || [])
    } catch (error) {
      console.error('Error fetching maintenance types:', error)
      toast({
        title: "Error",
        description: "Failed to fetch maintenance types",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMaintenanceTypes()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const onSubmit = async (data: MaintenanceTypeFormData) => {
    setIsSubmitting(true)
    try {
      const formData = {
        name: data.name,
        description: data.description || null,
        is_preventive: data.is_preventive,
        is_emergency: data.is_emergency,
        typical_duration_hours: data.typical_duration_hours,
        blocks_production: data.blocks_production,
        allows_emergency_override: data.allows_emergency_override,
        requires_shutdown: data.requires_shutdown,
        required_skill_level: data.required_skill_level || null,
        requires_external_vendor: data.requires_external_vendor
      }

      if (editingId) {
        const { error } = await supabase
          .from('maintenance_types')
          .update(formData)
          .eq('maintenance_type_id', editingId)

        if (error) throw error

        toast({
          title: "Success",
          description: "Maintenance type updated successfully"
        })
      } else {
        const { error } = await supabase
          .from('maintenance_types')
          .insert([formData])

        if (error) throw error

        toast({
          title: "Success",
          description: "Maintenance type created successfully"
        })
      }

      reset()
      setEditingId(null)
      fetchMaintenanceTypes()
    } catch (error) {
      console.error('Error saving maintenance type:', error)
      toast({
        title: "Error",
        description: "Failed to save maintenance type",
        variant: "destructive"
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = (maintenanceType: MaintenanceType) => {
    setEditingId(maintenanceType.maintenance_type_id)
    setValue('name', maintenanceType.name)
    setValue('description', maintenanceType.description || '')
    setValue('is_preventive', maintenanceType.is_preventive)
    setValue('is_emergency', maintenanceType.is_emergency)
    setValue('typical_duration_hours', maintenanceType.typical_duration_hours)
    setValue('blocks_production', maintenanceType.blocks_production)
    setValue('allows_emergency_override', maintenanceType.allows_emergency_override)
    setValue('requires_shutdown', maintenanceType.requires_shutdown)
    setValue('required_skill_level', maintenanceType.required_skill_level || '')
    setValue('requires_external_vendor', maintenanceType.requires_external_vendor)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this maintenance type?')) return

    try {
      const { error } = await supabase
        .from('maintenance_types')
        .delete()
        .eq('maintenance_type_id', id)

      if (error) throw error

      toast({
        title: "Success",
        description: "Maintenance type deleted successfully"
      })
      fetchMaintenanceTypes()
    } catch (error) {
      console.error('Error deleting maintenance type:', error)
      toast({
        title: "Error",
        description: "Failed to delete maintenance type",
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
          <CardTitle>{editingId ? 'Edit Maintenance Type' : 'Create New Maintenance Type'}</CardTitle>
          <CardDescription>
            {editingId ? 'Update maintenance type information' : 'Define a new type of maintenance activity for scheduling'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Name - Required */}
              <div className="space-y-2">
                <Label htmlFor="name">Maintenance Type Name *</Label>
                <Input
                  id="name"
                  {...register('name', { 
                    required: 'Maintenance type name is required',
                    maxLength: { value: 255, message: 'Name must be 255 characters or less' }
                  })}
                  placeholder="e.g., Preventive Maintenance, Emergency Repair"
                />
                {errors.name && <p className="text-sm text-red-600">{errors.name.message}</p>}
              </div>

              {/* Typical Duration */}
              <div className="space-y-2">
                <Label htmlFor="typical_duration_hours">Typical Duration (hours)</Label>
                <Input
                  id="typical_duration_hours"
                  type="number"
                  min="0"
                  step="0.1"
                  {...register('typical_duration_hours', { 
                    valueAsNumber: true,
                    min: { value: 0, message: 'Duration must be non-negative' }
                  })}
                />
                {errors.typical_duration_hours && <p className="text-sm text-red-600">{errors.typical_duration_hours.message}</p>}
              </div>

              {/* Required Skill Level */}
              <div className="space-y-2">
                <Label htmlFor="required_skill_level">Required Skill Level</Label>
                <Select onValueChange={(value) => setValue('required_skill_level', value)}>
                  <SelectTrigger id="required_skill_level">
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
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                {...register('description')}
                placeholder="Detailed description of the maintenance type and procedures"
                rows={3}
              />
            </div>

            {/* Maintenance Characteristics */}
            <div className="space-y-4">
              <Label className="text-base font-medium">Maintenance Characteristics</Label>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="is_preventive"
                    name="is_preventive"
                    checked={watch('is_preventive')}
                    onCheckedChange={(checked) => setValue('is_preventive', checked as boolean)}
                  />
                  <Label htmlFor="is_preventive">Preventive Maintenance</Label>
                  <p className="text-xs text-gray-500 ml-2">Scheduled maintenance to prevent failures</p>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="is_emergency"
                    name="is_emergency"
                    checked={watch('is_emergency')}
                    onCheckedChange={(checked) => setValue('is_emergency', checked as boolean)}
                  />
                  <Label htmlFor="is_emergency">Emergency Maintenance</Label>
                  <p className="text-xs text-gray-500 ml-2">Unplanned maintenance for failures</p>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="blocks_production"
                    name="blocks_production"
                    checked={watch('blocks_production')}
                    onCheckedChange={(checked) => setValue('blocks_production', checked as boolean)}
                  />
                  <Label htmlFor="blocks_production">Blocks Production</Label>
                  <p className="text-xs text-gray-500 ml-2">Prevents production during maintenance</p>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="allows_emergency_override"
                    name="allows_emergency_override"
                    checked={watch('allows_emergency_override')}
                    onCheckedChange={(checked) => setValue('allows_emergency_override', checked as boolean)}
                  />
                  <Label htmlFor="allows_emergency_override">Allows Emergency Override</Label>
                  <p className="text-xs text-gray-500 ml-2">Can be interrupted for emergencies</p>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="requires_shutdown"
                    name="requires_shutdown"
                    checked={watch('requires_shutdown')}
                    onCheckedChange={(checked) => setValue('requires_shutdown', checked as boolean)}
                  />
                  <Label htmlFor="requires_shutdown">Requires Shutdown</Label>
                  <p className="text-xs text-gray-500 ml-2">Equipment must be shut down</p>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="requires_external_vendor"
                    name="requires_external_vendor"
                    checked={watch('requires_external_vendor')}
                    onCheckedChange={(checked) => setValue('requires_external_vendor', checked as boolean)}
                  />
                  <Label htmlFor="requires_external_vendor">Requires External Vendor</Label>
                  <p className="text-xs text-gray-500 ml-2">Needs external service provider</p>
                </div>
              </div>
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
                {editingId ? 'Update' : 'Create'} Maintenance Type
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Maintenance Types List */}
      <Card>
        <CardHeader>
          <CardTitle>Maintenance Types</CardTitle>
          <CardDescription>Manage existing maintenance types</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : maintenanceTypes.length === 0 ? (
            <p className="text-center text-gray-500 py-4">No maintenance types found</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Name</th>
                    <th className="text-left p-2">Duration</th>
                    <th className="text-left p-2">Skill Level</th>
                    <th className="text-left p-2">Type</th>
                    <th className="text-left p-2">Impact</th>
                    <th className="text-left p-2">Requirements</th>
                    <th className="text-left p-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {maintenanceTypes.map((maintenanceType) => (
                    <tr key={maintenanceType.maintenance_type_id} className="border-b hover:bg-gray-50">
                      <td className="p-2 font-medium">{maintenanceType.name}</td>
                      <td className="p-2">{maintenanceType.typical_duration_hours}h</td>
                      <td className="p-2">
                        {maintenanceType.required_skill_level ? (
                          <span className="capitalize">{maintenanceType.required_skill_level.toLowerCase()}</span>
                        ) : '-'}
                      </td>
                      <td className="p-2">
                        <div className="flex flex-wrap gap-1">
                          {maintenanceType.is_preventive && (
                            <span className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">Preventive</span>
                          )}
                          {maintenanceType.is_emergency && (
                            <span className="px-2 py-1 rounded-full text-xs bg-red-100 text-red-800">Emergency</span>
                          )}
                        </div>
                      </td>
                      <td className="p-2">
                        <div className="flex flex-wrap gap-1">
                          {maintenanceType.blocks_production && (
                            <span className="px-2 py-1 rounded-full text-xs bg-orange-100 text-orange-800">Blocks Prod</span>
                          )}
                          {maintenanceType.requires_shutdown && (
                            <span className="px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-800">Shutdown</span>
                          )}
                        </div>
                      </td>
                      <td className="p-2">
                        <div className="flex flex-wrap gap-1">
                          {maintenanceType.allows_emergency_override && (
                            <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">Override OK</span>
                          )}
                          {maintenanceType.requires_external_vendor && (
                            <span className="px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-800">Ext Vendor</span>
                          )}
                        </div>
                      </td>
                      <td className="p-2">
                        <div className="flex space-x-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(maintenanceType)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDelete(maintenanceType.maintenance_type_id)}
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