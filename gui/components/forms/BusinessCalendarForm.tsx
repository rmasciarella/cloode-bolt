"use client"

import { useState, useEffect, useCallback, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import { useFormPerformanceMonitoring } from '@/lib/hooks/use-form-performance'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { TimeInput } from '@/components/ui/time-input'
import { indexToTime12, getTimeRangeDescription } from '@/lib/timeUtils'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { MassUploader } from '@/components/ui/mass-uploader'
import { Loader2, Edit, Trash2, Upload, Activity } from 'lucide-react'

type BusinessCalendar = {
  calendar_id: string
  name: string
  description: string | null
  timezone: string
  default_start_time: number
  default_end_time: number
  working_days_mask: number
  is_default: boolean
  is_active: boolean
  created_at: string
}

type BusinessCalendarFormData = {
  name: string
  description: string
  timezone: string
  default_start_time: number
  default_end_time: number
  working_days: boolean[]
  is_default: boolean
  is_active: boolean
}

const daysOfWeek = [
  { bit: 0, label: 'Monday', abbr: 'Mon' },
  { bit: 1, label: 'Tuesday', abbr: 'Tue' },
  { bit: 2, label: 'Wednesday', abbr: 'Wed' },
  { bit: 3, label: 'Thursday', abbr: 'Thu' },
  { bit: 4, label: 'Friday', abbr: 'Fri' },
  { bit: 5, label: 'Saturday', abbr: 'Sat' },
  { bit: 6, label: 'Sunday', abbr: 'Sun' }
]

export default function BusinessCalendarForm() {
  const [businessCalendars, setBusinessCalendars] = useState<BusinessCalendar[]>([])
  const [loading, setLoading] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()
  
  // Performance tracking using the correct hook
  const formPerformanceMetrics = useFormPerformanceMonitoring('BusinessCalendarForm')
  
  const formRef = useRef<HTMLFormElement>(null)
  const [showPerformanceDebug, setShowPerformanceDebug] = useState(false)
  
  // Performance debugging in development
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      const handleKeyPress = (e: KeyboardEvent) => {
        if (e.ctrlKey && e.shiftKey && e.key === 'P') {
          e.preventDefault()
          setShowPerformanceDebug(prev => !prev)
          console.log('[FORM-PERF] Performance summary:', formPerformanceMetrics.getFormSummary())
        }
      }
      
      window.addEventListener('keydown', handleKeyPress)
      return () => window.removeEventListener('keydown', handleKeyPress)
    }
  }, [formPerformanceMetrics])

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<BusinessCalendarFormData>({
    defaultValues: {
      name: '',
      description: '',
      timezone: 'UTC',
      default_start_time: 32, // 8 AM
      default_end_time: 64,   // 4 PM
      working_days: [true, true, true, true, true, false, false], // Mon-Fri
      is_default: false,
      is_active: true
    }
  })
  
  // Track validation errors in real-time
  useEffect(() => {
    if (Object.keys(errors).length > 0) {
      Object.keys(errors).forEach(fieldName => {
        formPerformanceMetrics.startValidation(fieldName)
        formPerformanceMetrics.trackValidation(fieldName, true, errors[fieldName]?.message)
      })
    }
  }, [errors, formPerformanceMetrics])
  
  // Call finalizeMetrics on unmount to ensure metrics are recorded
  useEffect(() => {
    return () => {
      formPerformanceMetrics.finalizeMetrics()
    }
  }, [formPerformanceMetrics])

  const fetchBusinessCalendars = useCallback(async () => {
    const fetchStart = Date.now()
    setLoading(true)
    
    try {
      const { data, error } = await supabase
        .from('business_calendars')
        .select('*')
        .order('name', { ascending: true })

      if (error) throw error
      setBusinessCalendars(data || [])
      
      // Track data fetch performance
      const fetchDuration = Date.now() - fetchStart
      if (process.env.NODE_ENV === 'development') {
        console.log(`[FORM-PERF] BusinessCalendarForm.fetchData: ${fetchDuration}ms`)
      }
    } catch (error) {
      console.error('Error fetching business calendars:', error)
      formPerformanceMetrics.startValidation('data_fetch')
      formPerformanceMetrics.trackValidation('data_fetch', true)
      toast({
        title: "Error",
        description: "Failed to fetch business calendars",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }, [toast, formPerformanceMetrics])

  useEffect(() => {
    fetchBusinessCalendars()
    
    // Form load time is automatically tracked by the hook
  }, [fetchBusinessCalendars])


  const workingDaysMaskToArray = (mask: number): boolean[] => {
    return daysOfWeek.map(day => Boolean(mask & (1 << day.bit)))
  }

  const arrayToWorkingDaysMask = (days: boolean[]): number => {
    return days.reduce((mask, isWorking, index) => {
      return isWorking ? mask | (1 << index) : mask
    }, 0)
  }

  const onSubmit = async (data: BusinessCalendarFormData) => {
    formPerformanceMetrics.trackSubmissionStart()
    setIsSubmitting(true)
    
    try {
      const formData = {
        name: data.name,
        description: data.description || null,
        timezone: data.timezone,
        default_start_time: data.default_start_time,
        default_end_time: data.default_end_time,
        working_days_mask: arrayToWorkingDaysMask(data.working_days),
        is_default: data.is_default,
        is_active: data.is_active
      }

      if (editingId) {
        const { error } = await supabase
          .from('business_calendars')
          .update(formData)
          .eq('calendar_id', editingId)

        if (error) throw error

        toast({
          title: "Success",
          description: "Business calendar updated successfully"
        })
      } else {
        const { error } = await supabase
          .from('business_calendars')
          .insert([formData])

        if (error) throw error

        toast({
          title: "Success",
          description: "Business calendar created successfully"
        })
      }

      reset()
      setEditingId(null)
      fetchBusinessCalendars()
      
      // Track successful submission
      formPerformanceMetrics.trackSubmissionEnd(true)
    } catch (error) {
      console.error('Error saving business calendar:', error)
      formPerformanceMetrics.trackSubmissionEnd(false)
      toast({
        title: "Error",
        description: "Failed to save business calendar",
        variant: "destructive"
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = (calendar: BusinessCalendar) => {
    setEditingId(calendar.calendar_id)
    setValue('name', calendar.name)
    setValue('description', calendar.description || '')
    setValue('timezone', calendar.timezone)
    setValue('default_start_time', calendar.default_start_time)
    setValue('default_end_time', calendar.default_end_time)
    setValue('working_days', workingDaysMaskToArray(calendar.working_days_mask))
    setValue('is_default', calendar.is_default)
    setValue('is_active', calendar.is_active)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this business calendar?')) return

    try {
      const { error } = await supabase
        .from('business_calendars')
        .delete()
        .eq('calendar_id', id)

      if (error) throw error

      toast({
        title: "Success",
        description: "Business calendar deleted successfully"
      })
      fetchBusinessCalendars()
    } catch (error) {
      console.error('Error deleting business calendar:', error)
      toast({
        title: "Error",
        description: "Failed to delete business calendar",
        variant: "destructive"
      })
    }
  }

  const handleCancel = () => {
    reset()
    setEditingId(null)
  }

  const getWorkingDaysDisplay = (mask: number) => {
    const workingDays = workingDaysMaskToArray(mask)
    return daysOfWeek
      .filter((day, index) => workingDays[index])
      .map(day => day.abbr)
      .join(', ')
  }

  return (
    <div className="space-y-6">
      {/* Performance Debug Panel - Development Only */}
      {process.env.NODE_ENV === 'development' && showPerformanceDebug && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Performance Debug - BusinessCalendarForm
              <Button 
                size="sm" 
                variant="ghost" 
                onClick={() => setShowPerformanceDebug(false)}
                className="ml-auto"
              >
                ×
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs space-y-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p><strong>Load Time:</strong> {formPerformanceMetrics.loadTime || 'N/A'}ms</p>
                <p><strong>Submit Time:</strong> {formPerformanceMetrics.submissionTime || 'N/A'}ms</p>
                <p><strong>Validation Time:</strong> {formPerformanceMetrics.validationTime || 'N/A'}ms</p>
              </div>
              <div>
                <p><strong>Error Count:</strong> {formPerformanceMetrics.errorCount}</p>
                <p><strong>Interactions:</strong> {formPerformanceMetrics.interactionCount}</p>
                <p><strong>High Error Rate:</strong> {formPerformanceMetrics.hasHighErrorRate ? 'Yes' : 'No'}</p>
              </div>
            </div>
            <div className="mt-2">
              <p className="text-xs text-gray-600">Press Ctrl+Shift+P to toggle this panel</p>
            </div>
          </CardContent>
        </Card>
      )}
      {/* Form Card */}
      <Card>
        <CardHeader>
          <CardTitle>{editingId ? 'Edit Business Calendar' : 'Create New Business Calendar'}</CardTitle>
          <CardDescription>
            {editingId ? 'Update business calendar information' : 'Define working periods and schedules for departments'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form 
            ref={formRef}
            onSubmit={handleSubmit(onSubmit)} 
            className="space-y-4"
            onClick={(e) => {
              const target = e.target as HTMLElement
              if (target.tagName === 'BUTTON' || target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
                formPerformanceMetrics.trackInteraction('click', target.tagName.toLowerCase() + (target.id ? `#${target.id}` : ''))
              }
            }}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Name - Required */}
              <div className="space-y-2">
                <Label htmlFor="name">Calendar Name *</Label>
                <Input
                  id="name"
                  {...register('name', { 
                    required: 'Calendar name is required',
                    maxLength: { value: 255, message: 'Name must be 255 characters or less' }
                  })}
                  placeholder="e.g., Standard Business Calendar"
                  onFocus={() => formPerformanceMetrics.trackInteraction('focus', 'name')}
                  onBlur={() => {
                    // Validate field on blur
                    const value = (document.getElementById('name') as HTMLInputElement)?.value
                    if (value) {
                      formPerformanceMetrics.startValidation('name')
                      formPerformanceMetrics.trackValidation('name', value.length > 255)
                    }
                  }}
                  onChange={(e) => {
                    formPerformanceMetrics.trackInteraction('change', 'name')
                  }}
                />
                {errors.name && <p className="text-sm text-red-600">{errors.name.message}</p>}
              </div>

              {/* Timezone */}
              <div className="space-y-2">
                <Label htmlFor="timezone">Timezone</Label>
                <Input
                  id="timezone"
                  {...register('timezone')}
                  placeholder="e.g., UTC, America/New_York, Europe/London"
                  onFocus={() => formPerformanceMetrics.trackInteraction('focus', 'timezone')}
                  onChange={(e) => formPerformanceMetrics.trackInteraction('change', 'timezone')}
                />
              </div>

              {/* Start Time */}
              <TimeInput
                label="Default Start Time"
                value={watch('default_start_time') || 32}
                onChange={(index) => {
                  setValue('default_start_time', index)
                  formPerformanceMetrics.trackInteraction('click', 'time-input#default_start_time')
                }}
                id="default_start_time"
                placeholder="Select start time"
                helperText="Default working hours start time for this calendar"
                required
              />

              {/* End Time */}
              <TimeInput
                label="Default End Time"
                value={watch('default_end_time') || 64}
                onChange={(index) => {
                  setValue('default_end_time', index)
                  formPerformanceMetrics.trackInteraction('click', 'time-input#default_end_time')
                }}
                id="default_end_time"
                placeholder="Select end time"
                helperText="Default working hours end time for this calendar"
                required
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                {...register('description')}
                placeholder="Calendar description and usage notes"
                rows={3}
                onFocus={() => formPerformanceMetrics.trackInteraction('focus', 'description')}
                onChange={(e) => formPerformanceMetrics.trackInteraction('change', 'description')}
              />
            </div>

            {/* Working Days */}
            <div className="space-y-2">
              <Label>Working Days</Label>
              <div className="grid grid-cols-7 gap-2">
                {daysOfWeek.map((day, index) => (
                  <div key={day.label} className="flex items-center space-x-2">
                    <Checkbox
                      id={`working_day_${index}`}
                      checked={(watch('working_days') || [])[index] || false}
                      onCheckedChange={(checked) => {
                        const currentDays = watch('working_days') || []
                        const newDays = [...currentDays]
                        newDays[index] = checked as boolean
                        setValue('working_days', newDays)
                        formPerformanceMetrics.trackInteraction('click', `checkbox#working_day_${index}`)
                      }}
                    />
                    <Label htmlFor={`working_day_${index}`} className="text-sm">
                      {day.abbr}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Checkboxes */}
            <div className="flex flex-col space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="is_default"
                  checked={watch('is_default')}
                  onCheckedChange={(checked) => {
                    setValue('is_default', checked as boolean)
                    formPerformanceMetrics.trackInteraction('click', 'checkbox#is_default')
                  }}
                />
                <Label htmlFor="is_default">Default Calendar</Label>
                <p className="text-xs text-gray-500 ml-2">Use as default for new departments and resources</p>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="is_active"
                  checked={watch('is_active')}
                  onCheckedChange={(checked) => {
                    setValue('is_active', checked as boolean)
                    formPerformanceMetrics.trackInteraction('click', 'checkbox#is_active')
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
                    handleCancel()
                    formPerformanceMetrics.trackInteraction('click', 'button#cancel')
                  }}
                >
                  Cancel
                </Button>
              )}
              <Button 
                type="submit" 
                disabled={isSubmitting}
                onClick={() => formPerformanceMetrics.trackInteraction('click', 'button#submit')}
              >
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingId ? 'Update' : 'Create'} Calendar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Business Calendars List */}
      <Card>
        <CardHeader>
          <CardTitle>Business Calendars</CardTitle>
          <CardDescription>Manage existing business calendars</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : businessCalendars.length === 0 ? (
            <p className="text-center text-gray-500 py-4">No business calendars found</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Name</th>
                    <th className="text-left p-2">Timezone</th>
                    <th className="text-left p-2">Working Hours</th>
                    <th className="text-left p-2">Working Days</th>
                    <th className="text-left p-2">Status</th>
                    <th className="text-left p-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {businessCalendars.map((calendar) => (
                    <tr key={calendar.calendar_id} className="border-b hover:bg-gray-50">
                      <td className="p-2 font-medium">
                        <div>
                          {calendar.name}
                          {calendar.is_default && (
                            <span className="ml-2 px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">Default</span>
                          )}
                        </div>
                      </td>
                      <td className="p-2">{calendar.timezone}</td>
                      <td className="p-2">
                        {getTimeRangeDescription(calendar.default_start_time, calendar.default_end_time)}
                      </td>
                      <td className="p-2 text-sm">{getWorkingDaysDisplay(calendar.working_days_mask)}</td>
                      <td className="p-2">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          calendar.is_active 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {calendar.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="p-2">
                        <div className="flex space-x-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              handleEdit(calendar)
                              formPerformanceMetrics.trackInteraction('click', `button#edit-${calendar.calendar_id}`)
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              handleDelete(calendar.calendar_id)
                              formPerformanceMetrics.trackInteraction('click', `button#delete-${calendar.calendar_id}`)
                            }}
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