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

type Skill = {
  skill_id: string
  name: string
  description: string | null
  category: string | null
  department_id: string | null
  complexity_level: string
  training_hours_required: number
  certification_required: boolean
  certification_expires_after_months: number | null
  market_hourly_rate: number | null
  skill_scarcity_level: string
  is_active: boolean
  created_at: string
}

type Department = {
  department_id: string
  name: string
  code: string
}

type SkillFormData = {
  name: string
  description: string
  category: string
  department_id: string
  complexity_level: string
  training_hours_required: number
  certification_required: boolean
  certification_expires_after_months: number
  market_hourly_rate: number
  skill_scarcity_level: string
  is_active: boolean
}

const complexityLevels = [
  { value: 'basic', label: 'Basic' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
  { value: 'expert', label: 'Expert' }
]

const scarcityLevels = [
  { value: 'common', label: 'Common' },
  { value: 'uncommon', label: 'Uncommon' },
  { value: 'rare', label: 'Rare' },
  { value: 'critical', label: 'Critical' }
]

const skillCategories = [
  'mechanical',
  'electrical',
  'software',
  'quality',
  'safety',
  'maintenance',
  'production',
  'assembly',
  'testing',
  'packaging'
]

export default function SkillForm() {
  const [skills, setSkills] = useState<Skill[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<SkillFormData>({
    defaultValues: {
      name: '',
      description: '',
      category: '',
      department_id: '',
      complexity_level: 'basic',
      training_hours_required: 0,
      certification_required: false,
      certification_expires_after_months: 12,
      market_hourly_rate: 0,
      skill_scarcity_level: 'common',
      is_active: true
    }
  })

  const fetchSkills = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('skills')
        .select('*')
        .order('name', { ascending: true })

      if (error) throw error
      setSkills(data || [])
    } catch (error) {
      console.error('Error fetching skills:', error)
      toast({
        title: "Error",
        description: "Failed to fetch skills",
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
    fetchSkills()
    fetchDepartments()
  }, [])

  const onSubmit = async (data: SkillFormData) => {
    setIsSubmitting(true)
    try {
      const formData = {
        name: data.name,
        description: data.description || null,
        category: data.category && data.category !== '' ? data.category : null,
        department_id: data.department_id && data.department_id !== '' ? data.department_id : null,
        complexity_level: data.complexity_level,
        training_hours_required: data.training_hours_required,
        certification_required: data.certification_required,
        certification_expires_after_months: data.certification_required ? data.certification_expires_after_months : null,
        market_hourly_rate: data.market_hourly_rate || null,
        skill_scarcity_level: data.skill_scarcity_level,
        is_active: data.is_active
      }

      if (editingId) {
        const { error } = await supabase
          .from('skills')
          .update(formData)
          .eq('skill_id', editingId)

        if (error) throw error

        toast({
          title: "Success",
          description: "Skill updated successfully"
        })
      } else {
        const { error } = await supabase
          .from('skills')
          .insert([formData])

        if (error) throw error

        toast({
          title: "Success",
          description: "Skill created successfully"
        })
      }

      reset()
      setEditingId(null)
      fetchSkills()
    } catch (error) {
      console.error('Error saving skill:', error)
      toast({
        title: "Error",
        description: "Failed to save skill",
        variant: "destructive"
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = (skill: Skill) => {
    setEditingId(skill.skill_id)
    setValue('name', skill.name)
    setValue('description', skill.description || '')
    setValue('category', skill.category || '')
    setValue('department_id', skill.department_id || '')
    setValue('complexity_level', skill.complexity_level)
    setValue('training_hours_required', skill.training_hours_required)
    setValue('certification_required', skill.certification_required)
    setValue('certification_expires_after_months', skill.certification_expires_after_months || 12)
    setValue('market_hourly_rate', skill.market_hourly_rate || 0)
    setValue('skill_scarcity_level', skill.skill_scarcity_level)
    setValue('is_active', skill.is_active)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this skill?')) return

    try {
      const { error } = await supabase
        .from('skills')
        .delete()
        .eq('skill_id', id)

      if (error) throw error

      toast({
        title: "Success",
        description: "Skill deleted successfully"
      })
      fetchSkills()
    } catch (error) {
      console.error('Error deleting skill:', error)
      toast({
        title: "Error",
        description: "Failed to delete skill",
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
          <CardTitle>{editingId ? 'Edit Skill' : 'Create New Skill'}</CardTitle>
          <CardDescription>
            {editingId ? 'Update skill information' : 'Add a new skill capability to the system'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Name - Required */}
              <div className="space-y-2">
                <Label htmlFor="name">Skill Name *</Label>
                <Input
                  id="name"
                  {...register('name', { 
                    required: 'Skill name is required',
                    maxLength: { value: 255, message: 'Name must be 255 characters or less' }
                  })}
                  placeholder="e.g., CNC Operation, Quality Inspection"
                />
                {errors.name && <p className="text-sm text-red-600">{errors.name.message}</p>}
              </div>

              {/* Category */}
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select value={watch('category') || ''} onValueChange={(value) => setValue('category', value === 'none' ? '' : value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Category</SelectItem>
                    {skillCategories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category.charAt(0).toUpperCase() + category.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Department */}
              <div className="space-y-2">
                <Label htmlFor="department_id">Department</Label>
                <Select value={watch('department_id') || ''} onValueChange={(value) => setValue('department_id', value === 'none' ? '' : value)}>
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

              {/* Complexity Level */}
              <div className="space-y-2">
                <Label htmlFor="complexity_level">Complexity Level</Label>
                <Select value={watch('complexity_level')} onValueChange={(value) => setValue('complexity_level', value)}>
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

              {/* Training Hours Required */}
              <div className="space-y-2">
                <Label htmlFor="training_hours_required">Training Hours Required</Label>
                <Input
                  id="training_hours_required"
                  type="number"
                  min="0"
                  {...register('training_hours_required', { 
                    valueAsNumber: true,
                    min: { value: 0, message: 'Training hours must be non-negative' }
                  })}
                />
                {errors.training_hours_required && <p className="text-sm text-red-600">{errors.training_hours_required.message}</p>}
              </div>

              {/* Certification Expires After Months */}
              <div className="space-y-2">
                <Label htmlFor="certification_expires_after_months">Certification Validity (months)</Label>
                <Input
                  id="certification_expires_after_months"
                  type="number"
                  min="1"
                  disabled={!watch('certification_required')}
                  {...register('certification_expires_after_months', { 
                    valueAsNumber: true,
                    min: { value: 1, message: 'Must be at least 1 month' }
                  })}
                />
                <p className="text-xs text-gray-500">Only applies if certification is required</p>
                {errors.certification_expires_after_months && <p className="text-sm text-red-600">{errors.certification_expires_after_months.message}</p>}
              </div>

              {/* Market Hourly Rate */}
              <div className="space-y-2">
                <Label htmlFor="market_hourly_rate">Market Hourly Rate ($)</Label>
                <Input
                  id="market_hourly_rate"
                  type="number"
                  min="0"
                  step="0.01"
                  {...register('market_hourly_rate', { 
                    valueAsNumber: true,
                    min: { value: 0, message: 'Rate must be non-negative' }
                  })}
                />
                {errors.market_hourly_rate && <p className="text-sm text-red-600">{errors.market_hourly_rate.message}</p>}
              </div>

              {/* Skill Scarcity Level */}
              <div className="space-y-2">
                <Label htmlFor="skill_scarcity_level">Scarcity Level</Label>
                <Select value={watch('skill_scarcity_level')} onValueChange={(value) => setValue('skill_scarcity_level', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select scarcity" />
                  </SelectTrigger>
                  <SelectContent>
                    {scarcityLevels.map((level) => (
                      <SelectItem key={level.value} value={level.value}>
                        {level.label}
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
                placeholder="Detailed description of the skill and its requirements"
                rows={3}
              />
            </div>

            {/* Checkboxes */}
            <div className="flex flex-col space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="certification_required"
                  checked={watch('certification_required')}
                  onCheckedChange={(checked) => setValue('certification_required', checked as boolean)}
                />
                <Label htmlFor="certification_required">Certification Required</Label>
                <p className="text-xs text-gray-500 ml-2">Operators must have formal certification</p>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="is_active"
                  checked={watch('is_active')}
                  onCheckedChange={(checked) => setValue('is_active', checked as boolean)}
                />
                <Label htmlFor="is_active">Active</Label>
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
                {editingId ? 'Update' : 'Create'} Skill
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Skills List */}
      <Card>
        <CardHeader>
          <CardTitle>Skills</CardTitle>
          <CardDescription>Manage existing skills</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : skills.length === 0 ? (
            <p className="text-center text-gray-500 py-4">No skills found</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Name</th>
                    <th className="text-left p-2">Category</th>
                    <th className="text-left p-2">Department</th>
                    <th className="text-left p-2">Complexity</th>
                    <th className="text-left p-2">Training Hours</th>
                    <th className="text-left p-2">Market Rate</th>
                    <th className="text-left p-2">Scarcity</th>
                    <th className="text-left p-2">Status</th>
                    <th className="text-left p-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {skills.map((skill) => {
                    const department = departments.find(d => d.department_id === skill.department_id)
                    return (
                      <tr key={skill.skill_id} className="border-b hover:bg-gray-50">
                        <td className="p-2 font-medium">
                          <div>
                            {skill.name}
                            {skill.certification_required && (
                              <span className="ml-2 px-2 py-1 rounded-full text-xs bg-orange-100 text-orange-800">Cert Required</span>
                            )}
                          </div>
                        </td>
                        <td className="p-2 capitalize">{skill.category || '-'}</td>
                        <td className="p-2">{department ? `${department.name} (${department.code})` : '-'}</td>
                        <td className="p-2 capitalize">{skill.complexity_level}</td>
                        <td className="p-2">{skill.training_hours_required}h</td>
                        <td className="p-2">{skill.market_hourly_rate ? `$${skill.market_hourly_rate.toFixed(2)}` : '-'}</td>
                        <td className="p-2">
                          <span className={`px-2 py-1 rounded-full text-xs capitalize ${
                            skill.skill_scarcity_level === 'critical' 
                              ? 'bg-red-100 text-red-800'
                              : skill.skill_scarcity_level === 'rare'
                              ? 'bg-orange-100 text-orange-800'
                              : skill.skill_scarcity_level === 'uncommon'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {skill.skill_scarcity_level}
                          </span>
                        </td>
                        <td className="p-2">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            skill.is_active 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {skill.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="p-2">
                          <div className="flex space-x-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEdit(skill)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDelete(skill.skill_id)}
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