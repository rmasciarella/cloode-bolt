/**
 * Performance and Caching Initialization
 * Activates existing service layer hooks with production-ready configurations
 */

import { createServiceHooks } from '@/lib/hooks/service.hooks'
import { cacheManager } from '@/lib/cache/manager'
import { performanceMonitor } from '@/lib/performance/monitoring'

// Initialize service hooks with production configuration
export function initializePerformanceSystem() {
  console.log('[PERF] Initializing performance monitoring and caching systems...')

  // Activate all service layer hooks
  createServiceHooks({
    enableCaching: true,
    cacheTimeout: 300000, // 5 minutes
    enableAuditLog: process.env.NODE_ENV === 'development',
    enablePerformanceMonitoring: true,
    retryAttempts: 3
  })

  // The performance monitor and cache manager are automatically initialized
  // when imported, so they're already active

  console.log('[PERF] Performance systems initialized successfully')
  
  // Return cleanup function
  return () => {
    cacheManager.destroy()
    performanceMonitor.clear()
  }
}

// Export singleton initializer
let isInitialized = false
let cleanup: (() => void) | null = null

export function ensurePerformanceSystemInitialized() {
  if (!isInitialized) {
    cleanup = initializePerformanceSystem()
    isInitialized = true
  }
  return cleanup
}

// Auto-initialize in browser environment
if (typeof window !== 'undefined') {
  ensurePerformanceSystemInitialized()
}