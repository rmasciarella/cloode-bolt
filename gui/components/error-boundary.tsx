/**
 * Error Boundary Component
 * Catches JavaScript errors in form components and provides fallback UI
 */

"use client"

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertTriangle, RefreshCw, Bug } from 'lucide-react'
import { toast } from '@/hooks/use-toast'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  showErrorDetails?: boolean
  context?: string
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
  errorId: string | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null
    }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
      errorId: `error-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo })

    // Log error details
    console.error('ErrorBoundary caught an error:', error, errorInfo)

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo)

    // Show toast notification
    toast({
      title: "Application Error",
      description: `An error occurred${this.props.context ? ` in ${this.props.context}` : ''}. Please try refreshing the page.`,
      variant: "destructive"
    })

    // In production, you might want to send this to an error reporting service
    if (process.env.NODE_ENV === 'production') {
      this.reportError(error, errorInfo)
    }
  }

  private reportError(error: Error, errorInfo: ErrorInfo) {
    // Example: Send to error reporting service
    const errorReport = {
      message: error.message,
      stack: error.stack,
      context: this.props.context,
      errorId: this.state.errorId,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    }

    // This could be sent to Sentry, LogRocket, or your custom error service
    console.log('Error report:', errorReport)
    
    // Example with gtag (Google Analytics)
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'exception', {
        description: error.message,
        fatal: false,
        custom_map: { 
          errorId: this.state.errorId,
          context: this.props.context 
        }
      })
    }
  }

  private handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null
    })
  }

  private handleReload = () => {
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      // Custom fallback UI if provided
      if (this.props.fallback) {
        return this.props.fallback
      }

      const { error, errorInfo, errorId } = this.state
      const showDetails = this.props.showErrorDetails || process.env.NODE_ENV === 'development'

      return (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="h-5 w-5" />
              Something went wrong
            </CardTitle>
            <CardDescription className="text-red-600">
              {this.props.context ? `An error occurred in ${this.props.context}.` : 'An unexpected error occurred.'}
              {errorId && (
                <span className="block mt-1 font-mono text-xs">
                  Error ID: {errorId}
                </span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Button 
                onClick={this.handleRetry} 
                variant="outline" 
                size="sm"
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Try Again
              </Button>
              <Button 
                onClick={this.handleReload} 
                variant="outline" 
                size="sm"
              >
                Reload Page
              </Button>
            </div>

            {showDetails && error && (
              <details className="mt-4">
                <summary className="cursor-pointer flex items-center gap-2 text-sm font-medium text-red-700">
                  <Bug className="h-4 w-4" />
                  Error Details
                </summary>
                <div className="mt-2 p-3 bg-red-100 rounded-md">
                  <div className="text-sm">
                    <strong>Error:</strong> {error.message}
                  </div>
                  {error.stack && (
                    <pre className="mt-2 text-xs overflow-auto max-h-32 bg-white p-2 rounded border">
                      {error.stack}
                    </pre>
                  )}
                  {errorInfo?.componentStack && (
                    <div className="mt-2">
                      <strong className="text-sm">Component Stack:</strong>
                      <pre className="mt-1 text-xs overflow-auto max-h-32 bg-white p-2 rounded border">
                        {errorInfo.componentStack}
                      </pre>
                    </div>
                  )}
                </div>
              </details>
            )}
          </CardContent>
        </Card>
      )
    }

    return this.props.children
  }
}

// Higher-order component for wrapping forms with error boundaries
export function withErrorBoundary<T extends object>(
  Component: React.ComponentType<T>,
  context?: string,
  showErrorDetails?: boolean
) {
  const WrappedComponent = (props: T) => (
    <ErrorBoundary 
      context={context} 
      showErrorDetails={showErrorDetails}
    >
      <Component {...props} />
    </ErrorBoundary>
  )

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`
  
  return WrappedComponent
}

// Form-specific error boundary with enhanced error handling
export function FormErrorBoundary({ 
  children, 
  formName,
  onFormError
}: {
  children: ReactNode
  formName: string
  onFormError?: (error: Error, errorInfo: ErrorInfo) => void
}) {
  const handleError = (error: Error, errorInfo: ErrorInfo) => {
    // Log form-specific error details
    console.error(`Form error in ${formName}:`, {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      formName
    })

    // Call custom handler
    onFormError?.(error, errorInfo)
  }

  return (
    <ErrorBoundary
      context={`${formName} form`}
      onError={handleError}
      showErrorDetails={process.env.NODE_ENV === 'development'}
    >
      {children}
    </ErrorBoundary>
  )
}

// Hook for manually reporting errors
export function useErrorReporting() {
  const reportError = (error: Error, context?: string) => {
    console.error('Manual error report:', error, context)
    
    toast({
      title: "Error",
      description: error.message,
      variant: "destructive"
    })

    // Report to analytics if available
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'exception', {
        description: error.message,
        fatal: false,
        custom_map: { context: context || 'manual' }
      })
    }
  }

  return { reportError }
}

// Async error boundary for catching promise rejections
export function useAsyncErrorHandler() {
  const { reportError } = useErrorReporting()

  const handleAsyncError = (error: Error, context?: string) => {
    reportError(error, context)
  }

  // Wrap async functions to catch and report errors
  const wrapAsync = <T extends any[], R>(
    fn: (...args: T) => Promise<R>,
    context?: string
  ) => {
    return async (...args: T): Promise<R | undefined> => {
      try {
        return await fn(...args)
      } catch (error) {
        handleAsyncError(error as Error, context)
        return undefined
      }
    }
  }

  return { handleAsyncError, wrapAsync }
}