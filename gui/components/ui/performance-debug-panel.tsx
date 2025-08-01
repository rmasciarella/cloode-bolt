/**
 * Shared Performance Debug Panel Component
 * Provides consistent debug information across all forms
 */

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface PerformanceMetrics {
  loadTime?: number | null
  submissionTime?: number | null
  firstInteraction?: number | null
  errorCount: number
  interactionCount: number
  fieldFocusCount?: { [key: string]: number }
  validationErrorCount?: { [key: string]: number }
  isSlowLoading?: boolean
  isSlowSubmission?: boolean
  hasHighErrorRate?: boolean
}

interface PerformanceDebugPanelProps {
  formName: string
  metrics: PerformanceMetrics
  className?: string
  thresholds?: {
    slowLoad?: number
    slowSubmission?: number
    highErrorRate?: number
  }
}

const DEFAULT_THRESHOLDS = {
  slowLoad: 1000,
  slowSubmission: 2000,
  highErrorRate: 5
}

export function PerformanceDebugPanel({ 
  formName, 
  metrics, 
  className = "mt-6",
  thresholds = DEFAULT_THRESHOLDS
}: PerformanceDebugPanelProps) {
  // Only render in development
  if (process.env.NODE_ENV !== 'development') {
    return null
  }

  const getColorClass = (value: number | null | undefined, threshold: number, invert: boolean = false) => {
    if (value === null || value === undefined) return 'text-gray-500'
    const isAboveThreshold = value > threshold
    return invert 
      ? (isAboveThreshold ? 'text-red-600' : 'text-green-600')
      : (isAboveThreshold ? 'text-green-600' : 'text-red-600')
  }

  return (
    <Card className={`border-dashed border-gray-300 ${className}`}>
      <CardHeader>
        <CardTitle className="text-sm text-gray-600">
          Performance Metrics - {formName} (Development)
        </CardTitle>
        <CardDescription className="text-xs">
          Real-time form performance monitoring and diagnostics
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Main Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="font-semibold">Form Load:</span>
            <div className={getColorClass(metrics.loadTime, thresholds.slowLoad!, true)}>
              {metrics.loadTime ? `${metrics.loadTime}ms` : 'N/A'}
            </div>
            {metrics.isSlowLoading && (
              <div className="text-orange-500 text-[10px]">⚠ Slow</div>
            )}
          </div>
          
          <div>
            <span className="font-semibold">Submission:</span>
            <div className={getColorClass(metrics.submissionTime, thresholds.slowSubmission!, true)}>
              {metrics.submissionTime ? `${metrics.submissionTime}ms` : 'N/A'}
            </div>
            {metrics.isSlowSubmission && (
              <div className="text-orange-500 text-[10px]">⚠ Slow</div>
            )}
          </div>
          
          <div>
            <span className="font-semibold">Errors:</span>
            <div className={getColorClass(metrics.errorCount, thresholds.highErrorRate!, true)}>
              {metrics.errorCount}
            </div>
            {metrics.hasHighErrorRate && (
              <div className="text-red-500 text-[10px]">⚠ High</div>
            )}
          </div>
          
          <div>
            <span className="font-semibold">Interactions:</span>
            <div className="text-blue-600">
              {metrics.interactionCount}
            </div>
          </div>
        </div>

        {/* Secondary Metrics */}
        {metrics.firstInteraction && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <div className="text-xs text-gray-600">
              <span className="font-semibold">First Interaction:</span> {metrics.firstInteraction}ms
            </div>
          </div>
        )}

        {/* Field Details (Expandable) */}
        {(metrics.fieldFocusCount || metrics.validationErrorCount) && (
          <details className="mt-3">
            <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
              Field Details & Diagnostics
            </summary>
            <div className="mt-2 space-y-1">
              {/* Field Focus Counts */}
              {metrics.fieldFocusCount && Object.keys(metrics.fieldFocusCount).length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-gray-600 mb-1">Field Focus Count:</div>
                  {Object.entries(metrics.fieldFocusCount).map(([field, count]) => (
                    <div key={field} className="text-xs flex justify-between pl-2">
                      <span>{field}:</span>
                      <span className={count > 5 ? 'text-orange-500' : 'text-gray-600'}>
                        {count} {count > 5 && '⚠'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Validation Error Counts */}
              {metrics.validationErrorCount && Object.keys(metrics.validationErrorCount).length > 0 && (
                <div className="mt-2">
                  <div className="text-xs font-semibold text-gray-600 mb-1">Validation Errors:</div>
                  {Object.entries(metrics.validationErrorCount).map(([field, count]) => (
                    <div key={field} className="text-xs flex justify-between pl-2">
                      <span>{field}:</span>
                      <span className="text-red-600">{count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </details>
        )}

        {/* Performance Recommendations */}
        <PerformanceRecommendations 
          metrics={metrics} 
          thresholds={{
            slowLoad: thresholds?.slowLoad ?? 1000,
            slowSubmission: thresholds?.slowSubmission ?? 2000,
            highErrorRate: thresholds?.highErrorRate ?? 0.1
          }} 
        />
      </CardContent>
    </Card>
  )
}

function PerformanceRecommendations({ 
  metrics, 
  thresholds 
}: { 
  metrics: PerformanceMetrics
  thresholds: typeof DEFAULT_THRESHOLDS 
}) {
  const recommendations = []

  if (metrics.loadTime && metrics.loadTime > thresholds.slowLoad!) {
    recommendations.push('Consider optimizing data fetching or using skeleton loading states')
  }
  
  if (metrics.submissionTime && metrics.submissionTime > thresholds.slowSubmission!) {
    recommendations.push('Consider adding loading indicators and optimizing submission payload')
  }
  
  if (metrics.errorCount > thresholds.highErrorRate!) {
    recommendations.push('Review field validation and add better user guidance')
  }

  const highFocusFields = metrics.fieldFocusCount 
    ? Object.entries(metrics.fieldFocusCount).filter(([, count]) => count > 5)
    : []
  
  if (highFocusFields.length > 0) {
    recommendations.push(`Fields with high focus count may need better UX: ${highFocusFields.map(([field]) => field).join(', ')}`)
  }

  if (recommendations.length === 0) {
    return null
  }

  return (
    <details className="mt-3">
      <summary className="text-xs text-blue-600 cursor-pointer hover:text-blue-700">
        Performance Recommendations ({recommendations.length})
      </summary>
      <div className="mt-2 space-y-1">
        {recommendations.map((rec, index) => (
          <div key={index} className="text-xs text-blue-700 bg-blue-50 p-2 rounded">
            💡 {rec}
          </div>
        ))}
      </div>
    </details>
  )
}

export default PerformanceDebugPanel