'use client'

import { useAuth, useFeatureAccess } from '@/lib/auth/context'
import { AuthStatus } from '@/components/auth/auth-status'
import { LoginDialog } from '@/components/auth/login-dialog'
import { FeatureGuard } from '@/components/auth/feature-guard'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Shield, User, Settings, Lock, Eye, EyeOff } from 'lucide-react'
import { useState } from 'react'

export function AuthDemo() {
  const auth = useAuth()
  const [showDetails, setShowDetails] = useState(false)
  
  // Test different feature access levels
  const departmentAccess = useFeatureAccess('departments')
  const exportAccess = useFeatureAccess('dataExport')
  const settingsAccess = useFeatureAccess('systemSettings')

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Authentication Demo
          </CardTitle>
          <CardDescription>
            Demonstrates the transparent authentication system working alongside existing functionality
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Badge variant={auth.isAuthenticated ? "default" : "secondary"}>
              {auth.isAuthenticated ? 'Authenticated' : 'Guest Mode'}
            </Badge>
            
            {auth.config.enabled && (
              <LoginDialog>
                <Button size="sm" variant="outline">
                  <User className="h-4 w-4 mr-2" />
                  {auth.isAuthenticated ? 'Account' : 'Sign In'}
                </Button>
              </LoginDialog>
            )}
            
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowDetails(!showDetails)}
            >
              {showDetails ? (
                <><EyeOff className="h-4 w-4 mr-2" />Hide Details</>
              ) : (
                <><Eye className="h-4 w-4 mr-2" />Show Details</>
              )}
            </Button>
          </div>

          {showDetails && (
            <AuthStatus showDetails className="mt-4" />
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="features" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="features">Feature Access</TabsTrigger>
          <TabsTrigger value="forms">Form Integration</TabsTrigger>
          <TabsTrigger value="config">Configuration</TabsTrigger>
        </TabsList>
        
        <TabsContent value="features" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Feature Access Demo</CardTitle>
              <CardDescription>
                Shows how different features handle authentication requirements
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Public/Optional Feature */}
              <FeatureGuard feature="departments">
                <Alert>
                  <Shield className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Departments:</strong> Optional security level - accessible by everyone.
                    {departmentAccess.isAuthenticated 
                      ? ' (Enhanced with user context)' 
                      : ' (Guest access enabled)'
                    }
                  </AlertDescription>
                </Alert>
              </FeatureGuard>

              {/* Required Feature */}
              <FeatureGuard 
                feature="dataExport"
                fallback={
                  <Alert variant="destructive">
                    <Lock className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Data Export:</strong> Requires authentication for security.
                    </AlertDescription>
                  </Alert>
                }
              >
                <Alert>
                  <Shield className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Data Export:</strong> Available - user is authenticated.
                  </AlertDescription>
                </Alert>
              </FeatureGuard>

              {/* System Settings */}
              <FeatureGuard 
                feature="systemSettings"
                fallback={
                  <Alert variant="destructive">
                    <Lock className="h-4 w-4" />
                    <AlertDescription>
                      <strong>System Settings:</strong> Admin access required.
                    </AlertDescription>
                  </Alert>
                }
              >
                <Alert>
                  <Settings className="h-4 w-4" />
                  <AlertDescription>
                    <strong>System Settings:</strong> Admin access available.
                  </AlertDescription>
                </Alert>
              </FeatureGuard>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="forms" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Form Integration</CardTitle>
              <CardDescription>
                Existing forms continue to work exactly as before
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Alert>
                <Shield className="h-4 w-4" />
                <AlertDescription>
                  <strong>Backward Compatibility:</strong> All existing forms (DepartmentForm, MachineForm, etc.) 
                  continue to function without any changes required. The authentication system runs transparently 
                  in the background and enhances functionality when users are signed in.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="config" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Configuration Status</CardTitle>
              <CardDescription>
                Current authentication configuration
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Auth Enabled:</span>
                    <Badge variant={auth.config.enabled ? "default" : "secondary"}>
                      {auth.config.enabled ? 'Yes' : 'No'}
                    </Badge>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Auth Required:</span>
                    <Badge variant={auth.config.required ? "destructive" : "default"}>
                      {auth.config.required ? 'Yes' : 'No'}
                    </Badge>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Guest Access:</span>
                    <Badge variant={auth.config.enableGuestAccess ? "default" : "secondary"}>
                      {auth.config.enableGuestAccess ? 'Enabled' : 'Disabled'}
                    </Badge>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Fallback Mode:</span>
                    <Badge variant={auth.config.fallbackToAnon ? "default" : "secondary"}>
                      {auth.config.fallbackToAnon ? 'Enabled' : 'Disabled'}
                    </Badge>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Session Timeout:</span>
                    <span className="text-xs font-mono">
                      {auth.config.sessionTimeout}min
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Current Mode:</span>
                    <Badge variant="outline">
                      {auth.config.required ? 'Required' : 'Optional'}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}