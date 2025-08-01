"use client"

import { useCallback, useRef, useEffect } from 'react'

interface PerformanceMetric {
  timestamp: string
  component: string
  operation: string
  duration_ms: number
  success: boolean
  error_msg?: string
  metadata?: Record<string, any>
}

interface FormPerformanceData {
  loadTime: number
  validationTimes: Record<string, number[]>
  submissionTimes: number[]
  errorCount: number
  interactionCount: number
  fieldFocusCount: Record<string, number>
  totalOperations: number
}

class PerformanceTracker {
  private metrics: PerformanceMetric[] = []
  private timers: Map<string, number> = new Map()
  private formData: Map<string, FormPerformanceData> = new Map()

  startTimer(key: string): void {
    this.timers.set(key, performance.now())
  }

  endTimer(key: string, component: string, operation: string, success: boolean = true, error?: string, metadata?: Record<string, any>): number {
    const startTime = this.timers.get(key)
    if (!startTime) {
      console.warn(`Timer ${key} not found`)
      return 0
    }

    const duration = performance.now() - startTime
    this.timers.delete(key)

    const metric: PerformanceMetric = {
      timestamp: new Date().toISOString(),
      component,
      operation,
      duration_ms: Math.round(duration),
      success,
      error_msg: error,
      metadata
    }

    this.metrics.push(metric)
    
    // Keep only recent metrics to prevent memory bloat
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-500)
    }

    return duration
  }

  recordInstantMetric(component: string, operation: string, success: boolean = true, error?: string, metadata?: Record<string, any>): void {
    const metric: PerformanceMetric = {
      timestamp: new Date().toISOString(),
      component,
      operation,
      duration_ms: 0,
      success,
      error_msg: error,
      metadata
    }

    this.metrics.push(metric)
  }

  getFormData(formId: string): FormPerformanceData {
    if (!this.formData.has(formId)) {
      this.formData.set(formId, {
        loadTime: 0,
        validationTimes: {},
        submissionTimes: [],
        errorCount: 0,
        interactionCount: 0,
        fieldFocusCount: {},
        totalOperations: 0
      })
    }
    return this.formData.get(formId)!
  }

  updateFormData(formId: string, updates: Partial<FormPerformanceData>): void {
    const current = this.getFormData(formId)
    this.formData.set(formId, { ...current, ...updates })
  }

  getMetrics(): PerformanceMetric[] {
    return [...this.metrics]
  }

  getFormMetrics(formId: string): FormPerformanceData {
    return this.getFormData(formId)
  }

  exportMetrics(): string {
    const export_data = {
      timestamp: new Date().toISOString(),
      metrics: this.metrics,
      formData: Object.fromEntries(this.formData)
    }
    return JSON.stringify(export_data, null, 2)
  }
}

// Global instance
const globalTracker = new PerformanceTracker()

export interface UsePerformanceMonitorReturn {
  startTimer: (key: string) => void
  endTimer: (key: string, operation: string, success?: boolean, error?: string, metadata?: Record<string, any>) => number
  recordInteraction: (type: string, fieldId?: string, metadata?: Record<string, any>) => void
  recordError: (error: string, operation: string, metadata?: Record<string, any>) => void
  recordValidation: (fieldId: string, duration: number, success: boolean, error?: string) => void
  recordSubmission: (duration: number, success: boolean, error?: string, metadata?: Record<string, any>) => void
  recordFormLoad: (duration: number) => void
  getMetrics: () => PerformanceMetric[]
  getFormMetrics: () => FormPerformanceData
  exportMetrics: () => string
}

