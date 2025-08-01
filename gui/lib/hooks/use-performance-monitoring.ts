/**
 * Consolidated Performance Monitoring Hook
 * Provides unified interface for page-level performance monitoring
 */

import { useCallback, useEffect, useRef } from 'react'
import { performanceMonitor } from '@/lib/performance/monitoring'

interface PageMetrics {
  pageLoads: number
  userActions: number
  sessionDuration: number
  lastActivity: number
}

interface UserAction {
  type: string
  target: string
  timestamp: number
  metadata?: Record<string, any>
}

class PagePerformanceTracker {
  public pageMetrics: Map<string, PageMetrics> = new Map()
  private userActions: UserAction[] = []
  public sessionStart = Date.now()
  public isEnabled = true

  trackPageView(pageName: string) {
    if (!this.isEnabled) return

    const current = this.pageMetrics.get(pageName) || {
      pageLoads: 0,
      userActions: 0,
      sessionDuration: 0,
      lastActivity: Date.now()
    }

    this.pageMetrics.set(pageName, {
      ...current,
      pageLoads: current.pageLoads + 1,
      lastActivity: Date.now()
    })

    // Also track with the global performance monitor
    performanceMonitor.getMetrics()
  }

  trackUserAction(type: string, target: string, metadata?: Record<string, any>) {
    if (!this.isEnabled) return

    const action: UserAction = {
      type,
      target,
      timestamp: Date.now(),
      metadata
    }

    this.userActions.push(action)

    // Keep only recent actions to prevent memory bloat
    if (this.userActions.length > 1000) {
      this.userActions = this.userActions.slice(-500)
    }

    // Update page metrics if available
    for (const [pageName, metrics] of this.pageMetrics.entries()) {
      this.pageMetrics.set(pageName, {
        ...metrics,
        userActions: metrics.userActions + 1,
        lastActivity: Date.now()
      })
      break // Only update the most recent page
    }
  }

  getMetrics() {
    return {
      pages: Object.fromEntries(this.pageMetrics),
      actions: [...this.userActions],
      sessionDuration: Date.now() - this.sessionStart,
      isEnabled: this.isEnabled
    }
  }

  setEnabled(enabled: boolean) {
    this.isEnabled = enabled
  }

  clear() {
    this.pageMetrics.clear()
    this.userActions = []
  }
}

// Global tracker instance
const pageTracker = new PagePerformanceTracker()

export function usePerformanceMonitoring() {
  const lastPageRef = useRef<string | null>(null)

  const trackPageView = useCallback((pageName: string) => {
    pageTracker.trackPageView(pageName)
    lastPageRef.current = pageName
  }, [])

  const trackUserAction = useCallback((type: string, target: string, metadata?: Record<string, any>) => {
    pageTracker.trackUserAction(type, target, metadata)
  }, [])

  const getMetrics = useCallback(() => {
    return pageTracker.getMetrics()
  }, [])

  const setEnabled = useCallback((enabled: boolean) => {
    pageTracker.setEnabled(enabled)
  }, [])

  // Track session duration for current page
  useEffect(() => {
    const interval = setInterval(() => {
      if (lastPageRef.current) {
        const current = pageTracker.pageMetrics.get(lastPageRef.current)
        if (current) {
          pageTracker.pageMetrics.set(lastPageRef.current, {
            ...current,
            sessionDuration: Date.now() - pageTracker.sessionStart
          })
        }
      }
    }, 10000) // Update every 10 seconds

    return () => clearInterval(interval)
  }, [])

  return {
    trackPageView,
    trackUserAction,
    getMetrics,
    setEnabled,
    isEnabled: pageTracker.isEnabled,
    // Backward compatibility
    clear: pageTracker.clear.bind(pageTracker)
  }
}

// Export the tracker for advanced usage
export { pageTracker }