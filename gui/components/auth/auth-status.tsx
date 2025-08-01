'use client'

import { useAuth } from '@/lib/auth/context'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { User, Shield, ShieldOff, Settings } from 'lucide-react'

interface AuthStatusProps {
  showDetails?: boolean
  compact?: boolean
  className?: string
}

export function AuthStatus({ showDetails = false, compact = false, className = '' }: AuthStatusProps) {
  const { user, isAuthenticated, isGuest, config, signOut } = useAuth()
  
  if (!config.enabled) {
    return null // Don't show anything if auth is disabled
  }

  if (compact) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        {isAuthenticated ? (
          <>
            <Badge variant="default" className="bg-green-100 text-green-800">
              <User className="h-3 w-3 mr-1" />
              {user?.email?.split('@')[0] || 'User'}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={signOut}
              className="text-xs"
            >
              Sign Out
            </Button>
          </>
        ) : (
          <Badge variant="secondary" className="bg-blue-100 text-blue-800">
            <ShieldOff className="h-3 w-3 mr-1" />
            Guest
          </Badge>
        )}
      </div>
    )
  }

  if (!showDetails && !isAuthenticated && isGuest) {
    return null // Don't show card for guests unless details requested
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">
            <div className="flex items-center gap-2">
              {isAuthenticated ? (
                <Shield className="h-4 w-4 text-green-600" />
              ) : (
                <ShieldOff className="h-4 w-4 text-blue-600" />
              )}
              Authentication Status
            </div>
          </CardTitle>
          {showDetails && (
            <Settings className="h-4 w-4 text-gray-400" />
          )}
        </div>
        <CardDescription>
          {isAuthenticated
            ? `Signed in as ${user?.email}`
            : `Guest access ${config.required ? '(limited)' : '(full access)'}`
          }
        </CardDescription>
      </CardHeader>
      
      {showDetails && (
        <CardContent>
          <div className="space-y-3">
            {/* User Info */}
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Status:</span>
              <Badge variant={isAuthenticated ? "default" : "secondary"}>
                {isAuthenticated ? 'Authenticated' : 'Guest'}
              </Badge>
            </div>
            
            {user && (
              <>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Email:</span>
                  <span className="font-mono text-xs">{user.email}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">User ID:</span>
                  <span className="font-mono text-xs">{user.id.slice(0, 8)}...</span>
                </div>
              </>
            )}
            
            {/* Config Info */}
            <div className="pt-2 border-t space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Auth Required:</span>
                <span>{config.required ? 'Yes' : 'No'}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Guest Access:</span>
                <span>{config.enableGuestAccess ? 'Enabled' : 'Disabled'}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Fallback Mode:</span>
                <span>{config.fallbackToAnon ? 'Enabled' : 'Disabled'}</span>
              </div>
            </div>
            
            {/* Actions */}
            <div className="pt-3 border-t">
              {isAuthenticated ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={signOut}
                  className="w-full"
                >
                  Sign Out
                </Button>
              ) : (
                <p className="text-xs text-gray-500 text-center">
                  Authentication is optional - system works in guest mode
                </p>
              )}
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  )
}