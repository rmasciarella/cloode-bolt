// Example: Complete plugin architecture using all hook systems
// This demonstrates how plugins can extend the GUI without modifying core code

import React from 'react'
import { navigationRegistry } from '@/lib/hooks/navigation.hooks'
import { serviceRegistry } from '@/lib/hooks/service.hooks'
import { uiRegistry } from '@/lib/hooks/ui.hooks'
import { useFormHooks } from '@/lib/hooks/form.hooks'
import { Settings, BarChart3, FileText, Bell, Shield } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'

// ===== REPORTING PLUGIN =====
// This plugin adds comprehensive reporting capabilities

export class ReportingPlugin {
  static initialize() {
    // Add navigation section for reports
    navigationRegistry.register('beforeNavigationRender', (sections) => {
      return [
        ...sections,
        {
          title: 'Analytics',
          icon: BarChart3,
          order: 100,
          items: [
            { key: 'reports', label: 'Reports', icon: FileText, order: 1 },
            { key: 'dashboards', label: 'Dashboards', icon: BarChart3, order: 2 },
            { key: 'exports', label: 'Data Exports', icon: FileText, order: 3 },
          ]
        }
      ]
    }, 5)

    // Register report components
    navigationRegistry.register('resolveFormComponent', (activeSection) => {
      switch (activeSection) {
        case 'reports':
          return ReportsComponent
        case 'dashboards':
          return DashboardsComponent
        case 'exports':
          return DataExportsComponent
        default:
          return null
      }
    }, 5)

    // Add data transformation for reporting
    serviceRegistry.register('transformOutput', (table, operation, data) => {
      if (Array.isArray(data)) {
        // Add computed fields for reporting
        return data.map(item => ({
          ...item,
          _reportingMetadata: {
            lastModified: new Date().toISOString(),
            source: table,
            operation
          }
        }))
      }
      return data
    }, 5)

    // Add caching for report data
    serviceRegistry.register('shouldCache', (table, operation) => {
      return ['getAll', 'getById'].includes(operation)
    }, 5)

    // Add audit logging for report access
    serviceRegistry.register('onAuditLog', (table, operation, data) => {
      if (operation === 'getAll') {
        console.log(`[REPORTING] Data accessed for table: ${table}`)
      }
    }, 5)
  }
}

