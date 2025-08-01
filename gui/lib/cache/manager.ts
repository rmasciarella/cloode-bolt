/**
 * Caching Strategy Implementation
 * Enables existing service layer caching with TanStack Query integration
 */

import { serviceRegistry } from '@/lib/hooks/service.hooks'

interface CacheConfig {
  enableServiceCache: boolean
  defaultTTL: number
  maxCacheSize: number
  enableTanStackQuery: boolean
}

interface CacheEntry {
  data: any
  timestamp: number
  ttl: number
  hits: number
  lastAccessed: number
}

class CacheManager {
  private cache = new Map<string, CacheEntry>()
  private config: CacheConfig
  private cleanupInterval: NodeJS.Timeout | null = null

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      enableServiceCache: true,
      defaultTTL: 300000, // 5 minutes
      maxCacheSize: 1000,
      enableTanStackQuery: true,
      ...config
    }

    this.initializeServiceHooks()
    this.startCleanupInterval()
  }

  private initializeServiceHooks() {
    if (!this.config.enableServiceCache) return

    // Cache key generation
    serviceRegistry.register('getCacheKey', (table: string, query: any) => {
      const queryString = typeof query === 'object' ? JSON.stringify(query) : String(query)
      return `${table}:${Buffer.from(queryString).toString('base64')}`
    }, 1)

    // Determine what should be cached
    serviceRegistry.register('shouldCache', (table: string, operation: string) => {
      // Cache read operations but not writes
      return ['getAll', 'getById', 'search', 'filter'].includes(operation)
    }, 1)

    // Cache hit/miss tracking
    serviceRegistry.register('onCacheHit', (key: string, data: any) => {
      const entry = this.cache.get(key)
      if (entry) {
        entry.hits++
        entry.lastAccessed = Date.now()
      }
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`[CACHE] Hit: ${key}`)
      }
    }, 1)

    serviceRegistry.register('onCacheMiss', (key: string) => {
      if (process.env.NODE_ENV === 'development') {
        console.log(`[CACHE] Miss: ${key}`)
      }
    }, 1)

    // Cache invalidation patterns
    serviceRegistry.register('onCacheInvalidate', (table: string, operation: string, data: any) => {
      const patterns = [table]
      
      // Add specific invalidation patterns based on operation
      if (operation === 'create' || operation === 'update' || operation === 'delete') {
        // Invalidate list views
        patterns.push(`${table}:getAll`)
        patterns.push(`${table}:search`)
        patterns.push(`${table}:filter`)
        
        // If updating/deleting specific record, invalidate its cache
        if (data?.id || data?.pattern_id) {
          const id = data.id || data.pattern_id
          patterns.push(`${table}:getById:${id}`)
        }
      }
      
      return patterns
    }, 1)

    // Override the built-in cache methods with our enhanced implementation
    const originalGetFromCache = serviceRegistry.getFromCache.bind(serviceRegistry)
    const originalSetCache = serviceRegistry.setCache.bind(serviceRegistry)
    const originalInvalidateCache = serviceRegistry.invalidateCache.bind(serviceRegistry)

    serviceRegistry.getFromCache = async (key: string) => {
      const entry = this.cache.get(key)
      if (!entry) {
        await serviceRegistry.execute('onCacheMiss', key)
        return undefined
      }

      if (Date.now() > entry.timestamp + entry.ttl) {
        this.cache.delete(key)
        await serviceRegistry.execute('onCacheMiss', key)
        return undefined
      }

      await serviceRegistry.execute('onCacheHit', key, entry.data)
      return entry.data
    }

    serviceRegistry.setCache = (key: string, data: any, ttl: number = this.config.defaultTTL) => {
      // Implement LRU eviction if at capacity
      if (this.cache.size >= this.config.maxCacheSize) {
        this.evictLRU()
      }

      this.cache.set(key, {
        data,
        timestamp: Date.now(),
        ttl,
        hits: 0,
        lastAccessed: Date.now()
      })
    }

    serviceRegistry.invalidateCache = (pattern: string) => {
      let removed = 0
      for (const key of this.cache.keys()) {
        if (key.includes(pattern)) {
          this.cache.delete(key)
          removed++
        }
      }
      
      if (process.env.NODE_ENV === 'development' && removed > 0) {
        console.log(`[CACHE] Invalidated ${removed} entries matching: ${pattern}`)
      }
    }
  }

  private evictLRU() {
    let oldestKey: string | null = null
    let oldestTime = Date.now()

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed
        oldestKey = key
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey)
      if (process.env.NODE_ENV === 'development') {
        console.log(`[CACHE] Evicted LRU entry: ${oldestKey}`)
      }
    }
  }

  private startCleanupInterval() {
    // Clean up expired entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredEntries()
    }, 300000)
  }

  private cleanupExpiredEntries() {
    const now = Date.now()
    let removed = 0

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.timestamp + entry.ttl) {
        this.cache.delete(key)
        removed++
      }
    }

    if (process.env.NODE_ENV === 'development' && removed > 0) {
      console.log(`[CACHE] Cleaned up ${removed} expired entries`)
    }
  }

  // Public API
  getCacheStats() {
    const entries = Array.from(this.cache.values())
    const totalHits = entries.reduce((sum, entry) => sum + entry.hits, 0)
    const totalEntries = entries.length
    
    return {
      totalEntries,
      totalHits,
      hitRate: totalEntries > 0 ? totalHits / totalEntries : 0,
      memoryUsage: this.cache.size,
      maxSize: this.config.maxCacheSize
    }
  }

  clearCache() {
    this.cache.clear()
    if (process.env.NODE_ENV === 'development') {
      console.log('[CACHE] Cleared all entries')
    }
  }

  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
    this.clearCache()
  }
}

// TanStack Query configuration for service integration
export const queryClientConfig = {
  defaultOptions: {
    queries: {
      staleTime: 300000, // 5 minutes
      gcTime: 600000, // 10 minutes (formerly cacheTime)
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      retry: (failureCount: number, error: any) => {
        // Don't retry on 4xx errors
        if (error?.status >= 400 && error?.status < 500) return false
        return failureCount < 3
      }
    },
    mutations: {
      retry: 1
    }
  }
}

// React Query key factories for consistent cache keys
export const queryKeys = {
  // Job Templates
  jobTemplates: {
    all: ['jobTemplates'] as const,
    list: (filters?: Record<string, any>) => ['jobTemplates', 'list', filters] as const,
    detail: (id: string) => ['jobTemplates', 'detail', id] as const
  },
  
  // Departments
  departments: {
    all: ['departments'] as const,
    list: (activeOnly?: boolean) => ['departments', 'list', { activeOnly }] as const,
    detail: (id: string) => ['departments', 'detail', id] as const
  },
  
  // Work Cells
  workCells: {
    all: ['workCells'] as const,
    list: (filters?: Record<string, any>) => ['workCells', 'list', filters] as const,
    detail: (id: string) => ['workCells', 'detail', id] as const
  },
  
  // Generic factory for other entities
  entity: (entityName: string) => ({
    all: [entityName] as const,
    list: (filters?: Record<string, any>) => [entityName, 'list', filters] as const,
    detail: (id: string) => [entityName, 'detail', id] as const
  })
}

// Global cache manager instance
export const cacheManager = new CacheManager()

// Hook for accessing cache statistics
export function useCacheStats() {
  return cacheManager.getCacheStats()
}