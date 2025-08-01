// Service Layer Hooks for data access extensibility

import { ServiceResponse } from '@/lib/services/base.service'

export interface ServiceHooks<T = any> {
  // Data access middleware hooks
  beforeQuery: (table: string, query: any) => any | Promise<any>
  afterQuery: (table: string, result: ServiceResponse<T>) => ServiceResponse<T> | Promise<ServiceResponse<T>>
  beforeMutation: (table: string, operation: 'create' | 'update' | 'delete', data: any) => any | Promise<any>
  afterMutation: (table: string, operation: 'create' | 'update' | 'delete', result: ServiceResponse<T>) => ServiceResponse<T> | Promise<ServiceResponse<T>>
  
  // Caching hooks
  getCacheKey: (table: string, query: any) => string
  shouldCache: (table: string, operation: string) => boolean
  onCacheHit: (key: string, data: T) => void
  onCacheMiss: (key: string) => void
  onCacheInvalidate: (table: string, operation: string, data: any) => string[]
  
  // Error handling hooks
  onError: (error: any, context: { table: string, operation: string, data?: any }) => ServiceResponse<T> | null
  shouldRetry: (error: any, attempt: number) => boolean
  
  // Performance monitoring hooks
  onQueryStart: (table: string, operation: string) => void
  onQueryEnd: (table: string, operation: string, duration: number) => void
  
  // Data transformation hooks
  transformInput: (table: string, operation: string, data: any) => any | Promise<any>
  transformOutput: (table: string, operation: string, data: T) => T | Promise<T>
  
  // Audit and logging hooks
  onAuditLog: (table: string, operation: string, data: any, user?: any) => void
  
  // Permission hooks
  canRead: (table: string, query: any, user?: any) => boolean | Promise<boolean>
  canWrite: (table: string, operation: 'create' | 'update' | 'delete', data: any, user?: any) => boolean | Promise<boolean>
}

type ServiceHookHandler<T, K extends keyof ServiceHooks<T>> = ServiceHooks<T>[K]

class ServiceHookRegistry<T = any> {
  private hooks: Map<keyof ServiceHooks<T>, Array<{ handler: ServiceHookHandler<T, any>, priority: number }>> = new Map()
  private cache = new Map<string, { data: T, timestamp: number, ttl: number }>()
  
  register<K extends keyof ServiceHooks<T>>(
    hookName: K,
    handler: ServiceHookHandler<T, K>,
    priority: number = 10
  ): () => void {
    if (!this.hooks.has(hookName)) {
      this.hooks.set(hookName, [])
    }
    
    const handlers = this.hooks.get(hookName)!
    handlers.push({ handler, priority })
    handlers.sort((a, b) => a.priority - b.priority)
    
    return () => {
      const index = handlers.findIndex(h => h.handler === handler)
      if (index > -1) handlers.splice(index, 1)
    }
  }
  
  async execute<K extends keyof ServiceHooks<T>>(
    hookName: K,
    ...args: Parameters<ServiceHookHandler<T, K>>
  ): Promise<any> {
    const handlers = this.hooks.get(hookName) || []
    
    // Data transformation hooks (chain)
    if (['beforeQuery', 'beforeMutation', 'transformInput', 'transformOutput'].includes(hookName as string)) {
      return handlers.reduce(async (result, { handler }) => {
        const data = await result
        return handler(args[0], args[1], data)
      }, Promise.resolve(args[2] || args[1]))
    }
    
    // Response transformation hooks (chain)
    if (['afterQuery', 'afterMutation'].includes(hookName as string)) {
      return handlers.reduce(async (result, { handler }) => {
        const response = await result
        return handler(args[0], args[1], response)
      }, Promise.resolve(args[2]))
    }
    
    // Permission hooks (all must return true)
    if (['canRead', 'canWrite'].includes(hookName as string)) {
      for (const { handler } of handlers) {
        const result = await handler(...args)
        if (!result) return false
      }
      return true
    }
    
    // Error handling hooks (first successful result wins)
    if (hookName === 'onError') {
      for (const { handler } of handlers) {
        const result = await handler(...args)
        if (result !== null) return result
      }
      return null
    }
    
    // Single value hooks (first result wins)
    if (['getCacheKey', 'shouldCache', 'shouldRetry'].includes(hookName as string)) {
      if (handlers.length > 0) {
        return handlers[0].handler(...args)
      }
      return undefined
    }
    
    // Notification hooks (fire all)
    await Promise.all(handlers.map(({ handler }) => handler(...args)))
  }
  
  // Built-in caching methods
  async getFromCache(key: string): Promise<T | undefined> {
    const entry = this.cache.get(key)
    if (!entry) {
      await this.execute('onCacheMiss', key)
      return undefined
    }
    
    if (Date.now() > entry.timestamp + entry.ttl) {
      this.cache.delete(key)
      await this.execute('onCacheMiss', key)
      return undefined
    }
    
    await this.execute('onCacheHit', key, entry.data)
    return entry.data
  }
  
  setCache(key: string, data: T, ttl: number = 300000): void { // 5 min default
    this.cache.set(key, { data, timestamp: Date.now(), ttl })
  }
  
  invalidateCache(pattern: string): void {
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key)
      }
    }
  }
}

