/**
 * App Providers
 * Comprehensive provider setup integrating all performance, caching, and real-time systems
 */

"use client"

import React, { useEffect } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { queryClientConfig } from '@/lib/cache/manager'
import { ensurePerformanceSystemInitialized } from '@/lib/performance/init'
import { Toaster } from '@/components/ui/toaster'
import { ErrorBoundary } from '@/components/error-boundary'
import { RealtimeStatus } from '@/lib/realtime/manager'
import { AuthProvider } from '@/components/auth/AuthProvider'

// Create query client with our configuration
const queryClient = new QueryClient(queryClientConfig)

interface AppProvidersProps {
  children: React.ReactNode
}

function PerformanceInitializer() {
  useEffect(() => {
    // Initialize performance monitoring and caching systems
    const cleanup = ensurePerformanceSystemInitialized()
    
    // Log initialization in development
    if (process.env.NODE_ENV === 'development') {
      console.log('[APP] Performance systems initialized')
    }

    return cleanup
  }, [])

  return null
}

function DevTools() {
  if (process.env.NODE_ENV !== 'development') return null

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      <RealtimeStatus />
      <ReactQueryDevtools 
        initialIsOpen={false}
      />
    </div>
  )
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <ErrorBoundary context="Application Root" showErrorDetails={process.env.NODE_ENV === 'development'}>
      <AuthProvider>
        <QueryClientProvider client={queryClient}>
          <PerformanceInitializer />
          
          {/* Main application content */}
          {children}
          
          {/* Global UI components */}
          <Toaster />
          
          {/* Development tools */}
          <DevTools />
        </QueryClientProvider>
      </AuthProvider>
    </ErrorBoundary>
  )
}

// Hook to access query client
export function useQueryClient() {
  const client = React.useContext(React.createContext(queryClient))
  if (!client) {
    throw new Error('useQueryClient must be used within a QueryClientProvider')
  }
  return client
}