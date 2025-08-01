// Security configuration for RLS deployment
export interface SecurityConfig {
  enforceAuthentication: boolean
  requireRoleBasedAccess: boolean
  allowAnonymousRead: boolean
  enableAuditLogging: boolean
  strictDepartmentIsolation: boolean
  logSecurityEvents: boolean
}

// Development security configuration (very permissive)
export const developmentSecurityConfig: SecurityConfig = {
  enforceAuthentication: false,           // Allow bypass with NEXT_PUBLIC_DISABLE_AUTH=true
  requireRoleBasedAccess: false,          // All authenticated users have full access
  allowAnonymousRead: true,               // Public read access for development
  enableAuditLogging: false,              // No audit logging in dev
  strictDepartmentIsolation: false,       // No department restrictions
  logSecurityEvents: false                // No security event logging
}

// Production security configuration (gradually tighten)
export const productionSecurityConfig: SecurityConfig = {
  enforceAuthentication: true,            // Always require authentication
  requireRoleBasedAccess: false,          // Start with all-access, tighten later
  allowAnonymousRead: false,              // No anonymous access in production
  enableAuditLogging: true,               // Log all data changes
  strictDepartmentIsolation: false,       // Start permissive, tighten later
  logSecurityEvents: true                 // Log security events
}

// Get current security configuration based on environment
export function getSecurityConfig(): SecurityConfig {
  const env = process.env.NODE_ENV || 'development'
  const securityLevel = process.env.NEXT_PUBLIC_SECURITY_LEVEL || 'development'
  
  if (env === 'development' || securityLevel === 'development') {
    return developmentSecurityConfig
  }
  
  return productionSecurityConfig
}

// Security policy helpers
export const securityHelpers = {
  /**
   * Check if operation should be allowed based on current security config
   */
  isOperationAllowed(operation: 'read' | 'write' | 'delete', userRole?: string): boolean {
    const config = getSecurityConfig()
    
    // In development mode, allow everything
    if (!config.enforceAuthentication) {
      return true
    }
    
    // If no role-based access, allow all operations for authenticated users
    if (!config.requireRoleBasedAccess) {
      return true
    }
    
    // Future: implement role-based restrictions here
    // For now, allow all operations
    return true
  },

  /**
   * Get RLS policy suffix based on security level
   */
  getPolicyLevel(): 'permissive' | 'restricted' | 'strict' {
    const config = getSecurityConfig()
    
    if (!config.enforceAuthentication) {
      return 'permissive'
    }
    
    if (!config.requireRoleBasedAccess) {
      return 'restricted'
    }
    
    return 'strict'
  },

  /**
   * Log security event if enabled
   */
  logSecurityEvent(event: string, details: Record<string, any>) {
    const config = getSecurityConfig()
    
    if (config.logSecurityEvents) {
      console.log(`[SECURITY] ${event}:`, details)
    }
  }
}

// Export current configuration
export const currentSecurityConfig = getSecurityConfig()