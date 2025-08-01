/**
 * Centralized Performance Monitoring Exports
 * Provides consistent interface for all performance monitoring across the application
 */

// Export the core performance monitor and its basic hook
export { 
  performanceMonitor, 
  usePerformanceMonitor as useBasicPerformanceMonitor 
} from './monitoring'

// Export the comprehensive form performance hooks
export {
  usePerformanceMonitor,
  performanceUtils,
  getGlobalPerformanceData,
  type UsePerformanceMonitorReturn
} from '@/hooks/use-performance-monitor'

// Export form-specific performance hooks
export {
  useFormPerformanceMonitoring,
  useFormPerformanceMonitoring as useFormPerformance,
  useValidationPerformanceMonitoring,
  useFormPerformanceData,
  formPerformanceTracker
} from '@/lib/hooks/form-performance.hooks'

// Export page-level performance monitoring
export {
  usePerformanceMonitoring,
  pageTracker
} from '@/lib/hooks/use-performance-monitoring'

// Re-export for backward compatibility with existing imports
export {
  usePerformanceMonitor as usePerformanceMonitorComprehensive,
  performanceUtils as performanceUtilities
} from '@/hooks/use-performance-monitor'