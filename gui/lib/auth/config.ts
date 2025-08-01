// Authentication configuration with transparent fallback
export interface AuthConfig {
  enabled: boolean
  required: boolean
  fallbackToAnon: boolean
  enableGuestAccess: boolean
  redirectAfterAuth?: string
  sessionTimeout?: number // minutes
}

// Default configuration - transparent auth that doesn't break existing flows
export const defaultAuthConfig: AuthConfig = {
  enabled: true,          // Auth system is available
  required: false,        // But not required for access
  fallbackToAnon: true,   // Fall back to anonymous access
  enableGuestAccess: true, // Allow guest users
  redirectAfterAuth: '/', // Redirect to home after auth
  sessionTimeout: 60      // 1 hour session timeout
}

// Environment-based configuration
export const getAuthConfig = (): AuthConfig => {
  const isProduction = process.env.NODE_ENV === 'production'
  const authRequired = process.env.NEXT_PUBLIC_AUTH_REQUIRED === 'true'
  const authEnabled = process.env.NEXT_PUBLIC_AUTH_ENABLED !== 'false'
  
  return {
    ...defaultAuthConfig,
    enabled: authEnabled,
    required: authRequired || isProduction,
    fallbackToAnon: !authRequired,
    enableGuestAccess: !authRequired,
    sessionTimeout: parseInt(process.env.NEXT_PUBLIC_SESSION_TIMEOUT || '60')
  }
}

// Security levels for different features
export enum SecurityLevel {
  PUBLIC = 'public',      // No auth required
  OPTIONAL = 'optional',  // Auth enhances experience but not required
  REQUIRED = 'required'   // Auth must be present
}

// Feature-level security configuration
export const featureSecurity = {
  departments: SecurityLevel.OPTIONAL,
  machines: SecurityLevel.OPTIONAL,
  workCells: SecurityLevel.OPTIONAL,
  jobTemplates: SecurityLevel.OPTIONAL,
  solver: SecurityLevel.OPTIONAL,
  bulkOperations: SecurityLevel.OPTIONAL,
  dataExport: SecurityLevel.REQUIRED,
  systemSettings: SecurityLevel.REQUIRED
} as const

export type FeatureName = keyof typeof featureSecurity