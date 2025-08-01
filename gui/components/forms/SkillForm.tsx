"use client"

import { useState, useEffect, useCallback, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import { performanceMonitor } from '@/lib/performance/monitoring'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { MassUploader } from '@/components/ui/mass-uploader'
import { AdvancedFilter, BulkOperations, useAdvancedTable } from '@/components/ui/advanced-patterns'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Loader2, Edit, Trash2, Upload, Search, Filter, ArrowUpDown, ChevronUp, ChevronDown } from 'lucide-react'

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

// Form-specific performance metrics interface
interface FormPerformanceMetrics {
  loadTime: number
  submissionTime: number
  validationTime: number
  interactionCount: number
  errorCount: number
  fieldFocusEvents: Record<string, number>
  timestamp: number
}

// Performance tracking class for form-specific metrics
class FormPerformanceTracker {
  private metrics: FormPerformanceMetrics
  private loadStartTime: number
  private submissionStartTime: number | null = null
  private validationStartTime: number | null = null
  
  constructor() {
    this.loadStartTime = performance.now()
    this.metrics = {
      loadTime: 0,
      submissionTime: 0,
      validationTime: 0,
      interactionCount: 0,
      errorCount: 0,
      fieldFocusEvents: {},
      timestamp: Date.now()
    }
  }
  
  recordLoadComplete() {
    this.metrics.loadTime = performance.now() - this.loadStartTime
    this.reportMetric('form_load_time', this.metrics.loadTime)
  }
  
  startSubmission() {
    this.submissionStartTime = performance.now()
  }
  
  recordSubmissionComplete(success: boolean) {
    if (this.submissionStartTime) {
      this.metrics.submissionTime = performance.now() - this.submissionStartTime
      this.reportMetric('form_submission_time', this.metrics.submissionTime)
      
      if (!success) {
        this.metrics.errorCount++
        this.reportMetric('form_submission_error', 1)
      } else {
        this.reportMetric('form_submission_success', 1)
      }
    }
  }
  
  startValidation() {
    this.validationStartTime = performance.now()
  }
  
  recordValidationComplete() {
    if (this.validationStartTime) {
      this.metrics.validationTime = performance.now() - this.validationStartTime
      this.reportMetric('form_validation_time', this.metrics.validationTime)
    }
  }
  
  recordInteraction(type: 'click' | 'focus' | 'change', fieldName?: string) {
    this.metrics.interactionCount++
    
    if (type === 'focus' && fieldName) {
      this.metrics.fieldFocusEvents[fieldName] = (this.metrics.fieldFocusEvents[fieldName] || 0) + 1
    }
    
    this.reportMetric(`form_${type}_interaction`, 1)
  }
  
  recordError(field?: string) {
    this.metrics.errorCount++
    this.reportMetric('form_validation_error', 1)
    
    if (field) {
      this.reportMetric(`form_field_error_${field}`, 1)
    }
  }
  
  reportMetric(name: string, value: number) {
    // Log to existing performance monitor system
    if (process.env.NODE_ENV === 'development') {
      console.log(`[FORM-PERF] SkillForm ${name}: ${value}${name.includes('time') ? 'ms' : ''}`)
    }
    
    // Report slow operations
    if (name.includes('time') && value > 1000) {
      console.warn(`[FORM-PERF] Slow SkillForm ${name}: ${value}ms`)
    }
    
    // Integrate with global performance monitoring
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', name, {
        form_name: 'skill_form',
        value: value,
        custom_map: { metric1: 'form_performance' }
      })
    }
  }
  
  getMetrics(): FormPerformanceMetrics {
    return { ...this.metrics }
  }
  
  getSummary() {
    return {
      formName: 'SkillForm',
      loadTime: this.metrics.loadTime,
      submissionTime: this.metrics.submissionTime,
      validationTime: this.metrics.validationTime,
      interactionCount: this.metrics.interactionCount,
      errorCount: this.metrics.errorCount,
      errorRate: this.metrics.interactionCount > 0 ? (this.metrics.errorCount / this.metrics.interactionCount) * 100 : 0,
      mostFocusedField: Object.keys(this.metrics.fieldFocusEvents).reduce((a, b) => 
        this.metrics.fieldFocusEvents[a] > this.metrics.fieldFocusEvents[b] ? a : b, ''),
      timestamp: this.metrics.timestamp
    }
  }
}