export const serviceRegistry = new ServiceHookRegistry()

// Enhanced base service with hook integration
export class HookableBaseService {
  protected async executeWithHooks<T>(
    table: string,
    operation: string,
    queryFn: () => Promise<ServiceResponse<T>>,
    data?: any
  ): Promise<ServiceResponse<T>> {
    const startTime = Date.now()
    
    try {
      // Execute permission checks
      if (operation === 'create' || operation === 'update' || operation === 'delete') {
        const canWrite = await serviceRegistry.execute('canWrite', table, operation, data)
        if (!canWrite) {
          return { data: null, error: 'Permission denied', success: false }
        }
      } else {
        const canRead = await serviceRegistry.execute('canRead', table, data)
        if (!canRead) {
          return { data: null, error: 'Permission denied', success: false }
        }
      }
      
      // Check cache for read operations
      if (operation === 'getAll' || operation === 'getById') {
        const cacheKey = await serviceRegistry.execute('getCacheKey', table, data) || `${table}:${operation}:${JSON.stringify(data)}`
        const shouldCache = await serviceRegistry.execute('shouldCache', table, operation)
        
        if (shouldCache) {
          const cached = await serviceRegistry.getFromCache<T>(cacheKey)
          if (cached) {
            return { data: cached, error: null, success: true }
          }
        }
      }
      
      // Transform input
      const transformedData = await serviceRegistry.execute('transformInput', table, operation, data)
      
      // Execute hooks before operation
      if (operation === 'create' || operation === 'update' || operation === 'delete') {
        await serviceRegistry.execute('beforeMutation', table, operation, transformedData)
      } else {
        await serviceRegistry.execute('beforeQuery', table, transformedData)
      }
      
      // Performance monitoring
      await serviceRegistry.execute('onQueryStart', table, operation)
      
      // Execute the actual operation
      let result = await queryFn()
      
      // Transform output
      if (result.success && result.data) {
        result.data = await serviceRegistry.execute('transformOutput', table, operation, result.data) || result.data
      }
      
      // Execute hooks after operation
      if (operation === 'create' || operation === 'update' || operation === 'delete') {
        result = await serviceRegistry.execute('afterMutation', table, operation, result) || result
        
        // Invalidate related cache entries
        const invalidationKeys = await serviceRegistry.execute('onCacheInvalidate', table, operation, data) || [table]
        invalidationKeys.forEach(key => serviceRegistry.invalidateCache(key))
      } else {
        result = await serviceRegistry.execute('afterQuery', table, result) || result
        
        // Cache successful read results
        const shouldCache = await serviceRegistry.execute('shouldCache', table, operation)
        if (shouldCache && result.success && result.data) {
          const cacheKey = await serviceRegistry.execute('getCacheKey', table, data) || `${table}:${operation}:${JSON.stringify(data)}`
          serviceRegistry.setCache(cacheKey, result.data)
        }
      }
      
      // Audit logging
      await serviceRegistry.execute('onAuditLog', table, operation, data)
      
      return result
      
    } catch (error) {
      // Try error recovery hooks
      const recovered = await serviceRegistry.execute('onError', error, { table, operation, data })
      if (recovered) return recovered
      
      // Return original error
      return { data: null, error: error instanceof Error ? error.message : 'Unknown error', success: false }
    } finally {
      const duration = Date.now() - startTime
      await serviceRegistry.execute('onQueryEnd', table, operation, duration)
    }
  }
}

// Factory for common service hook patterns
export function createServiceHooks(config: {
  enableCaching?: boolean
  cacheTimeout?: number
  enableAuditLog?: boolean
  enablePerformanceMonitoring?: boolean
  retryAttempts?: number
}) {
  // Default caching behavior
  if (config.enableCaching) {
    serviceRegistry.register('shouldCache', (table, operation) => {
      return ['getAll', 'getById'].includes(operation)
    })
    
    serviceRegistry.register('getCacheKey', (table, query) => {
      return `${table}:${JSON.stringify(query)}`
    })
    
    serviceRegistry.register('onCacheInvalidate', (table, operation) => {
      return [table] // Invalidate all cache entries for this table
    })
  }
  
  // Audit logging
  if (config.enableAuditLog) {
    serviceRegistry.register('onAuditLog', (table, operation, data) => {
      console.log(`[AUDIT] ${table}.${operation}:`, data)
    })
  }
  
  // Performance monitoring
  if (config.enablePerformanceMonitoring) {
    const startTimes = new Map<string, number>()
    
    serviceRegistry.register('onQueryStart', (table, operation) => {
      startTimes.set(`${table}:${operation}`, Date.now())
    })
    
    serviceRegistry.register('onQueryEnd', (table, operation, duration) => {
      console.log(`[PERF] ${table}.${operation}: ${duration}ms`)
      if (duration > 1000) {
        console.warn(`[PERF] Slow query detected: ${table}.${operation} took ${duration}ms`)
      }
    })
  }
  
  // Retry logic
  if (config.retryAttempts && config.retryAttempts > 0) {
    serviceRegistry.register('shouldRetry', (error, attempt) => {
      return attempt < config.retryAttempts! && 
             (error.code === 'NETWORK_ERROR' || error.code === 'TIMEOUT')
    })
  }
  
  return serviceRegistry
}