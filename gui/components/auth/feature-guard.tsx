'use client'

import { ReactNode } from 'react'
import { useFeatureAccess } from '@/lib/auth/context'
import { FeatureName } from '@/lib/auth/config'
import { LoginDialog } from './login-dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Shield, ShieldOff, Lock } from 'lucide-react'

interface FeatureGuardProps {
  feature: FeatureName
  children: ReactNode
  fallback?: ReactNode
  showAuthPrompt?: boolean
  className?: string
}

export function FeatureGuard({ 
  feature, 
  children, 
  fallback,
  showAuthPrompt = true,
  className = '' 
}: FeatureGuardProps) {
  const { canAccess, requiresAuth, securityLevel, isAuthenticated, isGuest } = useFeatureAccess(feature)

  // Always allow access if user can access the feature
  if (canAccess) {
    return <div className={className}>{children}</div>
  }

  // If access is denied and auth is required, show auth prompt or fallback
  if (!canAccess && requiresAuth) {
    if (fallback) {
      return <div className={className}>{fallback}</div>
    }

    if (showAuthPrompt) {
      return (
        <div className={className}>
          <Alert>
            <Lock className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>This feature requires authentication.</span>
              <LoginDialog>
                <Button size="sm" variant="outline">
                  <Shield className="h-4 w-4 mr-2" />
                  Sign In
                </Button>
              </LoginDialog>
            </AlertDescription>
          </Alert>
        </div>
      )
    }
  }

  // Default: access denied without prompt
  return null
}

// Higher-order component version
export function withFeatureGuard<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  feature: FeatureName,
  options: {
    fallback?: ReactNode
    showAuthPrompt?: boolean
  } = {}
) {
  const { fallback, showAuthPrompt = true } = options

  return function GuardedComponent(props: P) {
    return (
      <FeatureGuard 
        feature={feature} 
        fallback={fallback}
        showAuthPrompt={showAuthPrompt}
      >
        <WrappedComponent {...props} />
      </FeatureGuard>
    )
  }
}

// Hook for conditional rendering within components
export function useConditionalRender(feature: FeatureName) {
  const access = useFeatureAccess(feature)
  
  return {
    ...access,
    renderIf: (component: ReactNode) => access.canAccess ? component : null,
    renderWithAuth: (component: ReactNode, authPrompt?: ReactNode) => {
      if (access.canAccess) return component
      if (access.requiresAuth && authPrompt) return authPrompt
      return null
    }
  }
}