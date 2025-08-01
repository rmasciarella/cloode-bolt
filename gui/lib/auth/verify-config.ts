// Authentication configuration verification utility
import { getAuthConfig, featureSecurity, SecurityLevel } from './config'

export interface ConfigVerificationResult {
  isValid: boolean
  warnings: string[]
  errors: string[]
  recommendations: string[]
  mode: 'disabled' | 'optional' | 'required' | 'mixed'
}

export function verifyAuthConfig(): ConfigVerificationResult {
  const config = getAuthConfig()
  const result: ConfigVerificationResult = {
    isValid: true,
    warnings: [],
    errors: [],
    recommendations: [],
    mode: 'disabled'
  }

  // Determine auth mode
  if (!config.enabled) {
    result.mode = 'disabled'
  } else if (config.required && !config.fallbackToAnon) {
    result.mode = 'required'
  } else if (!config.required && config.enableGuestAccess) {
    result.mode = 'optional'
  } else {
    result.mode = 'mixed'
  }

  // Check for configuration conflicts
  if (config.enabled && config.required && config.fallbackToAnon) {
    result.warnings.push(
      'Auth is required but fallback to anonymous is enabled. This may cause confusion.'
    )
  }

  if (!config.enabled && !config.enableGuestAccess) {
    result.errors.push(
      'Auth is disabled but guest access is also disabled. Users cannot access the system.'
    )
    result.isValid = false
  }

  if (config.required && config.enableGuestAccess) {
    result.warnings.push(
      'Auth is required but guest access is enabled. Consider disabling guest access for consistency.'
    )
  }

  // Check feature security levels
  const securityLevels = Object.values(featureSecurity)
  const hasRequiredFeatures = securityLevels.some(level => level === SecurityLevel.REQUIRED)
  const hasPublicFeatures = false // No public features defined in featureSecurity
  const hasOptionalFeatures = securityLevels.some(level => level === SecurityLevel.OPTIONAL)

  if (!config.enabled && hasRequiredFeatures) {
    result.warnings.push(
      'Auth is disabled but some features require authentication. These features will be inaccessible.'
    )
  }

  if (config.required && hasPublicFeatures) {
    result.recommendations.push(
      'Consider changing public features to optional or required for consistency.'
    )
  }

  // Environment-specific checks
  const isProduction = process.env.NODE_ENV === 'production'
  const isDevelopment = process.env.NODE_ENV === 'development'

  if (isProduction && !config.required) {
    result.recommendations.push(
      'Consider requiring authentication in production for better security.'
    )
  }

  if (isDevelopment && config.required && !config.fallbackToAnon) {
    result.recommendations.push(
      'Consider enabling fallback to anonymous access in development for easier testing.'
    )
  }

  // Session timeout checks
  if (config.sessionTimeout && config.sessionTimeout < 15) {
    result.warnings.push(
      'Session timeout is very short (< 15 minutes). This may impact user experience.'
    )
  }

  if (config.sessionTimeout && config.sessionTimeout > 480) {
    result.warnings.push(
      'Session timeout is very long (> 8 hours). Consider security implications.'
    )
  }

  // Generate summary recommendations
  if (result.mode === 'optional') {
    result.recommendations.push(
      'Current mode: Optional Authentication - Users can access the system as guests with option to sign in for enhanced features.'
    )
  } else if (result.mode === 'required') {
    result.recommendations.push(
      'Current mode: Required Authentication - All users must sign in to access the system.'
    )
  } else if (result.mode === 'disabled') {
    result.recommendations.push(
      'Current mode: Authentication Disabled - All users access the system anonymously.'
    )
  }

  return result
}

export function printConfigVerification(): void {
  const result = verifyAuthConfig()
  const config = getAuthConfig()
  
  console.group('🔐 Authentication Configuration Verification')
  
  console.log('📋 Configuration:')
  console.table({
    'Auth Enabled': config.enabled,
    'Auth Required': config.required,
    'Guest Access': config.enableGuestAccess,
    'Fallback to Anon': config.fallbackToAnon,
    'Session Timeout': `${config.sessionTimeout}min`,
    'Mode': result.mode.toUpperCase()
  })
  
  if (result.errors.length > 0) {
    console.log('❌ Errors:')
    result.errors.forEach(error => console.error(`  • ${error}`))
  }
  
  if (result.warnings.length > 0) {
    console.log('⚠️  Warnings:')
    result.warnings.forEach(warning => console.warn(`  • ${warning}`))
  }
  
  if (result.recommendations.length > 0) {
    console.log('💡 Recommendations:')
    result.recommendations.forEach(rec => console.log(`  • ${rec}`))
  }
  
  console.log(`✅ Configuration is ${result.isValid ? 'VALID' : 'INVALID'}`)
  console.groupEnd()
}

// Auto-run verification in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  // Run after a short delay to avoid blocking initial render
  setTimeout(() => {
    if (process.env.NEXT_PUBLIC_SHOW_AUTH_DEBUG === 'true') {
      printConfigVerification()
    }
  }, 1000)
}