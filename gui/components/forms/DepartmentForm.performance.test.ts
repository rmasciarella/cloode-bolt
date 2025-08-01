/**
 * Performance monitoring tests for DepartmentForm
 * Tests the FormPerformanceTracker functionality
 */

// Extract the FormPerformanceTracker class for testing
interface FormPerformanceMetrics {
  loadTime: number
  submissionTime: number
  validationTime: number
  interactionCount: number
  errorCount: number
  fieldFocusEvents: Record<string, number>
  timestamp: number
}

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
    // Mock implementation for testing
    console.log(`[TEST-PERF] DepartmentForm ${name}: ${value}${name.includes('time') ? 'ms' : ''}`)
  }
  
  getMetrics(): FormPerformanceMetrics {
    return { ...this.metrics }
  }
  
  getSummary() {
    return {
      formName: 'DepartmentForm',
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

// Test suite
describe('DepartmentForm Performance Monitoring', () => {
  let tracker: FormPerformanceTracker
  
  beforeEach(() => {
    tracker = new FormPerformanceTracker()
  })
  
  test('should initialize with default metrics', () => {
    const metrics = tracker.getMetrics()
    expect(metrics.loadTime).toBe(0)
    expect(metrics.submissionTime).toBe(0)
    expect(metrics.validationTime).toBe(0)
    expect(metrics.interactionCount).toBe(0)
    expect(metrics.errorCount).toBe(0)
    expect(Object.keys(metrics.fieldFocusEvents)).toHaveLength(0)
  })
  
  test('should record load completion time', async () => {
    await new Promise(resolve => setTimeout(resolve, 10)) // Simulate load time
    tracker.recordLoadComplete()
    
    const metrics = tracker.getMetrics()
    expect(metrics.loadTime).toBeGreaterThan(0)
  })
  
  test('should record submission time', async () => {
    tracker.startSubmission()
    await new Promise(resolve => setTimeout(resolve, 5)) // Simulate submission time
    tracker.recordSubmissionComplete(true)
    
    const metrics = tracker.getMetrics()
    expect(metrics.submissionTime).toBeGreaterThan(0)
  })
  
  test('should record validation time', async () => {
    tracker.startValidation()
    await new Promise(resolve => setTimeout(resolve, 3)) // Simulate validation time
    tracker.recordValidationComplete()
    
    const metrics = tracker.getMetrics()
    expect(metrics.validationTime).toBeGreaterThan(0)
  })
  
  test('should track user interactions', () => {
    tracker.recordInteraction('click', 'submit_button')
    tracker.recordInteraction('focus', 'name_field')
    tracker.recordInteraction('focus', 'name_field') // Focus same field again
    tracker.recordInteraction('change', 'code_field')
    
    const metrics = tracker.getMetrics()
    expect(metrics.interactionCount).toBe(4)
    expect(metrics.fieldFocusEvents.name_field).toBe(2)
  })
  
  test('should track validation errors', () => {
    tracker.recordError('code')
    tracker.recordError('name')
    tracker.recordError() // Generic error
    
    const metrics = tracker.getMetrics()
    expect(metrics.errorCount).toBe(3)
  })
  
  test('should calculate error rate correctly', () => {
    // Simulate some interactions with errors
    tracker.recordInteraction('change', 'code')
    tracker.recordInteraction('change', 'name')
    tracker.recordError('code')
    
    const summary = tracker.getSummary()
    expect(summary.errorRate).toBe(50) // 1 error out of 2 interactions = 50%
  })
  
  test('should identify most focused field', () => {
    tracker.recordInteraction('focus', 'code')
    tracker.recordInteraction('focus', 'name')
    tracker.recordInteraction('focus', 'name')
    tracker.recordInteraction('focus', 'description')
    
    const summary = tracker.getSummary()
    expect(summary.mostFocusedField).toBe('name')
  })
  
  test('should handle submission success and failure', () => {
    // Test successful submission
    tracker.startSubmission()
    tracker.recordSubmissionComplete(true)
    
    // Test failed submission
    tracker.startSubmission()
    tracker.recordSubmissionComplete(false)
    
    const metrics = tracker.getMetrics()
    expect(metrics.errorCount).toBe(1) // Failed submission should increment error count
  })
  
  test('performance summary should include all key metrics', () => {
    tracker.recordLoadComplete()
    tracker.startSubmission()
    tracker.recordSubmissionComplete(true)
    tracker.recordInteraction('click', 'button')
    tracker.recordError('field')
    
    const summary = tracker.getSummary()
    
    expect(summary).toHaveProperty('formName', 'DepartmentForm')
    expect(summary).toHaveProperty('loadTime')
    expect(summary).toHaveProperty('submissionTime')
    expect(summary).toHaveProperty('validationTime')
    expect(summary).toHaveProperty('interactionCount')
    expect(summary).toHaveProperty('errorCount')
    expect(summary).toHaveProperty('errorRate')
    expect(summary).toHaveProperty('timestamp')
  })
})

export { FormPerformanceTracker, type FormPerformanceMetrics }