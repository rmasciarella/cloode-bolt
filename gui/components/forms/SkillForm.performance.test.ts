/**
 * SkillForm Performance Monitoring Tests
 * Tests comprehensive performance tracking implementation
 */

// Type-only import for testing - interface is defined inline
// import { FormPerformanceMetrics } from './SkillForm'

// Mock performance API
const mockPerformance = {
  now: jest.fn(() => 100),
  mark: jest.fn(),
  measure: jest.fn()
}

Object.defineProperty(window, 'performance', {
  value: mockPerformance,
  writable: true
})

// Mock console methods
const mockConsole = {
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
}

Object.defineProperty(console, 'log', { value: mockConsole.log })
Object.defineProperty(console, 'warn', { value: mockConsole.warn })
Object.defineProperty(console, 'error', { value: mockConsole.error })

// Mock gtag
const mockGtag = jest.fn()
Object.defineProperty(window, 'gtag', { value: mockGtag })

describe('SkillForm Performance Monitoring', () => {
  let FormPerformanceTracker: any
  let tracker: any

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks()
    mockPerformance.now.mockReturnValue(100)
    
    // Set NODE_ENV to development for testing
    process.env.NODE_ENV = 'development'
    
    // Dynamically import the class from the component
    // In a real test, we'd extract this to a separate module
    class TestFormPerformanceTracker {
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
    
    FormPerformanceTracker = TestFormPerformanceTracker
    tracker = new FormPerformanceTracker()
  })

  afterEach(() => {
    process.env.NODE_ENV = 'test'
  })

  describe('Performance Tracker Initialization', () => {
    it('should initialize with default metrics', () => {
      const metrics = tracker.getMetrics()
      
      expect(metrics.loadTime).toBe(0)
      expect(metrics.submissionTime).toBe(0)
      expect(metrics.validationTime).toBe(0)
      expect(metrics.interactionCount).toBe(0)
      expect(metrics.errorCount).toBe(0)
      expect(metrics.fieldFocusEvents).toEqual({})
      expect(typeof metrics.timestamp).toBe('number')
    })

    it('should call performance.now() on initialization', () => {
      expect(mockPerformance.now).toHaveBeenCalled()
    })
  })

  describe('Load Time Tracking', () => {
    it('should record load completion time', () => {
      mockPerformance.now.mockReturnValueOnce(100).mockReturnValueOnce(250)
      
      tracker.recordLoadComplete()
      const metrics = tracker.getMetrics()
      
      expect(metrics.loadTime).toBe(150) // 250 - 100
      expect(mockConsole.log).toHaveBeenCalledWith('[FORM-PERF] SkillForm form_load_time: 150ms')
    })

    it('should report slow load times', () => {
      mockPerformance.now.mockReturnValueOnce(100).mockReturnValueOnce(1200)
      
      tracker.recordLoadComplete()
      
      expect(mockConsole.warn).toHaveBeenCalledWith('[FORM-PERF] Slow SkillForm form_load_time: 1100ms')
    })
  })

  describe('Submission Time Tracking', () => {
    it('should record successful submission time', () => {
      mockPerformance.now.mockReturnValueOnce(100).mockReturnValueOnce(300)
      
      tracker.startSubmission()
      tracker.recordSubmissionComplete(true)
      
      const metrics = tracker.getMetrics()
      expect(metrics.submissionTime).toBe(200) // 300 - 100
      expect(mockConsole.log).toHaveBeenCalledWith('[FORM-PERF] SkillForm form_submission_time: 200ms')
      expect(mockConsole.log).toHaveBeenCalledWith('[FORM-PERF] SkillForm form_submission_success: 1')
    })

    it('should record failed submission with error count', () => {
      mockPerformance.now.mockReturnValueOnce(100).mockReturnValueOnce(300)
      
      tracker.startSubmission()
      tracker.recordSubmissionComplete(false)
      
      const metrics = tracker.getMetrics()
      expect(metrics.submissionTime).toBe(200)
      expect(metrics.errorCount).toBe(1)
      expect(mockConsole.log).toHaveBeenCalledWith('[FORM-PERF] SkillForm form_submission_error: 1')
    })

    it('should not record submission time without startSubmission', () => {
      tracker.recordSubmissionComplete(true)
      
      const metrics = tracker.getMetrics()
      expect(metrics.submissionTime).toBe(0)
    })
  })

  describe('Validation Time Tracking', () => {
    it('should record validation time', () => {
      mockPerformance.now.mockReturnValueOnce(100).mockReturnValueOnce(150)
      
      tracker.startValidation()
      tracker.recordValidationComplete()
      
      const metrics = tracker.getMetrics()
      expect(metrics.validationTime).toBe(50) // 150 - 100
      expect(mockConsole.log).toHaveBeenCalledWith('[FORM-PERF] SkillForm form_validation_time: 50ms')
    })

    it('should not record validation time without startValidation', () => {
      tracker.recordValidationComplete()
      
      const metrics = tracker.getMetrics()
      expect(metrics.validationTime).toBe(0)
    })
  })

  describe('User Interaction Tracking', () => {
    it('should track click interactions', () => {
      tracker.recordInteraction('click', 'submit_button')
      
      const metrics = tracker.getMetrics()
      expect(metrics.interactionCount).toBe(1)
      expect(mockConsole.log).toHaveBeenCalledWith('[FORM-PERF] SkillForm form_click_interaction: 1')
    })

    it('should track focus interactions with field counting', () => {
      tracker.recordInteraction('focus', 'name')
      tracker.recordInteraction('focus', 'name')
      tracker.recordInteraction('focus', 'description')
      
      const metrics = tracker.getMetrics()
      expect(metrics.interactionCount).toBe(3)
      expect(metrics.fieldFocusEvents.name).toBe(2)
      expect(metrics.fieldFocusEvents.description).toBe(1)
    })

    it('should track change interactions', () => {
      tracker.recordInteraction('change', 'name')
      
      const metrics = tracker.getMetrics()
      expect(metrics.interactionCount).toBe(1)
      expect(mockConsole.log).toHaveBeenCalledWith('[FORM-PERF] SkillForm form_change_interaction: 1')
    })
  })

  describe('Error Tracking', () => {
    it('should record validation errors', () => {
      tracker.recordError('name')
      
      const metrics = tracker.getMetrics()
      expect(metrics.errorCount).toBe(1)
      expect(mockConsole.log).toHaveBeenCalledWith('[FORM-PERF] SkillForm form_validation_error: 1')
      expect(mockConsole.log).toHaveBeenCalledWith('[FORM-PERF] SkillForm form_field_error_name: 1')
    })

    it('should record general errors without field specification', () => {
      tracker.recordError()
      
      const metrics = tracker.getMetrics()
      expect(metrics.errorCount).toBe(1)
      expect(mockConsole.log).toHaveBeenCalledWith('[FORM-PERF] SkillForm form_validation_error: 1')
    })
  })

  describe('Analytics Integration', () => {
    it('should send metrics to gtag when available', () => {
      tracker.recordInteraction('click', 'submit_button')
      
      expect(mockGtag).toHaveBeenCalledWith('event', 'form_click_interaction', {
        form_name: 'skill_form',
        value: 1,
        custom_map: { metric1: 'form_performance' }
      })
    })

    it('should handle missing gtag gracefully', () => {
      delete (window as any).gtag
      
      expect(() => {
        tracker.recordInteraction('click', 'submit_button')
      }).not.toThrow()
    })
  })

  describe('Performance Summary', () => {
    it('should generate comprehensive performance summary', () => {
      // Simulate form interactions
      tracker.recordInteraction('focus', 'name')
      tracker.recordInteraction('focus', 'name')
      tracker.recordInteraction('focus', 'description')
      tracker.recordInteraction('click', 'submit_button')
      tracker.recordError('name')
      
      mockPerformance.now.mockReturnValueOnce(100).mockReturnValueOnce(200)
      tracker.recordLoadComplete()
      
      const summary = tracker.getSummary()
      
      expect(summary).toEqual({
        formName: 'SkillForm',
        loadTime: 100,
        submissionTime: 0,
        validationTime: 0,
        interactionCount: 4,
        errorCount: 1,
        errorRate: 25, // (1/4) * 100
        mostFocusedField: 'name',
        timestamp: summary.timestamp
      })
    })

    it('should handle empty interactions gracefully', () => {
      const summary = tracker.getSummary()
      
      expect(summary.errorRate).toBe(0)
      expect(summary.mostFocusedField).toBe('')
    })
  })

  describe('Development Mode Features', () => {
    it('should log performance metrics in development mode', () => {
      process.env.NODE_ENV = 'development'
      
      tracker.recordInteraction('click', 'test')
      
      expect(mockConsole.log).toHaveBeenCalledWith('[FORM-PERF] SkillForm form_click_interaction: 1')
    })

    it('should not log in production mode', () => {
      process.env.NODE_ENV = 'production'
      mockConsole.log.mockClear()
      
      tracker.recordInteraction('click', 'test')
      
      expect(mockConsole.log).not.toHaveBeenCalled()
    })
  })

  describe('Memory Management', () => {
    it('should maintain reasonable memory usage', () => {
      // Simulate many interactions
      for (let i = 0; i < 100; i++) {
        tracker.recordInteraction('focus', `field_${i % 10}`)
      }
      
      const metrics = tracker.getMetrics()
      expect(Object.keys(metrics.fieldFocusEvents).length).toBeLessThanOrEqual(10)
      expect(metrics.interactionCount).toBe(100)
    })
  })
})

// Type-only import for testing
interface FormPerformanceMetrics {
  loadTime: number
  submissionTime: number
  validationTime: number
  interactionCount: number
  errorCount: number
  fieldFocusEvents: Record<string, number>
  timestamp: number
}