// Report components
const ReportsComponent = () => {
  const { toast } = useToast()
  
  const generateReport = (type: string) => {
    toast({
      title: "Report Generated",
      description: `${type} report has been generated successfully`
    })
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Reports</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={() => generateReport('Department Utilization')}>
            Generate Department Utilization Report
          </Button>
          <Button onClick={() => generateReport('Production Schedule')}>
            Generate Production Schedule Report
          </Button>
          <Button onClick={() => generateReport('Resource Allocation')}>
            Generate Resource Allocation Report
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

const DashboardsComponent = () => (
  <Card>
    <CardHeader>
      <CardTitle>Dashboards</CardTitle>
    </CardHeader>
    <CardContent>
      <p>Interactive dashboards would be rendered here</p>
    </CardContent>
  </Card>
)

const DataExportsComponent = () => (
  <Card>
    <CardHeader>
      <CardTitle>Data Exports</CardTitle>
    </CardHeader>
    <CardContent>
      <p>Data export tools would be rendered here</p>
    </CardContent>
  </Card>
)

// ===== NOTIFICATION PLUGIN =====
// This plugin adds system-wide notifications and alerts

export class NotificationPlugin {
  static initialize() {
    // Add notification bell to UI components
    uiRegistry.register('renderAdditionalContent', (componentName, position, props) => {
      if (componentName === 'Header' && position === 'after') {
        return <NotificationBell />
      }
      return null
    }, { priority: 10 })

    // Add notification hooks to form submissions
    serviceRegistry.register('afterMutation', async (table, operation, result) => {
      if (result.success) {
        await NotificationService.notify({
          type: 'success',
          title: `${table} ${operation}d`,
          message: `Successfully ${operation}d ${table} record`,
          category: 'data_change'
        })
      }
      return result
    }, 15)

    // Add real-time notifications for critical operations
    serviceRegistry.register('beforeMutation', async (table, operation, data) => {
      if (table === 'departments' && operation === 'delete') {
        await NotificationService.notify({
          type: 'warning',
          title: 'Department Deletion',
          message: `Attempting to delete department: ${data.name}`,
          category: 'critical_operation',
          requiresAcknowledgment: true
        })
      }
      return data
    }, 5)
  }
}

const NotificationBell = () => {
  const [notifications, setNotifications] = React.useState(3)
  
  return (
    <div className="relative">
      <Button variant="ghost" size="sm">
        <Bell className="h-4 w-4" />
        {notifications > 0 && (
          <Badge variant="destructive" className="absolute -top-1 -right-1 px-1 min-w-[1.25rem] h-5">
            {notifications}
          </Badge>
        )}
      </Button>
    </div>
  )
}

class NotificationService {
  static async notify(notification: {
    type: 'info' | 'success' | 'warning' | 'error'
    title: string
    message: string
    category: string
    requiresAcknowledgment?: boolean
  }) {
    console.log('[NOTIFICATION]', notification)
    // In a real implementation, this would integrate with toast system or notification API
  }
}

// ===== SECURITY PLUGIN =====
// This plugin adds role-based access control and security features

export class SecurityPlugin {
  static initialize() {
    // Add permission checking to navigation
    navigationRegistry.register('beforeNavigationChange', async (from, to) => {
      return await SecurityService.checkPermission(to)
    }, 1) // High priority - runs first

    // Add permission checking to data access
    serviceRegistry.register('canRead', async (table, query, user) => {
      return await SecurityService.checkTableAccess(table, 'read', user)
    }, 1)

    serviceRegistry.register('canWrite', async (table, operation, data, user) => {
      return await SecurityService.checkTableAccess(table, 'write', user)
    }, 1)

    // Add security headers to UI components
    uiRegistry.register('enhanceA11y', (componentName, props) => {
      if (componentName === 'Input' && props.type === 'password') {
        return {
          'data-security-level': 'high',
          autoComplete: 'new-password',
          'aria-describedby': 'password-requirements'
        }
      }
      return {}
    }, { priority: 5 })

    // Add audit logging for security events
    serviceRegistry.register('onAuditLog', (table, operation, data, user) => {
      SecurityService.auditLog({
        table,
        operation,
        user: user?.id || 'anonymous',
        timestamp: new Date().toISOString(),
        ipAddress: 'unknown', // Would be retrieved from request context
        data: operation === 'delete' ? data.id : 'sanitized'
      })
    }, 1)
  }
}

class SecurityService {
  static async checkPermission(resource: string): Promise<boolean> {
    // Mock permission checking - would integrate with real auth system
    const userPermissions = ['departments.read', 'departments.write', 'reports.read']
    return userPermissions.includes(`${resource}.read`)
  }

  static async checkTableAccess(table: string, operation: 'read' | 'write', user?: any): Promise<boolean> {
    // Mock table-level permission checking
    console.log(`[SECURITY] Checking ${operation} access to ${table} for user:`, user?.id || 'anonymous')
    return true // Would implement real logic
  }

  static auditLog(event: any) {
    console.log('[SECURITY AUDIT]', event)
    // Would send to security logging system
  }
}

// ===== THEME PLUGIN =====
// This plugin adds advanced theming capabilities

export class ThemePlugin {
  static initialize() {
    // Add dark mode support
    uiRegistry.register('getThemeVariables', (componentName, variant) => {
      const isDark = document.documentElement.classList.contains('dark')
      
      if (componentName === 'Card') {
        return isDark ? {
          '--card-bg': '#1f2937',
          '--card-border': '#374151',
          '--card-text': '#f9fafb'
        } : {
          '--card-bg': '#ffffff',
          '--card-border': '#e5e7eb',
          '--card-text': '#111827'
        }
      }
      
      return {}
    }, { priority: 5 })

    // Add custom styling based on component state
    uiRegistry.register('transformClassNames', (componentName, classNames, props) => {
      if (componentName === 'Button' && props.variant === 'primary') {
        return `${classNames} shadow-lg hover:shadow-xl transition-shadow`
      }
      
      if (componentName === 'Input' && props.error) {
        return `${classNames} border-red-500 focus:border-red-500 focus:ring-red-500`
      }
      
      return classNames
    }, { priority: 10 })

    // Add custom animations
    uiRegistry.register('injectStyles', (componentName, props) => {
      if (componentName === 'Card') {
        return {
          animation: 'fadeIn 0.3s ease-in-out',
          transform: 'translateY(0)',
          transition: 'transform 0.2s ease'
        }
      }
      
      return {}
    }, { priority: 5 })
  }
}

// ===== PERFORMANCE MONITORING PLUGIN =====
// This plugin adds performance monitoring and optimization

export class PerformancePlugin {
  static initialize() {
    const performanceMetrics = new Map<string, number>()

    // Monitor service call performance
    serviceRegistry.register('onQueryStart', (table, operation) => {
      performanceMetrics.set(`${table}.${operation}`, Date.now())
    }, 5)

    serviceRegistry.register('onQueryEnd', (table, operation, duration) => {
      const key = `${table}.${operation}`
      const startTime = performanceMetrics.get(key)
      
      if (startTime) {
        const actualDuration = Date.now() - startTime
        performanceMetrics.delete(key)
        
        // Log slow queries
        if (actualDuration > 1000) {
          console.warn(`[PERFORMANCE] Slow query: ${key} took ${actualDuration}ms`)
        }
        
        // Store metrics for reporting
        PerformanceStore.recordMetric(key, actualDuration)
      }
    }, 5)

    // Monitor component render performance
    uiRegistry.register('onComponentMount', (componentName, ref, props) => {
      console.log(`[PERFORMANCE] ${componentName} mounted`)
    }, { priority: 1000 }) // Low priority to run after other hooks

    // Add performance warning for heavy operations
    serviceRegistry.register('beforeQuery', async (table, query) => {
      if (table === 'job_optimized_patterns' && !query.limit) {
        console.warn('[PERFORMANCE] Querying all job patterns without limit - consider pagination')
      }
      return query
    }, 5)
  }
}

class PerformanceStore {
  static metrics = new Map<string, number[]>()

  static recordMetric(key: string, value: number) {
    if (!this.metrics.has(key)) {
      this.metrics.set(key, [])
    }
    const values = this.metrics.get(key)!
    values.push(value)
    
    // Keep only last 100 measurements
    if (values.length > 100) {
      values.shift()
    }
  }

  static getAverageTime(key: string): number {
    const values = this.metrics.get(key) || []
    return values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0
  }
}

// ===== PLUGIN REGISTRY =====
// Central registry for managing all plugins

export class PluginRegistry {
  private static plugins = new Map<string, any>()
  private static initialized = new Set<string>()

  static register(name: string, plugin: any) {
    this.plugins.set(name, plugin)
  }

  static initialize(pluginName?: string) {
    if (pluginName) {
      const plugin = this.plugins.get(pluginName)
      if (plugin && !this.initialized.has(pluginName)) {
        plugin.initialize()
        this.initialized.add(pluginName)
        console.log(`[PLUGIN] Initialized: ${pluginName}`)
      }
    } else {
      // Initialize all plugins
      for (const [name, plugin] of this.plugins.entries()) {
        if (!this.initialized.has(name)) {
          plugin.initialize()
          this.initialized.add(name)
          console.log(`[PLUGIN] Initialized: ${name}`)
        }
      }
    }
  }

  static disable(pluginName: string) {
    if (this.initialized.has(pluginName)) {
      // In a real implementation, you'd call plugin cleanup methods
      this.initialized.delete(pluginName)
      console.log(`[PLUGIN] Disabled: ${pluginName}`)
    }
  }

  static list(): string[] {
    return Array.from(this.plugins.keys())
  }

  static isInitialized(pluginName: string): boolean {
    return this.initialized.has(pluginName)
  }
}

// Register all example plugins
PluginRegistry.register('reporting', ReportingPlugin)
PluginRegistry.register('notifications', NotificationPlugin)
PluginRegistry.register('security', SecurityPlugin)
PluginRegistry.register('theme', ThemePlugin)
PluginRegistry.register('performance', PerformancePlugin)

// Usage in your application initialization:
export function initializePlugins() {
  // Initialize core plugins
  PluginRegistry.initialize('security') // Always initialize security first
  PluginRegistry.initialize('performance')
  PluginRegistry.initialize('theme')
  PluginRegistry.initialize('notifications')
  
  // Conditionally initialize optional plugins
  if (process.env.NEXT_PUBLIC_ENABLE_REPORTING === 'true') {
    PluginRegistry.initialize('reporting')
  }
}

// Example of a custom plugin for a specific customer
export class CustomCustomerPlugin {
  static initialize() {
    // Add customer-specific validation
    const formHooks = useFormHooks('departments')
    
    formHooks.register('customValidation', async (data) => {
      // Customer requires all departments to have cost centers
      if (!data.cost_center) {
        return { cost_center: 'Cost center is required for this customer' }
      }
      return {}
    })

    // Add customer-specific navigation item
    navigationRegistry.register('beforeNavigationRender', (sections) => {
      const orgSection = sections.find(s => s.title === 'Organization')
      if (orgSection) {
        orgSection.items.push({
          key: 'customer-reports',
          label: 'Customer Reports',
          icon: FileText,
          order: 100
        })
      }
      return sections
    })

    // Add customer branding
    uiRegistry.register('wrapComponent', (componentName, element, props) => {
      if (componentName === 'Layout') {
        return (
          <div className="customer-branded">
            {element}
            <div className="customer-footer">
              Powered by Custom Manufacturing Solutions
            </div>
          </div>
        )
      }
      return element
    })
  }
}

// Register customer plugin
PluginRegistry.register('customer', CustomCustomerPlugin)

export default PluginRegistry