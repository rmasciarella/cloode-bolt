/**
 * @jest-environment jsdom
 */

import { renderHook, act } from '@testing-library/react'
import { useForm } from 'react-hook-form'
import { useFormPerformance } from '../form-performance.hooks'

// Mock performance monitoring
jest.mock('@/lib/performance/monitoring', () => ({
  performanceMonitor: {
    getMetrics: jest.fn(() => []),
    addMetric: jest.fn()
  }
}))

// Mock performance.now for consistent testing
const mockPerformanceNow = jest.fn()
Object.defineProperty(window, 'performance', {
  value: {
    now: mockPerformanceNow
  },
  writable: true
})

describe('useFormPerformance', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockPerformanceNow.mockReturnValue(1000) // Start with a baseline
  })

  test('should initialize with correct default metrics', async () => {
    const { result } = renderHook(() => {
      const form = useForm()
      return useFormPerformance(form, {
        formName: 'TestForm',
        trackFieldValidation: true,
        trackUserInteractions: true,
        logSlowOperations: true
      })
    })

    expect(result.current.metrics).toEqual(
      expect.objectContaining({
        formName: 'TestForm',
        loadTime: expect.any(Number),
        submissionTime: 0,
        validationTime: 0,
        fieldInteractions: 0,
        errorCount: 0,
        userInteractions: {
          clicks: 0,
          focuses: 0,
          changes: 0
        }
      })
    )
  })

  test('should track user interactions correctly', () => {
    const { result } = renderHook(() => {
      const form = useForm()
      return useFormPerformance(form, {
        formName: 'TestForm'
      })
    })

    act(() => {
      result.current.trackInteraction('click')
      result.current.trackInteraction('focus') 
      result.current.trackInteraction('change')
    })

    expect(result.current.metrics.userInteractions).toEqual({
      clicks: 1,
      focuses: 1,
      changes: 1
    })
    expect(result.current.metrics.fieldInteractions).toBe(3)
  })

  test('should create field event handlers correctly', () => {
    const { result } = renderHook(() => {
      const form = useForm()
      return useFormPerformance(form, {
        formName: 'TestForm'
      })
    })

    const handlers = result.current.createFieldEventHandlers('testField')
    
    expect(handlers).toHaveProperty('onClick')
    expect(handlers).toHaveProperty('onFocus')
    expect(handlers).toHaveProperty('onBlur')
    expect(handlers).toHaveProperty('onChange')
    
    expect(typeof handlers.onClick).toBe('function')
    expect(typeof handlers.onFocus).toBe('function')
    expect(typeof handlers.onBlur).toBe('function')
    expect(typeof handlers.onChange).toBe('function')
  })

  test('should create tracked onSubmit function', async () => {
    const { result } = renderHook(() => {
      const form = useForm()
      return useFormPerformance(form, {
        formName: 'TestForm'
      })
    })

    const mockSubmit = jest.fn().mockResolvedValue(undefined)
    const trackedSubmit = result.current.createTrackedOnSubmit(mockSubmit)

    expect(typeof trackedSubmit).toBe('function')

    // Mock successful submission
    mockPerformanceNow.mockReturnValueOnce(1000).mockReturnValueOnce(1500) // 500ms duration

    await act(async () => {
      await trackedSubmit({ testField: 'testValue' })
    })

    expect(mockSubmit).toHaveBeenCalledWith({ testField: 'testValue' })
  })

  test('should handle submission errors correctly', async () => {
    const { result } = renderHook(() => {
      const form = useForm()
      return useFormPerformance(form, {
        formName: 'TestForm'
      })
    })

    const mockSubmit = jest.fn().mockRejectedValue(new Error('Submission failed'))
    const trackedSubmit = result.current.createTrackedOnSubmit(mockSubmit)

    mockPerformanceNow.mockReturnValueOnce(1000).mockReturnValueOnce(1500) // 500ms duration

    await act(async () => {
      try {
        await trackedSubmit({ testField: 'testValue' })
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
        expect((error as Error).message).toBe('Submission failed')
      }
    })

    expect(mockSubmit).toHaveBeenCalledWith({ testField: 'testValue' })
  })

  test('should get form stats correctly', () => {
    const { result } = renderHook(() => {
      const form = useForm()
      return useFormPerformance(form, {
        formName: 'TestForm'
      })
    })

    const stats = result.current.getFormStats()
    expect(stats).toBeDefined()
    // Stats come from the FormPerformanceTracker singleton
  })

  test('should track field validation timing', () => {
    const { result } = renderHook(() => {
      const form = useForm()
      return useFormPerformance(form, {
        formName: 'TestForm',
        trackFieldValidation: true
      })
    })

    // Mock validation timing
    mockPerformanceNow.mockReturnValueOnce(1000).mockReturnValueOnce(1050) // 50ms validation

    act(() => {
      result.current.trackFieldValidation('testField', true) // Start validation
    })

    act(() => {
      result.current.trackFieldValidation('testField', false) // End validation
    })

    expect(result.current.metrics.validationTime).toBeGreaterThan(0)
  })
})