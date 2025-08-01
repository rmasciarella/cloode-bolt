"use client"

import { useState, useEffect, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { TimeInput } from '@/components/ui/time-input'
import { indexToTime12, getTimeRangeDescription } from '@/lib/timeUtils'
import { Loader2, Edit, Trash2 } from 'lucide-react'

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

  const fetchBusinessCalendars = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('business_calendars')
        .select('*')
        .order('name', { ascending: true })

      if (error) throw error
      setBusinessCalendars(data || [])
    } catch (error) {
      console.error('Error fetching business calendars:', error)
      toast({
        title: "Error",
        description: "Failed to fetch business calendars",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    fetchBusinessCalendars()
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
    } catch (error) {
      console.error('Error saving business calendar:', error)
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
      {/* Form Card */}
      <Card>
        <CardHeader>
          <CardTitle>{editingId ? 'Edit Business Calendar' : 'Create New Business Calendar'}</CardTitle>
          <CardDescription>
            {editingId ? 'Update business calendar information' : 'Define working periods and schedules for departments'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
                />
              </div>

              {/* Start Time */}
              <TimeInput
                label="Default Start Time"
                value={watch('default_start_time') || 32}
                onChange={(index) => setValue('default_start_time', index)}
                id="default_start_time"
                placeholder="Select start time"
                helperText="Default working hours start time for this calendar"
                required
              />

              {/* End Time */}
              <TimeInput
                label="Default End Time"
                value={watch('default_end_time') || 64}
                onChange={(index) => setValue('default_end_time', index)}
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
                  onCheckedChange={(checked) => setValue('is_default', checked as boolean)}
                />
                <Label htmlFor="is_default">Default Calendar</Label>
                <p className="text-xs text-gray-500 ml-2">Use as default for new departments and resources</p>
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
                            onClick={() => handleEdit(calendar)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDelete(calendar.calendar_id)}
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