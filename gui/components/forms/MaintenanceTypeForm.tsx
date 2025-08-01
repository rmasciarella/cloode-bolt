"use client"

import { useState, useEffect, useRef, useCallback } from 'react'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { MassUploader } from '@/components/ui/mass-uploader'
import { Loader2, Edit, Trash2, Upload } from 'lucide-react'
import { usePerformanceMonitor } from '@/lib/performance'
import { UseFormReturn } from 'react-hook-form'

// Performance monitoring types
interface FormPerformanceMetrics {
  loadTime: number
  submitTime: number
  validationTime: number
  errorCount: number
  interactionCount: number
  focusEvents: number
  clickEvents: number
  validationErrors: number
  renderTime: number
}

interface ValidationPerformanceMetric {
  field: string
  validationTime: number
  isValid: boolean
  errorMessage?: string
}

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

  // Performance monitoring setup  
  const performanceMonitor = usePerformanceMonitor('MaintenanceTypeForm')
  const formLoadTimeRef = useRef<number>(Date.now())
  const validationTimesRef = useRef<ValidationPerformanceMetric[]>([])
  const interactionCountRef = useRef<FormPerformanceMetrics>({
    loadTime: 0,
    submitTime: 0,
    validationTime: 0,
    errorCount: 0,
    interactionCount: 0,
    focusEvents: 0,
    clickEvents: 0,
    validationErrors: 0,
    renderTime: 0
  })
  const renderStartTimeRef = useRef<number>(Date.now())

  // Performance monitoring utility functions
  const recordInteraction = useCallback((type: 'click' | 'focus') => {
    interactionCountRef.current.interactionCount++
    if (type === 'click') {
      interactionCountRef.current.clickEvents++
    } else if (type === 'focus') {
      interactionCountRef.current.focusEvents++
    }
  }, [])

  const recordValidationPerformance = useCallback((field: string, validationTime: number, isValid: boolean, errorMessage?: string) => {
    const metric: ValidationPerformanceMetric = {
      field,
      validationTime,
      isValid,
      errorMessage
    }
    validationTimesRef.current.push(metric)
    
    interactionCountRef.current.validationTime += validationTime
    if (!isValid) {
      interactionCountRef.current.validationErrors++
      interactionCountRef.current.errorCount++
    }

    // Log slow validations (>100ms)
    if (validationTime > 100) {
      console.warn(`[PERF] Slow validation for ${field}: ${validationTime}ms`)
    }
  }, [])

  const recordError = useCallback((context: string, error: any) => {
    interactionCountRef.current.errorCount++
    console.error(`[MaintenanceTypeForm] Error in ${context}:`, error)
    
    // Send error metrics to performance monitor if available monitoring service
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'form_error', {
        form_name: 'maintenance_type_form',
        error_context: context,
        error_message: error?.message || 'Unknown error'
      })
    }
  }, [])

  const reportPerformanceMetrics = useCallback(() => {
    const currentMetrics = interactionCountRef.current
    const totalValidationTime = validationTimesRef.current.reduce((sum, v) => sum + v.validationTime, 0)
    
    const performanceSummary = {
      form: 'MaintenanceTypeForm',
      loadTime: currentMetrics.loadTime,
      submitTime: currentMetrics.submitTime,
      totalValidationTime,
      errorCount: currentMetrics.errorCount,
      interactionCount: currentMetrics.interactionCount,
      focusEvents: currentMetrics.focusEvents,
      clickEvents: currentMetrics.clickEvents,
      validationErrors: currentMetrics.validationErrors,
      renderTime: currentMetrics.renderTime,
      validationBreakdown: validationTimesRef.current.slice(-10), // Last 10 validations
      timestamp: Date.now()
    }

    console.log('[PERF] MaintenanceTypeForm Performance Summary:', performanceSummary)
    
    // Report to external monitoring if available
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'form_performance', {
        form_name: 'maintenance_type_form',
        load_time: currentMetrics.loadTime,
        submit_time: currentMetrics.submitTime,
        validation_time: totalValidationTime,
        error_count: currentMetrics.errorCount,
        interaction_count: currentMetrics.interactionCount
      })
    }
    
    return performanceSummary
  }, [])

  const form = useForm<MaintenanceTypeFormData>({
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
  
  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = form

  const fetchMaintenanceTypes = async () => {
    const fetchStartTime = Date.now()
    setLoading(true)
    
    try {
      const { data, error } = await supabase
        .from('maintenance_types')
        .select('*')
        .order('name', { ascending: true })

      if (error) throw error
      setMaintenanceTypes(data || [])
      
      // Record fetch performance
      const fetchTime = Date.now() - fetchStartTime
      console.log(`[PERF] Maintenance types fetch: ${fetchTime}ms`)
      
      if (fetchTime > 1000) {
        console.warn(`[PERF] Slow data fetch detected: ${fetchTime}ms`)
      }
      
    } catch (error) {
      recordError('fetch_maintenance_types', error)
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

  // Track form load time and initial render performance
  useEffect(() => {
    const loadEndTime = Date.now()
    const loadTime = loadEndTime - formLoadTimeRef.current
    interactionCountRef.current.loadTime = loadTime
    
    console.log(`[PERF] MaintenanceTypeForm load time: ${loadTime}ms`)
    
    if (loadTime > 2000) {
      console.warn(`[PERF] Slow form load detected: ${loadTime}ms`)
    }
    
    fetchMaintenanceTypes()
  }, [fetchMaintenanceTypes])

  // Track render performance
  useEffect(() => {
    const renderEndTime = Date.now()
    const renderTime = renderEndTime - renderStartTimeRef.current
    interactionCountRef.current.renderTime = renderTime
    
    console.log(`[PERF] MaintenanceTypeForm render time: ${renderTime}ms`)
    
    if (renderTime > 500) {
      console.warn(`[PERF] Slow render detected: ${renderTime}ms`)
    }
    
    renderStartTimeRef.current = Date.now() // Reset for next render
  })

  // Track validation errors as they occur
  useEffect(() => {
    const errorFields = Object.keys(errors)
    errorFields.forEach(field => {
      const error = errors[field as keyof typeof errors]
      if (error) {
        recordValidationPerformance(field, 0, false, error.message)
      }
    })
  }, [errors, recordValidationPerformance])

  // Performance cleanup and reporting on unmount
  useEffect(() => {
    return () => {
      reportPerformanceMetrics()
    }
  }, [reportPerformanceMetrics])

  const onSubmit = async (data: MaintenanceTypeFormData) => {
    const submitStartTime = Date.now()
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
      
      // Record successful submission performance
      const submitTime = Date.now() - submitStartTime
      interactionCountRef.current.submitTime = submitTime
      console.log(`[PERF] Form submission successful: ${submitTime}ms`)
      
      if (submitTime > 3000) {
        console.warn(`[PERF] Slow form submission detected: ${submitTime}ms`)
      }
      
    } catch (error) {
      recordError('form_submission', error)
      console.error('Error saving maintenance type:', error)
      toast({
        title: "Error",
        description: "Failed to save maintenance type",
        variant: "destructive"
      })
      
      // Record failed submission performance
      const submitTime = Date.now() - submitStartTime
      interactionCountRef.current.submitTime = submitTime
      console.log(`[PERF] Form submission failed: ${submitTime}ms`)
      
    } finally {
      setIsSubmitting(false)
      
      // Always report submission metrics
      const finalSubmitTime = Date.now() - submitStartTime
      console.log(`[PERF] Total submission time (including UI updates): ${finalSubmitTime}ms`)
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

    const deleteStartTime = Date.now()
    recordInteraction('click')
    
    try {
      const { error } = await supabase
        .from('maintenance_types')
        .delete()
        .eq('maintenance_type_id', id)

      if (error) throw error

      const deleteTime = Date.now() - deleteStartTime
      console.log(`[PERF] Delete operation: ${deleteTime}ms`)
      
      if (deleteTime > 2000) {
        console.warn(`[PERF] Slow delete operation detected: ${deleteTime}ms`)
      }

      toast({
        title: "Success",
        description: "Maintenance type deleted successfully"
      })
      fetchMaintenanceTypes()
    } catch (error) {
      recordError('delete_maintenance_type', error)
      console.error('Error deleting maintenance type:', error)
      toast({
        title: "Error",
        description: "Failed to delete maintenance type",
        variant: "destructive"
      })
    }
  }

  const handleCancel = () => {
    recordInteraction('click')
    reset()
    setEditingId(null)
  }

  // Enhanced register function with performance monitoring
  const registerWithPerformance = useCallback((
    name: keyof MaintenanceTypeFormData,
    options?: Parameters<typeof register>[1]
  ) => {
    const originalRegister = register(name, options)
    
    return {
      ...originalRegister,
      onFocus: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        recordInteraction('focus')
      },
      onBlur: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const validationStartTime = Date.now()
        
        // Trigger validation
        let validationResult
        // Call original onBlur if it exists
        originalRegister.onBlur?.(e)
        
        // Record validation performance
        setTimeout(() => {
          const validationTime = Date.now() - validationStartTime
          const hasError = errors[name] !== undefined
          recordValidationPerformance(
            name,
            validationTime,
            !hasError,
            errors[name]?.message
          )
        }, 0)
        
        return validationResult
      },
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        if (interactionCountRef.current.interactionCount === 0) {
          // First interaction - record time to first input
          const timeToFirstInput = Date.now() - formLoadTimeRef.current
          console.log(`[PERF] Time to first input: ${timeToFirstInput}ms`)
        }
        recordInteraction('click')
        if (originalRegister.onChange) {
          return originalRegister.onChange(e)
        }
      }
    }
  }, [register, recordInteraction, recordValidationPerformance, errors])

  // Enhanced click handler for buttons
  const handleButtonClick = useCallback((originalHandler: () => void) => {
    return () => {
      recordInteraction('click')
      originalHandler()
    }
  }, [recordInteraction])

  const sampleMaintenanceTypeData = {
    name: 'Preventive Maintenance',
    description: 'Scheduled maintenance to prevent equipment failures',
    is_preventive: true,
    is_emergency: false,
    typical_duration_hours: 4.0,
    blocks_production: true,
    allows_emergency_override: false,
    requires_shutdown: true,
    required_skill_level: 'COMPETENT',
    requires_external_vendor: false
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
                  {...registerWithPerformance('name', { 
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
                  {...registerWithPerformance('typical_duration_hours', { 
                    valueAsNumber: true,
                    min: { value: 0, message: 'Duration must be non-negative' }
                  })}
                />
                {errors.typical_duration_hours && <p className="text-sm text-red-600">{errors.typical_duration_hours.message}</p>}
              </div>

              {/* Required Skill Level */}
              <div className="space-y-2">
                <Label htmlFor="required_skill_level">Required Skill Level</Label>
                <Select onValueChange={(value) => {
                  recordInteraction('click')
                  setValue('required_skill_level', value)
                }}>
                  <SelectTrigger 
                    id="required_skill_level"
                    onFocus={() => recordInteraction('focus')}
                  >
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
                {...registerWithPerformance('description')}
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
                    onCheckedChange={(checked) => {
                      recordInteraction('click')
                      setValue('is_preventive', checked as boolean)
                    }}
                  />
                  <Label htmlFor="is_preventive">Preventive Maintenance</Label>
                  <p className="text-xs text-gray-500 ml-2">Scheduled maintenance to prevent failures</p>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="is_emergency"
                    name="is_emergency"
                    checked={watch('is_emergency')}
                    onCheckedChange={(checked) => {
                      recordInteraction('click')
                      setValue('is_emergency', checked as boolean)
                    }}
                  />
                  <Label htmlFor="is_emergency">Emergency Maintenance</Label>
                  <p className="text-xs text-gray-500 ml-2">Unplanned maintenance for failures</p>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="blocks_production"
                    name="blocks_production"
                    checked={watch('blocks_production')}
                    onCheckedChange={(checked) => {
                      recordInteraction('click')
                      setValue('blocks_production', checked as boolean)
                    }}
                  />
                  <Label htmlFor="blocks_production">Blocks Production</Label>
                  <p className="text-xs text-gray-500 ml-2">Prevents production during maintenance</p>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="allows_emergency_override"
                    name="allows_emergency_override"
                    checked={watch('allows_emergency_override')}
                    onCheckedChange={(checked) => {
                      recordInteraction('click')
                      setValue('allows_emergency_override', checked as boolean)
                    }}
                  />
                  <Label htmlFor="allows_emergency_override">Allows Emergency Override</Label>
                  <p className="text-xs text-gray-500 ml-2">Can be interrupted for emergencies</p>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="requires_shutdown"
                    name="requires_shutdown"
                    checked={watch('requires_shutdown')}
                    onCheckedChange={(checked) => {
                      recordInteraction('click')
                      setValue('requires_shutdown', checked as boolean)
                    }}
                  />
                  <Label htmlFor="requires_shutdown">Requires Shutdown</Label>
                  <p className="text-xs text-gray-500 ml-2">Equipment must be shut down</p>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="requires_external_vendor"
                    name="requires_external_vendor"
                    checked={watch('requires_external_vendor')}
                    onCheckedChange={(checked) => {
                      recordInteraction('click')
                      setValue('requires_external_vendor', checked as boolean)
                    }}
                  />
                  <Label htmlFor="requires_external_vendor">Requires External Vendor</Label>
                  <p className="text-xs text-gray-500 ml-2">Needs external service provider</p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-2 pt-4">
              {editingId && (
                <Button type="button" variant="outline" onClick={handleButtonClick(handleCancel)}>
                  Cancel
                </Button>
              )}
              <Button 
                type="submit" 
                disabled={isSubmitting}
                onClick={() => recordInteraction('click')}
              >
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingId ? 'Update' : 'Create'} Maintenance Type
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
        </TabsContent>
        
        <TabsContent value="bulk" className="space-y-6">
          <MassUploader
            tableName="maintenance_types"
            entityName="Maintenance Type"
            sampleData={sampleMaintenanceTypeData}
            onUploadComplete={fetchMaintenanceTypes}
            requiredFields={['name']}
            fieldDescriptions={{
              name: 'Maintenance type display name',
              description: 'Detailed description of maintenance procedures',
              typical_duration_hours: 'Expected duration in hours (decimal)',
              is_preventive: 'Scheduled preventive maintenance (true/false)',
              is_emergency: 'Emergency/unplanned maintenance (true/false)',
              blocks_production: 'Prevents production during maintenance (true/false)',
              allows_emergency_override: 'Can be interrupted for emergencies (true/false)',
              requires_shutdown: 'Equipment must be shut down (true/false)',
              requires_external_vendor: 'Needs external service provider (true/false)',
              required_skill_level: 'NOVICE, COMPETENT, PROFICIENT, EXPERT'
            }}
          />
        </TabsContent>
      </Tabs>

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
                            onClick={handleButtonClick(() => handleEdit(maintenanceType))}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleButtonClick(() => handleDelete(maintenanceType.maintenance_type_id))}
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

      {/* Performance Monitoring Debug Panel (Development Only) */}
      {process.env.NODE_ENV === 'development' && (
        <Card className="mt-6 bg-gray-50 border-gray-200">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-700">Performance Debug Panel</CardTitle>
            <CardDescription className="text-xs">
              Real-time performance metrics for MaintenanceTypeForm
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="font-medium">Load Time:</span>
                <p className={`${interactionCountRef.current.loadTime > 2000 ? 'text-red-600' : 'text-green-600'}`}>
                  {interactionCountRef.current.loadTime}ms
                </p>
              </div>
              <div>
                <span className="font-medium">Submit Time:</span>
                <p className={`${interactionCountRef.current.submitTime > 3000 ? 'text-red-600' : 'text-green-600'}`}>
                  {interactionCountRef.current.submitTime}ms
                </p>
              </div>
              <div>
                <span className="font-medium">Validation Time:</span>
                <p className={`${interactionCountRef.current.validationTime > 500 ? 'text-orange-600' : 'text-green-600'}`}>
                  {interactionCountRef.current.validationTime}ms
                </p>
              </div>
              <div>
                <span className="font-medium">Render Time:</span>
                <p className={`${interactionCountRef.current.renderTime > 500 ? 'text-orange-600' : 'text-green-600'}`}>
                  {interactionCountRef.current.renderTime}ms
                </p>
              </div>
              <div>
                <span className="font-medium">Interactions:</span>
                <p>{interactionCountRef.current.interactionCount}</p>
              </div>
              <div>
                <span className="font-medium">Focus Events:</span>
                <p>{interactionCountRef.current.focusEvents}</p>
              </div>
              <div>
                <span className="font-medium">Click Events:</span>
                <p>{interactionCountRef.current.clickEvents}</p>
              </div>
              <div>
                <span className="font-medium">Errors:</span>
                <p className={`${interactionCountRef.current.errorCount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {interactionCountRef.current.errorCount}
                </p>
              </div>
            </div>
            <div className="pt-2 border-t border-gray-200">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  const summary = reportPerformanceMetrics()
                  console.table(summary)
                  toast({
                    title: "Performance Summary",
                    description: "Check console for detailed metrics",
                  })
                }}
                className="text-xs"
              >
                Export Performance Report
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}