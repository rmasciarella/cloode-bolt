"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { useToast } from '@/hooks/use-toast'
import { 
  solverService, 
  departmentService, 
  machineService, 
  workCellService,
  type ValidationResult,
  type PatternInfo,
  type SolverJobRequest
} from '@/lib/services'
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle, 
  Activity, 
  Database,
  Cpu,
  Network,
  Loader2,
  Play,
  RefreshCw
} from 'lucide-react'

interface SystemStatus {
  healthy: boolean
  error?: string
  lastChecked: Date
}

interface ComponentHealth {
  database: SystemStatus
  solver: SystemStatus
  constraints: ValidationResult & { lastChecked: Date }
  patterns: { count: number; lastChecked: Date; error?: string }
}

export default function SystemIntegrationDashboard() {
  const [health, setHealth] = useState<ComponentHealth>({
    database: { healthy: false, lastChecked: new Date() },
    solver: { healthy: false, lastChecked: new Date() },
    constraints: { phase1: false, phase2: false, phase3: false, errors: [], lastChecked: new Date() },
    patterns: { count: 0, lastChecked: new Date() }
  })
  const [loading, setLoading] = useState(false)
  const [testRunning, setTestRunning] = useState(false)
  const [testResults, setTestResults] = useState<any>(null)
  const { toast } = useToast()

  // Check system health on mount
  useEffect(() => {
    checkSystemHealth()
  }, [])

  const checkSystemHealth = async () => {
    setLoading(true)
    const now = new Date()
    
    try {
      // Check database connectivity through service layer
      const dbCheck = await departmentService.getAll()
      
      // Check solver service
      const solverCheck = await solverService.healthCheck()
      
      // Check constraint system
      const constraintCheck = await solverService.validateConstraintSystem()
      
      // Check available patterns
      const patternsCheck = await solverService.getAvailablePatterns()
      
      setHealth({
        database: {
          healthy: dbCheck.success,
          error: dbCheck.error,
          lastChecked: now
        },
        solver: {
          healthy: solverCheck.success && solverCheck.data?.healthy || false,
          error: solverCheck.error,
          lastChecked: now
        },
        constraints: {
          ...constraintCheck.data || { phase1: false, phase2: false, phase3: false, errors: ['Validation failed'] },
          lastChecked: now
        },
        patterns: {
          count: patternsCheck.data?.length || 0,
          error: patternsCheck.error,
          lastChecked: now
        }
      })
    } catch (error) {
      toast({
        title: "Health Check Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const runIntegrationTest = async () => {
    setTestRunning(true)
    const startTime = Date.now()
    
    try {
      // Get sample data from all services
      const departments = await departmentService.getAll()
      const machines = await machineService.getAll()
      const workCells = await workCellService.getAll()
      const patterns = await solverService.getAvailablePatterns()
      
      if (!departments.success || !machines.success || !workCells.success || !patterns.success) {
        throw new Error('Failed to fetch sample data for integration test')
      }
      
      if (!patterns.data || patterns.data.length === 0) {
        throw new Error('No patterns available for testing')
      }
      
      // Create test job request
      const testRequest: SolverJobRequest = solverService.transformFormDataToSolverRequest(
        departments.data || [],
        machines.data || [],
        workCells.data || [],
        [
          {
            id: 'test-job-1',
            pattern_id: patterns.data[0].pattern_id,
            description: 'Integration test job',
            due_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            priority: 100
          }
        ]
      )
      
      // Submit to solver
      const solverResult = await solverService.solveProblem(testRequest)
      
      const duration = Date.now() - startTime
      
      setTestResults({
        success: solverResult.success,
        duration,
        data_sources: {
          departments: departments.data?.length || 0,
          machines: machines.data?.length || 0,
          work_cells: workCells.data?.length || 0,
          patterns: patterns.data?.length || 0
        },
        solver_response: solverResult.data || solverResult.error,
        performance: {
          total_time_ms: duration,
          solver_time_ms: solverResult.data?.performance_metrics?.solve_time_seconds ? 
            solverResult.data.performance_metrics.solve_time_seconds * 1000 : null
        }
      })
      
      toast({
        title: "Integration Test Complete",
        description: `Test ${solverResult.success ? 'passed' : 'failed'} in ${duration}ms`,
        variant: solverResult.success ? "default" : "destructive"
      })
      
    } catch (error) {
      const duration = Date.now() - startTime
      setTestResults({
        success: false,
        duration,
        error: error instanceof Error ? error.message : 'Unknown error',
        performance: { total_time_ms: duration }
      })
      
      toast({
        title: "Integration Test Failed", 
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive"
      })
    } finally {
      setTestRunning(false)
    }
  }

  const StatusIcon = ({ healthy, loading: itemLoading }: { healthy: boolean; loading?: boolean }) => {
    if (itemLoading) return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
    return healthy ? 
      <CheckCircle className="h-4 w-4 text-green-500" /> : 
      <XCircle className="h-4 w-4 text-red-500" />
  }

  const getOverallHealth = () => {
    const components = [
      health.database.healthy,
      health.solver.healthy,
      health.constraints.phase1 && health.constraints.phase2 && health.constraints.phase3,
      health.patterns.count > 0
    ]
    const healthyCount = components.filter(Boolean).length
    return (healthyCount / components.length) * 100
  }

  return (
    <div className="space-y-6">
      {/* System Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            System Integration Status
          </CardTitle>
          <CardDescription>
            Overall health and integration status of the OR-Tools constraint programming solver system
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Overall System Health</span>
            <span className="text-sm text-muted-foreground">{Math.round(getOverallHealth())}%</span>
          </div>
          <Progress value={getOverallHealth()} className="w-full" />
          
          <div className="flex gap-2">
            <Button 
              onClick={checkSystemHealth} 
              disabled={loading}
              variant="outline"
              size="sm"
            >
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              Refresh Status
            </Button>
            <Button 
              onClick={runIntegrationTest}
              disabled={testRunning}
              size="sm"
            >
              {testRunning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
              Run Integration Test
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Component Status Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Database Status */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Database className="h-4 w-4" />
              Database Connection
              <StatusIcon healthy={health.database.healthy} loading={loading} />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Badge variant={health.database.healthy ? "default" : "destructive"}>
                {health.database.healthy ? "Connected" : "Error"}
              </Badge>
              {health.database.error && (
                <p className="text-xs text-red-600">{health.database.error}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Last checked: {health.database.lastChecked.toLocaleTimeString()}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Solver Status */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Cpu className="h-4 w-4" />
              Solver Service
              <StatusIcon healthy={health.solver.healthy} loading={loading} />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Badge variant={health.solver.healthy ? "default" : "destructive"}>
                {health.solver.healthy ? "Online" : "Offline"}
              </Badge>
              {health.solver.error && (
                <p className="text-xs text-red-600">{health.solver.error}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Last checked: {health.solver.lastChecked.toLocaleTimeString()}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Constraint System Status */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Network className="h-4 w-4" />
              3-Phase Constraint System
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex gap-1">
                <Badge variant={health.constraints.phase1 ? "default" : "secondary"} className="text-xs">
                  Phase 1
                </Badge>
                <Badge variant={health.constraints.phase2 ? "default" : "secondary"} className="text-xs">
                  Phase 2
                </Badge>
                <Badge variant={health.constraints.phase3 ? "default" : "secondary"} className="text-xs">
                  Phase 3
                </Badge>
              </div>
              {health.constraints.errors.length > 0 && (
                <div className="space-y-1">
                  {health.constraints.errors.map((error, index) => (
                    <p key={index} className="text-xs text-red-600">{error}</p>
                  ))}
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Last validated: {health.constraints.lastChecked.toLocaleTimeString()}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Pattern Status */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Job Patterns
              <StatusIcon healthy={health.patterns.count > 0} loading={loading} />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Badge variant={health.patterns.count > 0 ? "default" : "secondary"}>
                {health.patterns.count} Available
              </Badge>
              {health.patterns.error && (
                <p className="text-xs text-red-600">{health.patterns.error}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Last checked: {health.patterns.lastChecked.toLocaleTimeString()}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Test Results */}
      {testResults && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Integration Test Results
              <StatusIcon healthy={testResults.success} />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm">Test Status:</span>
                <Badge variant={testResults.success ? "default" : "destructive"}>
                  {testResults.success ? "PASSED" : "FAILED"}
                </Badge>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm">Total Duration:</span>
                <span className="text-sm font-mono">{testResults.performance.total_time_ms}ms</span>
              </div>
              
              {testResults.data_sources && (
                <div className="space-y-1">
                  <p className="text-sm font-medium">Data Sources:</p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <span>Departments: {testResults.data_sources.departments}</span>
                    <span>Machines: {testResults.data_sources.machines}</span>
                    <span>Work Cells: {testResults.data_sources.work_cells}</span>
                    <span>Patterns: {testResults.data_sources.patterns}</span>
                  </div>
                </div>
              )}
              
              {testResults.error && (
                <div className="bg-red-50 p-2 rounded">
                  <p className="text-xs text-red-600">{testResults.error}</p>
                </div>
              )}
              
              {testResults.solver_response && !testResults.error && (
                <div className="bg-green-50 p-2 rounded">
                  <p className="text-xs text-green-600">
                    Solver response: {typeof testResults.solver_response === 'string' ? 
                      testResults.solver_response : 
                      JSON.stringify(testResults.solver_response, null, 2)}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}