export function usePerformanceMonitor(componentName: string): UsePerformanceMonitorReturn {
  const componentRef = useRef(componentName)
  const formDataRef = useRef(globalTracker.getFormData(componentName))

  useEffect(() => {
    // Record component mount
    globalTracker.recordInstantMetric(componentName, 'component_mount', true)
    
    return () => {
      // Record component unmount
      globalTracker.recordInstantMetric(componentName, 'component_unmount', true)
    }
  }, [componentName])

  const startTimer = useCallback((key: string): void => {
    globalTracker.startTimer(`${componentName}_${key}`)
  }, [componentName])

  const endTimer = useCallback((key: string, operation: string, success: boolean = true, error?: string, metadata?: Record<string, any>): number => {
    const duration = globalTracker.endTimer(`${componentName}_${key}`, componentName, operation, success, error, metadata)
    
    // Update form total operations
    const formData = globalTracker.getFormData(componentName)
    globalTracker.updateFormData(componentName, {
      totalOperations: formData.totalOperations + 1
    })
    
    return duration
  }, [componentName])

  const recordInteraction = useCallback((type: string, fieldId?: string, metadata?: Record<string, any>): void => {
    globalTracker.recordInstantMetric(componentName, `interaction_${type}`, true, undefined, { fieldId, ...metadata })
    
    const formData = globalTracker.getFormData(componentName)
    const updates: Partial<FormPerformanceData> = {
      interactionCount: formData.interactionCount + 1
    }

    if (fieldId && type === 'focus') {
      updates.fieldFocusCount = {
        ...formData.fieldFocusCount,
        [fieldId]: (formData.fieldFocusCount[fieldId] || 0) + 1
      }
    }

    globalTracker.updateFormData(componentName, updates)
  }, [componentName])

  const recordError = useCallback((error: string, operation: string, metadata?: Record<string, any>): void => {
    globalTracker.recordInstantMetric(componentName, operation, false, error, metadata)
    
    const formData = globalTracker.getFormData(componentName)
    globalTracker.updateFormData(componentName, {
      errorCount: formData.errorCount + 1
    })
  }, [componentName])

  const recordValidation = useCallback((fieldId: string, duration: number, success: boolean, error?: string): void => {
    globalTracker.recordInstantMetric(componentName, `validation_${fieldId}`, success, error, { duration, fieldId })
    
    const formData = globalTracker.getFormData(componentName)
    const validationTimes = { ...formData.validationTimes }
    
    if (!validationTimes[fieldId]) {
      validationTimes[fieldId] = []
    }
    validationTimes[fieldId].push(duration)
    
    // Keep only recent validation times per field
    if (validationTimes[fieldId].length > 50) {
      validationTimes[fieldId] = validationTimes[fieldId].slice(-25)
    }
    
    globalTracker.updateFormData(componentName, { validationTimes })
  }, [componentName])

  const recordSubmission = useCallback((duration: number, success: boolean, error?: string, metadata?: Record<string, any>): void => {
    globalTracker.recordInstantMetric(componentName, 'form_submission', success, error, { duration, ...metadata })
    
    const formData = globalTracker.getFormData(componentName)
    const submissionTimes = [...formData.submissionTimes, duration]
    
    // Keep only recent submission times
    if (submissionTimes.length > 20) {
      submissionTimes.splice(0, submissionTimes.length - 10)
    }
    
    globalTracker.updateFormData(componentName, { submissionTimes })
  }, [componentName])

  const recordFormLoad = useCallback((duration: number): void => {
    globalTracker.recordInstantMetric(componentName, 'form_load', true, undefined, { duration })
    globalTracker.updateFormData(componentName, { loadTime: duration })
  }, [componentName])

  const getMetrics = useCallback((): PerformanceMetric[] => {
    return globalTracker.getMetrics().filter(m => m.component === componentName)
  }, [componentName])

  const getFormMetrics = useCallback((): FormPerformanceData => {
    return globalTracker.getFormMetrics(componentName)
  }, [componentName])

  const exportMetrics = useCallback((): string => {
    return globalTracker.exportMetrics()
  }, [])

  return {
    startTimer,
    endTimer,
    recordInteraction,
    recordError,
    recordValidation,
    recordSubmission,
    recordFormLoad,
    getMetrics,
    getFormMetrics,
    exportMetrics
  }
}

// Debugging utilities
export function getGlobalPerformanceData(): any {
  return {
    metrics: globalTracker.getMetrics(),
    export: globalTracker.exportMetrics()
  }
}

// Performance monitoring utilities
export const performanceUtils = {
  measureAsync: async <T>(
    operation: () => Promise<T>,
    componentName: string,
    operationName: string,
    metadata?: Record<string, any>
  ): Promise<{ result: T; duration: number }> => {
    const start = performance.now()
    try {
      const result = await operation()
      const duration = performance.now() - start
      globalTracker.recordInstantMetric(componentName, operationName, true, undefined, { duration, ...metadata })
      return { result, duration }
    } catch (error) {
      const duration = performance.now() - start
      globalTracker.recordInstantMetric(componentName, operationName, false, String(error), { duration, ...metadata })
      throw error
    }
  },

  measureSync: <T>(
    operation: () => T,
    componentName: string,
    operationName: string,
    metadata?: Record<string, any>
  ): { result: T; duration: number } => {
    const start = performance.now()
    try {
      const result = operation()
      const duration = performance.now() - start
      globalTracker.recordInstantMetric(componentName, operationName, true, undefined, { duration, ...metadata })
      return { result, duration }
    } catch (error) {
      const duration = performance.now() - start
      globalTracker.recordInstantMetric(componentName, operationName, false, String(error), { duration, ...metadata })
      throw error
    }
  }
}