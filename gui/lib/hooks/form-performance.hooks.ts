/**
 * Form Performance Monitoring Hooks
 * Provides comprehensive performance tracking for form components
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { performanceMonitor } from '@/lib/performance/monitoring'

interface FormPerformanceMetrics {
  formName: string
  loadTime: number
  firstInteraction: number | null
  submissionTime: number | null
  validationTime: number | null
  errorCount: number
  interactionCount: number
  fieldFocusCount: { [fieldName: string]: number }
  validationErrorCount: { [fieldName: string]: number }
  timestamp: number
}

interface FieldValidationMetrics {
  fieldName: string
  validationStartTime: number
  validationEndTime: number
  duration: number
  hasError: boolean
  errorMessage?: string
}

interface UserInteractionMetrics {
  type: 'click' | 'focus' | 'blur' | 'change' | 'keydown'
  target: string
  timestamp: number
  duration?: number
}

class FormPerformanceTracker {
  private metrics: FormPerformanceMetrics[] = []
  private validationMetrics: FieldValidationMetrics[] = []
  private interactionMetrics: UserInteractionMetrics[] = []
  private readonly maxMetrics = 100 // Keep last 100 form sessions

  addFormMetrics(metrics: FormPerformanceMetrics) {
    this.metrics.push(metrics)
    
    // Keep only recent metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics)
    }

    // Log performance issues
    if (metrics.loadTime > 2000) {
      console.warn(`[FORM-PERF] Slow form load: ${metrics.formName} took ${metrics.loadTime}ms`)
    }

    if (metrics.submissionTime && metrics.submissionTime > 5000) {
      console.warn(`[FORM-PERF] Slow form submission: ${metrics.formName} took ${metrics.submissionTime}ms`)
    }

    if (metrics.errorCount > 5) {
      console.warn(`[FORM-PERF] High error rate: ${metrics.formName} had ${metrics.errorCount} errors`)
    }
  }

  addValidationMetrics(metrics: FieldValidationMetrics) {
    this.validationMetrics.push(metrics)
    
    // Keep only recent validation metrics
    if (this.validationMetrics.length > this.maxMetrics * 10) {
      this.validationMetrics = this.validationMetrics.slice(-this.maxMetrics * 10)
    }

    // Log slow validations
    if (metrics.duration > 100) {
      console.warn(`[FORM-PERF] Slow validation: ${metrics.fieldName} took ${metrics.duration}ms`)
    }
  }

  addInteractionMetrics(metrics: UserInteractionMetrics) {
    this.interactionMetrics.push(metrics)
    
    // Keep only recent interaction metrics
    if (this.interactionMetrics.length > this.maxMetrics * 50) {
      this.interactionMetrics = this.interactionMetrics.slice(-this.maxMetrics * 50)
    }
  }

  getFormMetrics(formName?: string): FormPerformanceMetrics[] {
    if (!formName) return [...this.metrics]
    return this.metrics.filter(m => m.formName === formName)
  }

  getValidationMetrics(fieldName?: string): FieldValidationMetrics[] {
    if (!fieldName) return [...this.validationMetrics]
    return this.validationMetrics.filter(m => m.fieldName === fieldName)
  }

  getInteractionMetrics(target?: string): UserInteractionMetrics[] {
    if (!target) return [...this.interactionMetrics]
    return this.interactionMetrics.filter(m => m.target === target)
  }

  getPerformanceSummary(formName: string) {
    const formMetrics = this.getFormMetrics(formName)
    if (formMetrics.length === 0) return null

    const validations = this.validationMetrics.filter(v => 
      formMetrics.some(f => f.timestamp - 10000 < v.validationStartTime && v.validationStartTime < f.timestamp + 60000)
    )
    
    const interactions = this.interactionMetrics.filter(i => 
      formMetrics.some(f => f.timestamp - 10000 < i.timestamp && i.timestamp < f.timestamp + 60000)
    )

    const avgLoadTime = formMetrics.reduce((sum, m) => sum + m.loadTime, 0) / formMetrics.length
    const avgSubmissionTime = formMetrics
      .filter(m => m.submissionTime !== null)
      .reduce((sum, m) => sum + (m.submissionTime || 0), 0) / Math.max(1, formMetrics.filter(m => m.submissionTime !== null).length)
    
    const avgValidationTime = validations.length > 0 
      ? validations.reduce((sum, v) => sum + v.duration, 0) / validations.length 
      : 0

    return {
      formName,
      totalSessions: formMetrics.length,
      averageLoadTime: Math.round(avgLoadTime),
      averageSubmissionTime: Math.round(avgSubmissionTime),
      averageValidationTime: Math.round(avgValidationTime),
      totalInteractions: interactions.length,
      totalValidations: validations.length,
      errorRate: formMetrics.reduce((sum, m) => sum + m.errorCount, 0) / formMetrics.length,
      slowLoadSessions: formMetrics.filter(m => m.loadTime > 2000).length,
      slowSubmissionSessions: formMetrics.filter(m => m.submissionTime && m.submissionTime > 5000).length,
      lastSession: formMetrics[formMetrics.length - 1]
    }
  }
}

// Global form performance tracker
export const formPerformanceTracker = new FormPerformanceTracker()

// Hook for form performance monitoring
export function useFormPerformanceMonitoring(formName: string) {
  const [loadTime, setLoadTime] = useState<number | null>(null)
  const [firstInteraction, setFirstInteraction] = useState<number | null>(null)
  const [submissionTime, setSubmissionTime] = useState<number | null>(null)
  const [errorCount, setErrorCount] = useState(0)
  const [interactionCount, setInteractionCount] = useState(0)
  const [fieldFocusCount, setFieldFocusCount] = useState<{ [key: string]: number }>({})
  const [validationErrorCount, setValidationErrorCount] = useState<{ [key: string]: number }>({})
  
  const startTimeRef = useRef<number>(Date.now())
  const submissionStartRef = useRef<number | null>(null)
  const validationTimesRef = useRef<{ [key: string]: number }>({})

  // Initialize load time tracking
  useEffect(() => {
    const initTime = Date.now() - startTimeRef.current
    setLoadTime(initTime)
  }, [])

  // Track user interactions
  const trackInteraction = useCallback((type: UserInteractionMetrics['type'], target: string, duration?: number) => {
    const timestamp = Date.now()
    
    // Track first interaction
    if (firstInteraction === null) {
      setFirstInteraction(timestamp - startTimeRef.current)
    }
    
    // Update interaction count
    setInteractionCount(prev => prev + 1)
    
    // Track field focus
    if (type === 'focus') {
      setFieldFocusCount(prev => ({
        ...prev,
        [target]: (prev[target] || 0) + 1
      }))
    }
    
    // Add to interaction metrics
    formPerformanceTracker.addInteractionMetrics({
      type,
      target,
      timestamp,
      duration
    })
  }, [firstInteraction])

  // Track field validation performance
  const trackValidation = useCallback((fieldName: string, hasError: boolean, errorMessage?: string) => {
    const now = Date.now()
    const startTime = validationTimesRef.current[fieldName] || now
    const duration = now - startTime
    
    // Track validation errors
    if (hasError) {
      setValidationErrorCount(prev => ({
        ...prev,
        [fieldName]: (prev[fieldName] || 0) + 1
      }))
      setErrorCount(prev => prev + 1)
    }
    
    // Add validation metrics
    formPerformanceTracker.addValidationMetrics({
      fieldName,
      validationStartTime: startTime,
      validationEndTime: now,
      duration,
      hasError,
      errorMessage
    })
    
    // Clear validation start time
    delete validationTimesRef.current[fieldName]
  }, [])

  // Start validation timing
  const startValidation = useCallback((fieldName: string) => {
    validationTimesRef.current[fieldName] = Date.now()
  }, [])

  // Track form submission
  const trackSubmissionStart = useCallback(() => {
    submissionStartRef.current = Date.now()
  }, [])

  const trackSubmissionEnd = useCallback((success: boolean) => {
    if (submissionStartRef.current) {
      const duration = Date.now() - submissionStartRef.current
      setSubmissionTime(duration)
      
      if (!success) {
        setErrorCount(prev => prev + 1)
      }
      
      submissionStartRef.current = null
    }
  }, [])

  // Finalize metrics when component unmounts or form completes
  const finalizeMetrics = useCallback(() => {
    if (loadTime !== null) {
      const metrics: FormPerformanceMetrics = {
        formName,
        loadTime,
        firstInteraction,
        submissionTime,
        validationTime: Object.keys(validationTimesRef.current).length > 0 ? Date.now() - Math.min(...Object.values(validationTimesRef.current)) : null,
        errorCount,
        interactionCount,
        fieldFocusCount,
        validationErrorCount,
        timestamp: startTimeRef.current
      }
      
      formPerformanceTracker.addFormMetrics(metrics)
    }
  }, [formName, loadTime, firstInteraction, submissionTime, errorCount, interactionCount, fieldFocusCount, validationErrorCount])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      finalizeMetrics()
    }
  }, [finalizeMetrics])

  return {
    // Metrics
    loadTime,
    firstInteraction,
    submissionTime,
    validationTime: Object.keys(validationTimesRef.current).length > 0 ? Date.now() - Math.min(...Object.values(validationTimesRef.current)) : null,
    errorCount,
    interactionCount,
    fieldFocusCount,
    validationErrorCount,
    
    // Tracking functions
    trackInteraction,
    trackValidation,
    startValidation,
    endValidation: trackValidation, // Alias for backward compatibility
    trackSubmissionStart,
    trackSubmissionEnd,
    finalizeMetrics,
    
    // Additional methods for backward compatibility with forms
    startSubmission: trackSubmissionStart,
    recordValidationComplete: () => {}, // No-op for compatibility
    recordInteraction: trackInteraction,
    reportMetric: (metricName: string, value: number) => {
      // Log custom metrics for debugging
      if (process.env.NODE_ENV === 'development') {
        console.log(`[FORM-METRIC] ${formName}.${metricName}: ${value}`)
      }
    },
    
    // Performance data access
    getFormSummary: () => formPerformanceTracker.getPerformanceSummary(formName),
    
    // Performance status
    isSlowLoading: loadTime !== null && loadTime > 2000,
    isSlowSubmission: submissionTime !== null && submissionTime > 5000,
    hasHighErrorRate: errorCount > 5
  }
}

// Hook for validation performance monitoring
export function useValidationPerformanceMonitoring() {
  const validationTimers = useRef<{ [key: string]: number }>({})
  
  const startValidation = useCallback((fieldName: string) => {
    validationTimers.current[fieldName] = Date.now()
  }, [])
  
  const endValidation = useCallback((fieldName: string, hasError: boolean, errorMessage?: string) => {
    const startTime = validationTimers.current[fieldName]
    if (startTime) {
      const duration = Date.now() - startTime
      
      formPerformanceTracker.addValidationMetrics({
        fieldName,
        validationStartTime: startTime,
        validationEndTime: Date.now(),
        duration,
        hasError,
        errorMessage
      })
      
      delete validationTimers.current[fieldName]
      
      // Log slow validations
      if (duration > 100) {
        console.warn(`[VALIDATION-PERF] Slow validation for ${fieldName}: ${duration}ms`)
      }
    }
  }, [])
  
  return { startValidation, endValidation }
}

// Hook for accessing form performance data
export function useFormPerformanceData() {
  return {
    getFormMetrics: formPerformanceTracker.getFormMetrics.bind(formPerformanceTracker),
    getValidationMetrics: formPerformanceTracker.getValidationMetrics.bind(formPerformanceTracker),
    getInteractionMetrics: formPerformanceTracker.getInteractionMetrics.bind(formPerformanceTracker),
    getPerformanceSummary: formPerformanceTracker.getPerformanceSummary.bind(formPerformanceTracker)
  }
}