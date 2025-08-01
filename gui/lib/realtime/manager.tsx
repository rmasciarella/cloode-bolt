/**
 * Real-time Updates Manager
 * Leverages existing Supabase real-time setup with conflict resolution
 */

"use client"

import { supabase } from '@/lib/supabase'
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import { useEffect, useCallback, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/cache/manager'
import { useToast } from '@/hooks/use-toast'

interface RealtimeSubscription {
  table: string
  channel: RealtimeChannel
  callbacks: Set<RealtimeCallback>
}

type RealtimeCallback = (payload: RealtimePostgresChangesPayload<any>) => void

interface ConflictResolutionStrategy {
  strategy: 'client-wins' | 'server-wins' | 'merge' | 'prompt-user'
  mergeFields?: string[]
}

interface RealtimeOptions {
  conflictResolution?: ConflictResolutionStrategy
  enableOptimisticUpdates?: boolean
  debounceMs?: number
}

class RealtimeManager {
  private subscriptions = new Map<string, RealtimeSubscription>()
  private conflictBuffer = new Map<string, any>()
  private readonly defaultOptions: RealtimeOptions = {
    conflictResolution: { strategy: 'server-wins' },
    enableOptimisticUpdates: true,
    debounceMs: 100
  }

  subscribe(
    table: string, 
    callback: RealtimeCallback, 
    options: RealtimeOptions = {}
  ): () => void {
    const mergedOptions = { ...this.defaultOptions, ...options }
    let subscription = this.subscriptions.get(table)

    if (!subscription) {
      // Create new subscription
      const channel = supabase
        .channel(`realtime-${table}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: table
          },
          (payload) => this.handleRealtimeEvent(table, payload, mergedOptions)
        )
        .subscribe()

      subscription = {
        table,
        channel,
        callbacks: new Set()
      }
      
      this.subscriptions.set(table, subscription)
    }

    // Add callback
    subscription.callbacks.add(callback)

    // Return unsubscribe function
    return () => {
      subscription?.callbacks.delete(callback)
      
      // If no more callbacks, remove the subscription
      if (subscription?.callbacks.size === 0) {
        subscription.channel.unsubscribe()
        this.subscriptions.delete(table)
      }
    }
  }

  private async handleRealtimeEvent(
    table: string,
    payload: RealtimePostgresChangesPayload<any>,
    options: RealtimeOptions
  ) {
    console.log(`[REALTIME] ${table} event:`, payload.eventType, payload)

    // Check for conflicts if this is an update
    if (payload.eventType === 'UPDATE' && payload.old && payload.new) {
      const hasConflict = await this.detectConflict(table, payload)
      if (hasConflict) {
        await this.resolveConflict(table, payload, options.conflictResolution!)
        return
      }
    }

    // Execute all callbacks for this table
    const subscription = this.subscriptions.get(table)
    if (subscription) {
      subscription.callbacks.forEach(callback => {
        try {
          callback(payload)
        } catch (error) {
          console.error(`[REALTIME] Callback error for ${table}:`, error)
        }
      })
    }
  }

  private async detectConflict(
    table: string,
    payload: RealtimePostgresChangesPayload<any>
  ): Promise<boolean> {
    // Simple conflict detection: check if we have a local optimistic update
    // that differs from the server update
    const recordId = payload.new?.id || payload.new?.pattern_id
    if (!recordId) return false

    const localVersion = this.conflictBuffer.get(`${table}:${recordId}`)
    if (!localVersion) return false

    // Compare timestamps or version fields
    const serverUpdatedAt = new Date(payload.new?.updated_at || 0).getTime()
    const localUpdatedAt = new Date(localVersion.updated_at || 0).getTime()

    return localUpdatedAt > serverUpdatedAt
  }

  private async resolveConflict(
    table: string,
    payload: RealtimePostgresChangesPayload<any>,
    strategy: ConflictResolutionStrategy
  ) {
    console.log(`[REALTIME] Conflict detected for ${table}, resolving with strategy:`, strategy.strategy)

    const recordId = payload.new?.id || payload.new?.pattern_id
    const localVersion = this.conflictBuffer.get(`${table}:${recordId}`)

    switch (strategy.strategy) {
      case 'client-wins':
        // Keep local changes, ignore server update
        console.log('[REALTIME] Conflict resolved: client wins')
        break

      case 'server-wins':
        // Accept server update, discard local changes
        console.log('[REALTIME] Conflict resolved: server wins')
        this.conflictBuffer.delete(`${table}:${recordId}`)
        break

      case 'merge':
        // Merge specified fields
        if (strategy.mergeFields) {
          const merged = { ...payload.new }
          strategy.mergeFields.forEach(field => {
            if (localVersion[field] !== undefined) {
              merged[field] = localVersion[field]
            }
          })
          payload.new = merged
        }
        console.log('[REALTIME] Conflict resolved: merged')
        this.conflictBuffer.delete(`${table}:${recordId}`)
        break

      case 'prompt-user':
        // Store conflict for user resolution
        this.storeConflictForUserResolution(table, recordId, localVersion, payload.new)
        return // Don't execute callbacks yet
    }
  }

  private storeConflictForUserResolution(
    table: string,
    recordId: string,
    localVersion: any,
    serverVersion: any
  ) {
    // This would typically show a modal or notification
    // For now, we'll just log it
    console.warn('[REALTIME] User resolution required:', {
      table,
      recordId,
      localVersion,
      serverVersion
    })
  }

  // Store optimistic update for conflict detection
  storeOptimisticUpdate(table: string, recordId: string, data: any) {
    this.conflictBuffer.set(`${table}:${recordId}`, {
      ...data,
      updated_at: new Date().toISOString()
    })
  }

  // Clear optimistic update
  clearOptimisticUpdate(table: string, recordId: string) {
    this.conflictBuffer.delete(`${table}:${recordId}`)
  }

  // Get connection status
  getConnectionStatus(): 'CONNECTING' | 'OPEN' | 'CLOSED' {
    // Check if any subscriptions are active
    for (const subscription of this.subscriptions.values()) {
      if (subscription.channel.state === 'joined') {
        return 'OPEN'
      }
    }
    return 'CLOSED'
  }

  // Cleanup all subscriptions
  destroy() {
    this.subscriptions.forEach(subscription => {
      subscription.channel.unsubscribe()
    })
    this.subscriptions.clear()
    this.conflictBuffer.clear()
  }
}

// Global instance
export const realtimeManager = new RealtimeManager()

// React hook for real-time subscriptions
export function useRealtime<T>(
  table: string,
  options: RealtimeOptions & {
    onInsert?: (record: T) => void
    onUpdate?: (record: T, oldRecord: T) => void
    onDelete?: (oldRecord: T) => void
    enabled?: boolean
  } = {}
) {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [connectionStatus, setConnectionStatus] = useState<'CONNECTING' | 'OPEN' | 'CLOSED'>('CONNECTING')
  const unsubscribeRef = useRef<(() => void) | null>(null)

  const handleRealtimeChange = useCallback((payload: RealtimePostgresChangesPayload<T>) => {
    console.log(`[REALTIME] ${table} change:`, payload.eventType)

    // Update connection status
    setConnectionStatus('OPEN')

    // Invalidate relevant queries to trigger refetch
    queryClient.invalidateQueries({ 
      queryKey: [table],
      exact: false
    })

    // Call specific handlers
    switch (payload.eventType) {
      case 'INSERT':
        if (payload.new) {
          options.onInsert?.(payload.new as T)
          toast({
            title: "New Record",
            description: `A new ${table.slice(0, -1)} was added`
          })
        }
        break

      case 'UPDATE':
        if (payload.new && payload.old) {
          options.onUpdate?.(payload.new as T, payload.old as T)
          toast({
            title: "Record Updated",
            description: `A ${table.slice(0, -1)} was updated`
          })
        }
        break

      case 'DELETE':
        if (payload.old) {
          options.onDelete?.(payload.old as T)
          toast({
            title: "Record Deleted",
            description: `A ${table.slice(0, -1)} was deleted`,
            variant: "destructive"
          })
        }
        break
    }
  }, [table, queryClient, toast, options])

  useEffect(() => {
    if (options.enabled === false) return

    // Subscribe to real-time changes
    unsubscribeRef.current = realtimeManager.subscribe(table, handleRealtimeChange, options)

    // Check connection status periodically
    const statusInterval = setInterval(() => {
      setConnectionStatus(realtimeManager.getConnectionStatus())
    }, 5000)

    return () => {
      unsubscribeRef.current?.()
      clearInterval(statusInterval)
    }
  }, [table, handleRealtimeChange, options])

  return {
    connectionStatus,
    isConnected: connectionStatus === 'OPEN'
  }
}

// Hook for optimistic updates with real-time sync
export function useOptimisticRealtime<T>(table: string) {
  const queryClient = useQueryClient()

  const applyOptimisticUpdate = useCallback((
    recordId: string,
    updateFn: (old: T) => T,
    queryKey: readonly unknown[]
  ) => {
    // Apply optimistic update
    queryClient.setQueryData(queryKey, (oldData: T[] | undefined) => {
      if (!oldData) return oldData
      return oldData.map(item => {
        const id = (item as any).id || (item as any).pattern_id
        return id === recordId ? updateFn(item) : item
      })
    })

    // Store for conflict detection
    const updatedItem = queryClient.getQueryData(queryKey) as T[] | undefined
    const item = updatedItem?.find(i => {
      const id = (i as any).id || (i as any).pattern_id
      return id === recordId
    })
    
    if (item) {
      realtimeManager.storeOptimisticUpdate(table, recordId, item)
    }
  }, [table, queryClient])

  const clearOptimisticUpdate = useCallback((recordId: string) => {
    realtimeManager.clearOptimisticUpdate(table, recordId)
  }, [table])

  return {
    applyOptimisticUpdate,
    clearOptimisticUpdate
  }
}

// Connection status indicator component
export function RealtimeStatus() {
  const [status, setStatus] = useState<'CONNECTING' | 'OPEN' | 'CLOSED'>('CONNECTING')

  useEffect(() => {
    const interval = setInterval(() => {
      setStatus(realtimeManager.getConnectionStatus())
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  const statusConfig = {
    CONNECTING: { color: 'bg-yellow-400', text: 'Connecting...' },
    OPEN: { color: 'bg-green-400', text: 'Connected' },
    CLOSED: { color: 'bg-red-400', text: 'Disconnected' }
  }

  const config = statusConfig[status]

  return (
    <div className="flex items-center gap-2 text-sm">
      <div className={`w-2 h-2 rounded-full ${config.color}`} />
      <span className="text-muted-foreground">{config.text}</span>
    </div>
  )
}