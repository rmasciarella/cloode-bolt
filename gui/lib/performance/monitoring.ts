/**
 * Performance Monitoring Implementation
 * Activates existing service layer performance hooks and adds Core Web Vitals tracking
 */

import { serviceRegistry } from '@/lib/hooks/service.hooks'

interface PerformanceMetrics {
  queryDuration: number
  tableName: string
  operation: string
  timestamp: number
}

interface WebVitals {
  name: string
  value: number
  rating: 'good' | 'needs-improvement' | 'poor'
  delta: number
  id: string
  timestamp: number
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = []
  private webVitals: WebVitals[] = []
  private readonly maxMetrics = 1000 // Keep last 1000 metrics
  
  constructor() {
    this.initializeServiceHooks()
    this.initializeWebVitals()
  }

  private initializeServiceHooks() {
    const queryStartTimes = new Map<string, number>()
    
    // Register performance monitoring hooks
    serviceRegistry.register('onQueryStart', (table: string, operation: string) => {
      const key = `${table}:${operation}:${Date.now()}`
      queryStartTimes.set(key, Date.now())
    }, 1) // High priority

    serviceRegistry.register('onQueryEnd', (table: string, operation: string, duration: number) => {
      // Store metric
      this.addMetric({
        queryDuration: duration,
        tableName: table,
        operation,
        timestamp: Date.now()
      })

      // Log slow queries
      if (duration > 1000) {
        console.warn(`[PERF] Slow query detected: ${table}.${operation} took ${duration}ms`)
        this.reportSlowQuery(table, operation, duration)
      }

      // Log to console in development
      if (process.env.NODE_ENV === 'development') {
        console.log(`[PERF] ${table}.${operation}: ${duration}ms`)
      }
    }, 1)
  }

  private initializeWebVitals() {
    // Only initialize in browser environment
    if (typeof window === 'undefined') return

    // Dynamically import web-vitals if available
    import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
      getCLS(this.handleWebVital.bind(this))
      getFID(this.handleWebVital.bind(this))
      getFCP(this.handleWebVital.bind(this))
      getLCP(this.handleWebVital.bind(this))
      getTTFB(this.handleWebVital.bind(this))
    }).catch(() => {
      // web-vitals not available, fallback to basic performance API
      this.initializeBasicPerformanceTracking()
    })
  }

  private initializeBasicPerformanceTracking() {
    if (typeof window === 'undefined' || !window.performance) return

    // Track page load time
    window.addEventListener('load', () => {
      const loadTime = performance.now()
      this.addWebVital({
        name: 'page-load',
        value: loadTime,
        rating: loadTime < 2500 ? 'good' : loadTime < 4000 ? 'needs-improvement' : 'poor',
        delta: loadTime,
        id: 'page-load-' + Date.now(),
        timestamp: Date.now()
      })
    })

    // Track first contentful paint if available
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.name === 'first-contentful-paint') {
              this.addWebVital({
                name: 'FCP',
                value: entry.startTime,
                rating: entry.startTime < 1800 ? 'good' : entry.startTime < 3000 ? 'needs-improvement' : 'poor',
                delta: entry.startTime,
                id: 'fcp-' + Date.now(),
                timestamp: Date.now()
              })
            }
          }
        })
        observer.observe({ entryTypes: ['paint'] })
      } catch (e) {
        // PerformanceObserver not supported
      }
    }
  }

  private handleWebVital(metric: any) {
    this.addWebVital({
      name: metric.name,
      value: metric.value,
      rating: metric.rating,
      delta: metric.delta,
      id: metric.id,
      timestamp: Date.now()
    })

    // Log poor vitals
    if (metric.rating === 'poor') {
      console.warn(`[WEB-VITALS] Poor ${metric.name}: ${metric.value}`)
    }
  }

  private addMetric(metric: PerformanceMetrics) {
    this.metrics.push(metric)
    
    // Keep only the most recent metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics)
    }
  }

  private addWebVital(vital: WebVitals) {
    this.webVitals.push(vital)
    
    // Keep only the most recent vitals
    if (this.webVitals.length > this.maxMetrics) {
      this.webVitals = this.webVitals.slice(-this.maxMetrics)
    }
  }

  private reportSlowQuery(table: string, operation: string, duration: number) {
    // In a production app, you might send this to an analytics service
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'slow_query', {
        table_name: table,
        operation: operation,
        duration: duration,
        custom_map: { metric1: 'query_performance' }
      })
    }
  }

  // Public API
  getMetrics(since?: number): PerformanceMetrics[] {
    if (!since) return [...this.metrics]
    return this.metrics.filter(m => m.timestamp >= since)
  }

  getWebVitals(): WebVitals[] {
    return [...this.webVitals]
  }

  getSlowQueries(threshold = 1000): PerformanceMetrics[] {
    return this.metrics.filter(m => m.queryDuration >= threshold)
  }

  getAverageQueryTime(table?: string, operation?: string): number {
    let filteredMetrics = this.metrics
    
    if (table) {
      filteredMetrics = filteredMetrics.filter(m => m.tableName === table)
    }
    
    if (operation) {
      filteredMetrics = filteredMetrics.filter(m => m.operation === operation)
    }
    
    if (filteredMetrics.length === 0) return 0
    
    const total = filteredMetrics.reduce((sum, m) => sum + m.queryDuration, 0)
    return total / filteredMetrics.length
  }

  getPerformanceSummary() {
    const slowQueries = this.getSlowQueries()
    const poorVitals = this.webVitals.filter(v => v.rating === 'poor')
    
    return {
      totalQueries: this.metrics.length,
      slowQueries: slowQueries.length,
      averageQueryTime: this.getAverageQueryTime(),
      poorWebVitals: poorVitals.length,
      lastUpdated: new Date().toISOString()
    }
  }

  clear() {
    this.metrics = []
    this.webVitals = []
  }
}

// Global instance
export const performanceMonitor = new PerformanceMonitor()

// React hook for accessing performance data  
export function usePerformanceMonitor() {
  return {
    getMetrics: performanceMonitor.getMetrics.bind(performanceMonitor),
    getWebVitals: performanceMonitor.getWebVitals.bind(performanceMonitor),
    getSlowQueries: performanceMonitor.getSlowQueries.bind(performanceMonitor),
    getAverageQueryTime: performanceMonitor.getAverageQueryTime.bind(performanceMonitor),
    getPerformanceSummary: performanceMonitor.getPerformanceSummary.bind(performanceMonitor)
  }
}

// Re-export the comprehensive performance monitoring hook from hooks/use-performance-monitor
export { usePerformanceMonitor as usePerformanceMonitorHook, performanceUtils } from '@/hooks/use-performance-monitor'

// TypeScript declarations for gtag
declare global {
  interface Window {
    gtag?: (command: string, targetId: string, config?: Record<string, any>) => void
  }
}