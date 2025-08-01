'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/auth/context'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Loader2, LogIn, UserPlus, Shield } from 'lucide-react'

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters')
})

const signUpSchema = loginSchema.extend({
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
})

type LoginFormData = z.infer<typeof loginSchema>
type SignUpFormData = z.infer<typeof signUpSchema>

interface LoginDialogProps {
  children?: React.ReactNode
  defaultOpen?: boolean
}

export function LoginDialog({ children, defaultOpen = false }: LoginDialogProps) {
  const [open, setOpen] = useState(defaultOpen)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const { signIn, signUp, config } = useAuth()

  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: ''
    }
  })

  const signUpForm = useForm<SignUpFormData>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: ''
    }
  })

  const handleLogin = async (data: LoginFormData) => {
    setIsLoading(true)
    setError(null)
    setSuccess(null)

    const result = await signIn(data.email, data.password)
    
    if (result.error) {
      setError(result.error)
    } else {
      setSuccess('Successfully signed in!')
      setTimeout(() => {
        setOpen(false)
        setSuccess(null)
      }, 1000)
    }
    
    setIsLoading(false)
  }

  const handleSignUp = async (data: SignUpFormData) => {
    setIsLoading(true)
    setError(null)
    setSuccess(null)

    const result = await signUp(data.email, data.password)
    
    if (result.error) {
      setError(result.error)
    } else {
      setSuccess('Account created! Please check your email to verify your account.')
      signUpForm.reset()
    }
    
    setIsLoading(false)
  }

  const handleDialogChange = (newOpen: boolean) => {
    setOpen(newOpen)
    if (!newOpen) {
      // Reset forms and state when dialog closes
      loginForm.reset()
      signUpForm.reset()
      setError(null)
      setSuccess(null)
    }
  }

  // Don't render if auth is disabled
  if (!config.enabled) {
    return null
  }

  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline" size="sm">
            <LogIn className="h-4 w-4 mr-2" />
            Sign In
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Authentication
          </DialogTitle>
          <DialogDescription>
            {config.required 
              ? 'Sign in to access the system'
              : 'Optional sign in - system works without authentication'
            }
          </DialogDescription>
        </DialogHeader>

        {!config.required && (
          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription>
              Authentication is optional. You can continue using the system as a guest 
              or sign in for enhanced features and data persistence.
            </AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert>
            <AlertDescription className="text-green-800">{success}</AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="login" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Sign In</TabsTrigger>
            <TabsTrigger value="signup">Sign Up</TabsTrigger>
          </TabsList>
          
          <TabsContent value="login">
            <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="login-email">Email</Label>
                <Input
                  id="login-email"
                  type="email"
                  placeholder="you@example.com"
                  {...loginForm.register('email')}
                  disabled={isLoading}
                />
                {loginForm.formState.errors.email && (
                  <p className="text-sm text-red-600">{loginForm.formState.errors.email.message}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="login-password">Password</Label>
                <Input
                  id="login-password"
                  type="password"
                  placeholder="Enter your password"
                  {...loginForm.register('password')}
                  disabled={isLoading}
                />
                {loginForm.formState.errors.password && (
                  <p className="text-sm text-red-600">{loginForm.formState.errors.password.message}</p>
                )}
              </div>
              
              <div className="flex gap-2">
                <Button type="submit" disabled={isLoading} className="flex-1">
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Sign In
                </Button>
                {!config.required && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setOpen(false)}
                    disabled={isLoading}
                  >
                    Continue as Guest
                  </Button>
                )}
              </div>
            </form>
          </TabsContent>
          
          <TabsContent value="signup">
            <form onSubmit={signUpForm.handleSubmit(handleSignUp)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="signup-email">Email</Label>
                <Input
                  id="signup-email"
                  type="email"
                  placeholder="you@example.com"
                  {...signUpForm.register('email')}
                  disabled={isLoading}
                />
                {signUpForm.formState.errors.email && (
                  <p className="text-sm text-red-600">{signUpForm.formState.errors.email.message}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="signup-password">Password</Label>
                <Input
                  id="signup-password"
                  type="password"
                  placeholder="Choose a secure password"
                  {...signUpForm.register('password')}
                  disabled={isLoading}
                />
                {signUpForm.formState.errors.password && (
                  <p className="text-sm text-red-600">{signUpForm.formState.errors.password.message}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="signup-confirm">Confirm Password</Label>
                <Input
                  id="signup-confirm"
                  type="password"
                  placeholder="Confirm your password"
                  {...signUpForm.register('confirmPassword')}
                  disabled={isLoading}
                />
                {signUpForm.formState.errors.confirmPassword && (
                  <p className="text-sm text-red-600">{signUpForm.formState.errors.confirmPassword.message}</p>
                )}
              </div>
              
              <div className="flex gap-2">
                <Button type="submit" disabled={isLoading} className="flex-1">
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <UserPlus className="mr-2 h-4 w-4" />
                  Sign Up
                </Button>
                {!config.required && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setOpen(false)}
                    disabled={isLoading}
                  >
                    Continue as Guest
                  </Button>
                )}
              </div>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}