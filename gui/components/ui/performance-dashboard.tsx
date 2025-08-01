"use client"

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { UsePerformanceMonitorReturn } from '@/hooks/use-performance-monitor'

interface PerformanceDashboardProps {
  monitor: UsePerformanceMonitorReturn
}

export function PerformanceDashboard({ monitor }: PerformanceDashboardProps) {
  const metrics = monitor.getMetrics()
  const formMetrics = monitor.getFormMetrics()

  // Calculate average submission time
  const avgSubmissionTime = formMetrics.submissionTimes.length > 0
    ? formMetrics.submissionTimes.reduce((a, b) => a + b, 0) / formMetrics.submissionTimes.length
    : 0

  // Calculate average validation times
  const validationEntries = Object.entries(formMetrics.validationTimes)
  const avgValidationTime = validationEntries.length > 0
    ? validationEntries.reduce((acc, [_, times]) => {
        const fieldAvg = times.reduce((a, b) => a + b, 0) / times.length
        return acc + fieldAvg
      }, 0) / validationEntries.length
    : 0

  // Get error rate
  const errorRate = formMetrics.interactionCount > 0 
    ? (formMetrics.errorCount / formMetrics.interactionCount) * 100 
    : 0

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Load Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formMetrics.loadTime.toFixed(0)}ms</div>
            <Badge className={formMetrics.loadTime > 1000 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}>
              {formMetrics.loadTime > 1000 ? 'Slow' : 'Good'}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg Submission</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgSubmissionTime.toFixed(0)}ms</div>
            <Badge className={avgSubmissionTime > 2000 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}>
              {avgSubmissionTime > 2000 ? 'Slow' : 'Good'}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{errorRate.toFixed(1)}%</div>
            <Badge className={errorRate > 5 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}>
              {errorRate > 5 ? 'High' : 'Low'}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Interactions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formMetrics.interactionCount}</div>
            <div className="text-xs text-gray-500">{formMetrics.totalOperations} operations</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Field Focus Count</CardTitle>
            <CardDescription>Number of times each field was focused</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(formMetrics.fieldFocusCount)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 5)
                .map(([field, count]) => (
                  <div key={field} className="flex items-center justify-between">
                    <span className="text-sm font-medium">{field}</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-20 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full" 
                          style={{ 
                            width: `${Math.min(100, (count / Math.max(...Object.values(formMetrics.fieldFocusCount))) * 100)}%` 
                          }}
                        />
                      </div>
                      <span className="text-sm text-gray-500">{count}</span>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Metrics</CardTitle>
            <CardDescription>Latest performance metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {metrics.slice(-5).map((metric, idx) => (
                <div key={idx} className="flex items-center justify-between text-sm">
                  <span className="font-medium">{metric.operation}</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-gray-500">{metric.duration_ms}ms</span>
                    <Badge className={metric.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                      {metric.success ? 'OK' : 'ERR'}
                    </Badge>
                  </div>
                </div>
              )) || <div className="text-sm text-gray-500">No recent metrics</div>}
            </div>
          </CardContent>
        </Card>
      </div>

      {process.env.NODE_ENV === 'development' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Debug Information</CardTitle>
            <CardDescription>Development mode only</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-xs font-mono bg-gray-100 p-2 rounded">
              <div>Total Metrics: {metrics.length}</div>
              <div>Avg Validation Time: {avgValidationTime.toFixed(2)}ms</div>
              <div>Most Active Field: {
                Object.keys(formMetrics.fieldFocusCount).reduce((a, b) => 
                  formMetrics.fieldFocusCount[a] > formMetrics.fieldFocusCount[b] ? a : b, 
                  'none'
                )
              }</div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}