export default function SkillForm() {
  const [skills, setSkills] = useState<Skill[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [bulkProgress, setBulkProgress] = useState(0)
  const [showBulkProgress, setShowBulkProgress] = useState(false)
  const { toast } = useToast()

  // Performance tracking
  const performanceTracker = useRef<FormPerformanceTracker>(new FormPerformanceTracker())
  const hasRecordedLoad = useRef(false)

  // Advanced table functionality
  const advancedTable = useAdvancedTable<Skill>(
    skills,
    (skill) => skill.skill_id,
    {
      enableFiltering: true,
      enableBulkOperations: true,
      enableSorting: true
    }
  )

  // Filter options for skills
  const filterOptions = [
    { key: 'name', label: 'Skill Name', type: 'text' as const },
    { key: 'category', label: 'Category', type: 'text' as const },
    { key: 'complexity_level', label: 'Complexity Level', type: 'select' as const, options: complexityLevels },
    { key: 'skill_scarcity_level', label: 'Scarcity Level', type: 'select' as const, options: scarcityLevels },
    { key: 'certification_required', label: 'Requires Certification', type: 'boolean' as const },
    { key: 'is_active', label: 'Active', type: 'boolean' as const },
    { key: 'training_hours_required', label: 'Training Hours', type: 'number' as const },
    { key: 'market_hourly_rate', label: 'Market Rate', type: 'number' as const }
  ]

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

  // Track validation errors
  useEffect(() => {
    Object.keys(errors).forEach(field => {
      performanceTracker.current.recordError(field)
    })
  }, [errors])

  const fetchSkills = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('skills')
        .select('*')
        .order('name', { ascending: true })

      if (error) throw error
      setSkills(data || [])
      
      // Record load complete if this is the initial load
      if (!hasRecordedLoad.current) {
        performanceTracker.current.recordLoadComplete()
        hasRecordedLoad.current = true
      }
    } catch (error) {
      console.error('Error fetching skills:', error)
      performanceTracker.current.recordError('data_fetch')
      toast({
        title: "Error",
        description: "Failed to fetch skills",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  const fetchDepartments = useCallback(async () => {
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
  }, [])

  useEffect(() => {
    fetchSkills()
    fetchDepartments()
  }, [fetchSkills, fetchDepartments])

  // Cleanup and performance summary on unmount
  useEffect(() => {
    // Expose performance data in development
    if (process.env.NODE_ENV === 'development') {
      (window as any).skillFormPerformance = {
        getMetrics: () => performanceTracker.current.getMetrics(),
        getSummary: () => performanceTracker.current.getSummary()
      }
    }

    return () => {
      // Log performance summary on unmount
      if (process.env.NODE_ENV === 'development') {
        const summary = performanceTracker.current.getSummary()
        console.log('[FORM-PERF] SkillForm Performance Summary:', summary)
        
        // Clean up global reference
        if ((window as any).skillFormPerformance) {
          delete (window as any).skillFormPerformance
        }
      }
    }
  }, [])

  const onSubmit = async (data: SkillFormData) => {
    setIsSubmitting(true)
    performanceTracker.current.startSubmission()
    performanceTracker.current.startValidation()
    
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

      performanceTracker.current.recordValidationComplete()
      performanceTracker.current.recordSubmissionComplete(true)
      
      reset()
      setEditingId(null)
      fetchSkills()
    } catch (error) {
      console.error('Error saving skill:', error)
      performanceTracker.current.recordSubmissionComplete(false)
      performanceTracker.current.recordError('submission')
      
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

  // Enhanced bulk operations
  const handleBulkDelete = async (ids: string[]) => {
    if (!confirm(`Are you sure you want to delete ${ids.length} skill(s)?`)) return

    setShowBulkProgress(true)
    setBulkProgress(0)

    try {
      const total = ids.length
      let completed = 0

      for (const id of ids) {
        const { error } = await supabase
          .from('skills')
          .delete()
          .eq('skill_id', id)

        if (error) throw error
        
        completed++
        setBulkProgress(Math.round((completed / total) * 100))
      }

      toast({
        title: "Success",
        description: `${ids.length} skill(s) deleted successfully`
      })
      
      advancedTable.clearSelection()
      fetchSkills()
    } catch (error) {
      console.error('Error bulk deleting skills:', error)
      toast({
        title: "Error",
        description: "Failed to delete some skills",
        variant: "destructive"
      })
    } finally {
      setShowBulkProgress(false)
      setBulkProgress(0)
    }
  }

  const handleBulkToggleActive = async (ids: string[]) => {
    setShowBulkProgress(true)
    setBulkProgress(0)

    try {
      const total = ids.length
      let completed = 0

      for (const id of ids) {
        const skill = skills.find(s => s.skill_id === id)
        if (!skill) continue

        const { error } = await supabase
          .from('skills')
          .update({ is_active: !skill.is_active })
          .eq('skill_id', id)

        if (error) throw error
        
        completed++
        setBulkProgress(Math.round((completed / total) * 100))
      }

      toast({
        title: "Success",
        description: `${ids.length} skill(s) status updated successfully`
      })
      
      advancedTable.clearSelection()
      fetchSkills()
    } catch (error) {
      console.error('Error bulk updating skills:', error)
      toast({
        title: "Error",
        description: "Failed to update some skills",
        variant: "destructive"
      })
    } finally {
      setShowBulkProgress(false)
      setBulkProgress(0)
    }
  }

  const handleBulkUpdateComplexity = async (ids: string[], newComplexity: string) => {
    setShowBulkProgress(true)
    setBulkProgress(0)

    try {
      const total = ids.length
      let completed = 0

      for (const id of ids) {
        const { error } = await supabase
          .from('skills')
          .update({ complexity_level: newComplexity })
          .eq('skill_id', id)

        if (error) throw error
        
        completed++
        setBulkProgress(Math.round((completed / total) * 100))
      }

      toast({
        title: "Success",
        description: `${ids.length} skill(s) complexity level updated successfully`
      })
      
      advancedTable.clearSelection()
      fetchSkills()
    } catch (error) {
      console.error('Error bulk updating complexity:', error)
      toast({
        title: "Error",
        description: "Failed to update complexity for some skills",
        variant: "destructive"
      })
    } finally {
      setShowBulkProgress(false)
      setBulkProgress(0)
    }
  }

  const handleBulkUpdateCertification = async (ids: string[], requiresCert: boolean) => {
    setShowBulkProgress(true)
    setBulkProgress(0)

    try {
      const total = ids.length
      let completed = 0

      for (const id of ids) {
        const { error } = await supabase
          .from('skills')
          .update({ 
            certification_required: requiresCert,
            certification_expires_after_months: requiresCert ? 12 : null
          })
          .eq('skill_id', id)

        if (error) throw error
        
        completed++
        setBulkProgress(Math.round((completed / total) * 100))
      }

      toast({
        title: "Success",
        description: `${ids.length} skill(s) certification requirement updated successfully`
      })
      
      advancedTable.clearSelection()
      fetchSkills()
    } catch (error) {
      console.error('Error bulk updating certification:', error)
      toast({
        title: "Error",
        description: "Failed to update certification for some skills",
        variant: "destructive"
      })
    } finally {
      setShowBulkProgress(false)
      setBulkProgress(0)
    }
  }

  // Enhanced sorting
  const handleSort = (column: string) => {
    if (advancedTable.sortBy === column) {
      advancedTable.setSortDirection(advancedTable.sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      advancedTable.setSortBy(column)
      advancedTable.setSortDirection('asc')
    }
  }

  const getSortIcon = (column: string) => {
    if (advancedTable.sortBy !== column) {
      return <ArrowUpDown className="h-4 w-4 ml-1 opacity-50" />
    }
    return advancedTable.sortDirection === 'asc' 
      ? <ChevronUp className="h-4 w-4 ml-1" />
      : <ChevronDown className="h-4 w-4 ml-1" />
  }

  // Get complexity level badge color
  const getComplexityColor = (level: string) => {
    switch (level) {
      case 'basic': return 'bg-green-100 text-green-800'
      case 'intermediate': return 'bg-yellow-100 text-yellow-800'
      case 'advanced': return 'bg-orange-100 text-orange-800'
      case 'expert': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const handleCancel = () => {
    reset()
    setEditingId(null)
  }

  const sampleSkillData = {
    name: 'CNC Programming',
    description: 'Ability to program CNC machines using G-code',
    category: 'Manufacturing',
    department_id: null,
    complexity_level: 'INTERMEDIATE',
    training_hours_required: 40,
    certification_required: true,
    certification_expires_after_months: 24,
    market_hourly_rate: 28.50,
    skill_scarcity_level: 'MEDIUM',
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
                    maxLength: { value: 255, message: 'Name must be 255 characters or less' },
                    onChange: () => performanceTracker.current.recordInteraction('change', 'name')
                  })}
                  placeholder="e.g., CNC Operation, Quality Inspection"
                  onFocus={() => performanceTracker.current.recordInteraction('focus', 'name')}
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
                    min: { value: 0, message: 'Training hours must be non-negative' },
                    onChange: () => performanceTracker.current.recordInteraction('change', 'training_hours_required')
                  })}
                  onFocus={() => performanceTracker.current.recordInteraction('focus', 'training_hours_required')}
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
                    min: { value: 0, message: 'Rate must be non-negative' },
                    onChange: () => performanceTracker.current.recordInteraction('change', 'market_hourly_rate')
                  })}
                  onFocus={() => performanceTracker.current.recordInteraction('focus', 'market_hourly_rate')}
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
                {...register('description', {
                  onChange: () => performanceTracker.current.recordInteraction('change', 'description')
                })}
                placeholder="Detailed description of the skill and its requirements"
                rows={3}
                onFocus={() => performanceTracker.current.recordInteraction('focus', 'description')}
              />
            </div>

            {/* Checkboxes */}
            <div className="flex flex-col space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="certification_required"
                  checked={watch('certification_required')}
                  onCheckedChange={(checked) => {
                    performanceTracker.current.recordInteraction('click', 'certification_required')
                    setValue('certification_required', checked as boolean)
                  }}
                />
                <Label htmlFor="certification_required">Certification Required</Label>
                <p className="text-xs text-gray-500 ml-2">Operators must have formal certification</p>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="is_active"
                  checked={watch('is_active')}
                  onCheckedChange={(checked) => {
                    performanceTracker.current.recordInteraction('click', 'is_active')
                    setValue('is_active', checked as boolean)
                  }}
                />
                <Label htmlFor="is_active">Active</Label>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-2 pt-4">
              {editingId && (
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    performanceTracker.current.recordInteraction('click', 'cancel_button')
                    handleCancel()
                  }}
                >
                  Cancel
                </Button>
              )}
              <Button 
                type="submit" 
                disabled={isSubmitting}
                onClick={() => performanceTracker.current.recordInteraction('click', 'submit_button')}
              >
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingId ? 'Update' : 'Create'} Skill
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
        </TabsContent>
        
        <TabsContent value="bulk" className="space-y-6">
          <MassUploader
            tableName="skills"
            entityName="Skill"
            sampleData={sampleSkillData}
            onUploadComplete={fetchSkills}
            requiredFields={['name', 'complexity_level', 'training_hours_required', 'skill_scarcity_level']}
            fieldDescriptions={{
              name: 'Skill display name',
              category: 'Skill category (e.g., Manufacturing, Quality)',
              complexity_level: 'BASIC, INTERMEDIATE, ADVANCED, EXPERT',
              training_hours_required: 'Hours needed to acquire skill',
              skill_scarcity_level: 'LOW, MEDIUM, HIGH, VERY_HIGH'
            }}
          />
        </TabsContent>
      </Tabs>

      {/* Skills List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div>
              Skills
              <Badge variant="secondary" className="ml-2">
                {advancedTable.filteredCount} of {advancedTable.totalCount}
              </Badge>
            </div>
          </CardTitle>
          <CardDescription>Manage existing skills with advanced filtering and bulk operations</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Advanced Filter */}
          <AdvancedFilter
            options={filterOptions}
            values={advancedTable.filters}
            onChange={advancedTable.setFilters}
            placeholder="Search skills by name, category, or description..."
          />

          {/* Bulk Operations */}
          <BulkOperations
            items={advancedTable.filteredItems}
            selectedItems={advancedTable.selectedItems}
            onToggleSelection={advancedTable.toggleSelection}
            onSelectAll={() => {
              advancedTable.selectAll(advancedTable.filteredItems, (skill) => skill.skill_id)
            }}
            onClearSelection={advancedTable.clearSelection}
            onBulkDelete={handleBulkDelete}
            onBulkEdit={(ids) => {
              // Enhanced bulk edit operations
              const actions = [
                { label: 'Toggle Active Status', action: () => handleBulkToggleActive(ids) },
                { label: 'Set Basic Complexity', action: () => handleBulkUpdateComplexity(ids, 'basic') },
                { label: 'Set Intermediate Complexity', action: () => handleBulkUpdateComplexity(ids, 'intermediate') },
                { label: 'Set Advanced Complexity', action: () => handleBulkUpdateComplexity(ids, 'advanced') },
                { label: 'Set Expert Complexity', action: () => handleBulkUpdateComplexity(ids, 'expert') },
                { label: 'Require Certification', action: () => handleBulkUpdateCertification(ids, true) },
                { label: 'Remove Certification Requirement', action: () => handleBulkUpdateCertification(ids, false) }
              ]
              
              // Show dropdown menu for bulk actions
              const selectedAction = prompt(
                `Select bulk action for ${ids.length} skills:\n\n` +
                actions.map((a, i) => `${i + 1}. ${a.label}`).join('\n')
              )
              
              const actionIndex = parseInt(selectedAction || '0') - 1
              if (actionIndex >= 0 && actionIndex < actions.length) {
                actions[actionIndex].action()
              }
            }}
            getId={(skill) => skill.skill_id}
            isSelectionMode={advancedTable.isSelectionMode}
            onEnterSelectionMode={advancedTable.enterSelectionMode}
          />

          {/* Bulk Progress */}
          {showBulkProgress && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Processing bulk operation...</span>
                <span>{bulkProgress}%</span>
              </div>
              <Progress value={bulkProgress} className="w-full" />
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : advancedTable.isEmpty ? (
            <p className="text-center text-gray-500 py-4">
              {advancedTable.totalCount === 0 ? 'No skills found' : 'No skills match the current filters'}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    {advancedTable.isSelectionMode && (
                      <th className="text-left p-2 w-12">
                        <Checkbox
                          checked={advancedTable.filteredItems.length > 0 && advancedTable.selectedItems.size === advancedTable.filteredItems.length}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              advancedTable.selectAll(advancedTable.filteredItems, (skill) => skill.skill_id)
                            } else {
                              advancedTable.clearSelection()
                            }
                          }}
                        />
                      </th>
                    )}
                    <th className="text-left p-2">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleSort('name')}
                        className="h-auto p-0 font-semibold hover:bg-transparent"
                      >
                        Name {getSortIcon('name')}
                      </Button>
                    </th>
                    <th className="text-left p-2">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleSort('category')}
                        className="h-auto p-0 font-semibold hover:bg-transparent"
                      >
                        Category {getSortIcon('category')}
                      </Button>
                    </th>
                    <th className="text-left p-2">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleSort('department_id')}
                        className="h-auto p-0 font-semibold hover:bg-transparent"
                      >
                        Department {getSortIcon('department_id')}
                      </Button>
                    </th>
                    <th className="text-left p-2">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleSort('complexity_level')}
                        className="h-auto p-0 font-semibold hover:bg-transparent"
                      >
                        Complexity {getSortIcon('complexity_level')}
                      </Button>
                    </th>
                    <th className="text-left p-2">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleSort('training_hours_required')}
                        className="h-auto p-0 font-semibold hover:bg-transparent"
                      >
                        Training Hours {getSortIcon('training_hours_required')}
                      </Button>
                    </th>
                    <th className="text-left p-2">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleSort('market_hourly_rate')}
                        className="h-auto p-0 font-semibold hover:bg-transparent"
                      >
                        Market Rate {getSortIcon('market_hourly_rate')}
                      </Button>
                    </th>
                    <th className="text-left p-2">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleSort('skill_scarcity_level')}
                        className="h-auto p-0 font-semibold hover:bg-transparent"
                      >
                        Scarcity {getSortIcon('skill_scarcity_level')}
                      </Button>
                    </th>
                    <th className="text-left p-2">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleSort('is_active')}
                        className="h-auto p-0 font-semibold hover:bg-transparent"
                      >
                        Status {getSortIcon('is_active')}
                      </Button>
                    </th>
                    <th className="text-left p-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {advancedTable.filteredItems.map((skill) => {
                    const department = departments.find(d => d.department_id === skill.department_id)
                    const isSelected = advancedTable.selectedItems.has(skill.skill_id)
                    
                    return (
                      <tr 
                        key={skill.skill_id} 
                        className={`border-b hover:bg-gray-50 ${
                          isSelected ? 'bg-blue-50' : ''
                        }`}
                      >
                        {advancedTable.isSelectionMode && (
                          <td className="p-2">
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => advancedTable.toggleSelection(skill.skill_id)}
                            />
                          </td>
                        )}
                        <td className="p-2 font-medium">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              {skill.name}
                              {skill.certification_required && (
                                <Badge variant="outline" className="text-xs bg-orange-50 text-orange-700 border-orange-200">
                                  Cert Required
                                </Badge>
                              )}
                            </div>
                            {skill.description && (
                              <div className="text-xs text-gray-500 line-clamp-1">
                                {skill.description}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="p-2">
                          {skill.category ? (
                            <Badge variant="secondary" className="capitalize">
                              {skill.category}
                            </Badge>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="p-2">
                          {department ? (
                            <div className="text-sm">
                              <div className="font-medium">{department.name}</div>
                              <div className="text-gray-500">({department.code})</div>
                            </div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="p-2">
                          <Badge className={`capitalize ${getComplexityColor(skill.complexity_level)}`}>
                            {skill.complexity_level}
                          </Badge>
                        </td>
                        <td className="p-2">
                          <div className="flex items-center gap-1">
                            <span className="font-medium">{skill.training_hours_required}</span>
                            <span className="text-xs text-gray-500">hrs</span>
                          </div>
                        </td>
                        <td className="p-2">
                          {skill.market_hourly_rate ? (
                            <div className="font-medium text-green-600">
                              ${skill.market_hourly_rate.toFixed(2)}
                            </div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="p-2">
                          <Badge className={`capitalize ${
                            skill.skill_scarcity_level === 'critical' 
                              ? 'bg-red-100 text-red-800 border-red-200'
                              : skill.skill_scarcity_level === 'rare'
                              ? 'bg-orange-100 text-orange-800 border-orange-200'
                              : skill.skill_scarcity_level === 'uncommon'
                              ? 'bg-yellow-100 text-yellow-800 border-yellow-200'
                              : 'bg-green-100 text-green-800 border-green-200'
                          }`}>
                            {skill.skill_scarcity_level}
                          </Badge>
                        </td>
                        <td className="p-2">
                          <Badge className={`${
                            skill.is_active 
                              ? 'bg-green-100 text-green-800 border-green-200' 
                              : 'bg-red-100 text-red-800 border-red-200'
                          }`}>
                            {skill.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </td>
                        <td className="p-2">
                          <div className="flex space-x-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                performanceTracker.current.recordInteraction('click', 'edit_button')
                                handleEdit(skill)
                              }}
                              className="h-8 w-8 p-0"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                performanceTracker.current.recordInteraction('click', 'delete_button')
                                handleDelete(skill.skill_id)
                              }}
                              className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
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