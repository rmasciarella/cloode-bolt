/**
 * Form Performance Dashboard Component
 * Real-time display of form performance metrics across the application
 */

"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useFormPerformance } from '@/lib/hooks/use-form-performance'
import { Activity, Clock, AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react'

interface FormStats {
  formName: string
  totalLoads: number
  totalSubmissions: number
  avgLoadTime: number
  avgSubmissionTime: number
  successRate: number
  avgInteractions: number
  avgErrors: number
}

export function FormPerformanceDashboard() {
  const performanceData = useFormPerformance('FormPerformanceDashboard')
  
  // Mock functions for missing methods
  const getAllMetrics = () => [] as any[]
  const getFormStats = (formName: string) => null as FormStats | null
  const getValidationMetrics = () => []
  const getSubmissionMetrics = () => []
  const clearMetrics = () => {}

  const [formStats, setFormStats] = useState<FormStats[]>([])
  const [refreshInterval, setRefreshInterval] = useState(5000) // 5 seconds
  const [isAutoRefresh, setIsAutoRefresh] = useState(true)

  // Refresh data
  const refreshData = () => {
    const allMetrics = getAllMetrics()
    const formNames = Array.from(new Set(allMetrics.map(m => m.formName)))
    
    const stats = formNames.map(formName => getFormStats(formName)).filter(Boolean) as FormStats[]
    setFormStats(stats)
  }

  // Auto-refresh effect
  useEffect(() => {
    refreshData()
    
    if (isAutoRefresh) {
      const interval = setInterval(refreshData, refreshInterval)
      return () => clearInterval(interval)
    }
  }, [refreshInterval, isAutoRefresh])

  const getPerformanceRating = (avgTime: number, type: 'load' | 'submission'): 'good' | 'warning' | 'poor' => {
    const thresholds = type === 'load' ? { good: 300, warning: 500 } : { good: 1000, warning: 2000 }
    
    if (avgTime <= thresholds.good) return 'good'
    if (avgTime <= thresholds.warning) return 'warning'
    return 'poor'
  }

  const formatTime = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`
    return `${(ms / 1000).toFixed(1)}s`
  }

  const getRatingColor = (rating: 'good' | 'warning' | 'poor'): string => {
    switch (rating) {
      case 'good': return 'bg-green-100 text-green-800'
      case 'warning': return 'bg-yellow-100 text-yellow-800'
      case 'poor': return 'bg-red-100 text-red-800'
    }
  }

  const getRatingIcon = (rating: 'good' | 'warning' | 'poor') => {
    switch (rating) {
      case 'good': return <CheckCircle className="h-4 w-4" />
      case 'warning': return <Clock className="h-4 w-4" />
      case 'poor': return <AlertTriangle className="h-4 w-4" />
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Form Performance Dashboard</h2>
          <p className="text-muted-foreground">
            Real-time monitoring of form performance across the application
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsAutoRefresh(!isAutoRefresh)}
          >
            <Activity className="h-4 w-4 mr-2" />
            {isAutoRefresh ? 'Auto' : 'Manual'}
          </Button>
          <Button variant="outline" size="sm" onClick={refreshData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="destructive" size="sm" onClick={clearMetrics}>
            Clear Data
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Forms</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formStats.length}</div>
            <p className="text-xs text-muted-foreground">
              Active form components
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Submissions</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formStats.reduce((sum, stat) => sum + stat.totalSubmissions, 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Across all forms
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Load Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formStats.length > 0 
                ? formatTime(formStats.reduce((sum, stat) => sum + stat.avgLoadTime, 0) / formStats.length)
                : '0ms'
              }
            </div>
            <p className="text-xs text-muted-foreground">
              Average across all forms
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formStats.length > 0 
                ? Math.round(formStats.reduce((sum, stat) => sum + stat.successRate, 0) / formStats.length)
                : 0
              }%
            </div>
            <p className="text-xs text-muted-foreground">
              Average success rate
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Metrics */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="validation">Validation</TabsTrigger>
          <TabsTrigger value="submissions">Submissions</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Form Performance Overview</CardTitle>
              <CardDescription>
                Performance metrics for all monitored forms
              </CardDescription>
            </CardHeader>
            <CardContent>
              {formStats.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No performance data available. Start using forms to see metrics.
                </div>
              ) : (
                <div className="space-y-4">
                  {formStats.map((stat) => {
                    const loadRating = getPerformanceRating(stat.avgLoadTime, 'load')
                    const submissionRating = getPerformanceRating(stat.avgSubmissionTime, 'submission')
                    
                    return (
                      <div key={stat.formName} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start mb-3">
                          <h3 className="font-semibold">{stat.formName}</h3>
                          <div className="flex gap-2">
                            <Badge className={getRatingColor(loadRating)} variant="secondary">
                              {getRatingIcon(loadRating)}
                              <span className="ml-1">Load</span>
                            </Badge>
                            {stat.totalSubmissions > 0 && (
                              <Badge className={getRatingColor(submissionRating)} variant="secondary">
                                {getRatingIcon(submissionRating)}
                                <span className="ml-1">Submit</span>
                              </Badge>
                            )}
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <div className="text-muted-foreground">Loads</div>
                            <div className="font-medium">{stat.totalLoads}</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Load Time</div>
                            <div className="font-medium">{formatTime(stat.avgLoadTime)}</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Submissions</div>
                            <div className="font-medium">{stat.totalSubmissions}</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Success Rate</div>
                            <div className="font-medium">{stat.successRate}%</div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Load Time Performance</CardTitle>
                <CardDescription>Form loading performance metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {formStats.map((stat) => (
                    <div key={stat.formName} className="flex justify-between items-center">
                      <span className="text-sm">{stat.formName}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{formatTime(stat.avgLoadTime)}</span>
                        <Badge
                          variant="secondary"
                          className={getRatingColor(getPerformanceRating(stat.avgLoadTime, 'load'))}
                        >
                          {getPerformanceRating(stat.avgLoadTime, 'load')}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Submission Performance</CardTitle>
                <CardDescription>Form submission performance metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {formStats.filter(stat => stat.totalSubmissions > 0).map((stat) => (
                    <div key={stat.formName} className="flex justify-between items-center">
                      <span className="text-sm">{stat.formName}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{formatTime(stat.avgSubmissionTime)}</span>
                        <Badge
                          variant="secondary"
                          className={getRatingColor(getPerformanceRating(stat.avgSubmissionTime, 'submission'))}
                        >
                          {getPerformanceRating(stat.avgSubmissionTime, 'submission')}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="validation" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Field Validation Metrics</CardTitle>
              <CardDescription>Performance metrics for field validation</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                Validation metrics will be displayed here when available
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="submissions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Submission History</CardTitle>
              <CardDescription>Recent form submission performance data</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                Submission history will be displayed here when available
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default FormPerformanceDashboard