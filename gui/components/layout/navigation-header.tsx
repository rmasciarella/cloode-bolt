'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/lib/auth/context'
import { AuthStatus } from '@/components/auth/auth-status'
import { LoginDialog } from '@/components/auth/login-dialog'
import { Button } from '@/components/ui/button'
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { 
  Settings, 
  User, 
  Shield, 
  ChevronDown,
  Menu,
  X,
  Home,
  Building2,
  Wrench,
  Users,
  Calendar,
  BarChart3
} from 'lucide-react'

interface NavigationHeaderProps {
  className?: string
}

const navigationItems = [
  { name: 'Home', href: '/', icon: Home },
  { name: 'Departments', href: '#departments', icon: Building2 },
  { name: 'Machines', href: '#machines', icon: Wrench },
  { name: 'Work Cells', href: '#work-cells', icon: Users },
  { name: 'Job Templates', href: '#job-templates', icon: Calendar },
  { name: 'Solver', href: '#solver', icon: BarChart3 },
]

export function NavigationHeader({ className = '' }: NavigationHeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { config, isAuthenticated, user } = useAuth()

  return (
    <header className={`bg-white shadow-sm border-b ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo and Brand */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <BarChart3 className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-semibold text-gray-900">
                Fresh Solver
              </span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex space-x-8">
            {navigationItems.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className="flex items-center space-x-1 text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.name}</span>
                </Link>
              )
            })}
          </nav>

          {/* Authentication Section - Desktop */}
          <div className="hidden md:flex items-center space-x-4">
            {config.enabled && (
              <>
                {isAuthenticated ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="flex items-center space-x-2">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <User className="h-4 w-4 text-blue-600" />
                        </div>
                        <span className="text-sm font-medium">
                          {user?.email?.split('@')[0] || 'User'}
                        </span>
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuItem asChild>
                        <div className="flex flex-col">
                          <span className="font-medium">{user?.email}</span>
                          <span className="text-xs text-gray-500">Authenticated User</span>
                        </div>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem>
                        <Settings className="h-4 w-4 mr-2" />
                        Settings
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Shield className="h-4 w-4 mr-2" />
                        Security
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <div className="flex items-center space-x-3">
                    <Badge variant="secondary" className="bg-blue-50 text-blue-700">
                      Guest Mode
                    </Badge>
                    <LoginDialog>
                      <Button size="sm" variant="outline">
                        <Shield className="h-4 w-4 mr-2" />
                        Sign In
                      </Button>
                    </LoginDialog>
                  </div>
                )}
              </>
            )}
            
            {/* Auth status for development/debugging */}
            {process.env.NODE_ENV === 'development' && (
              <AuthStatus compact />
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 pt-4 pb-3">
            <nav className="space-y-1">
              {navigationItems.map((item) => {
                const Icon = item.icon
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className="flex items-center space-x-3 text-gray-600 hover:text-gray-900 hover:bg-gray-50 px-3 py-2 rounded-md text-base font-medium"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Icon className="h-5 w-5" />
                    <span>{item.name}</span>
                  </Link>
                )
              })}
            </nav>
            
            {/* Mobile Auth Section */}
            {config.enabled && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                {isAuthenticated ? (
                  <div className="px-3 py-2">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <User className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {user?.email?.split('@')[0] || 'User'}
                        </div>
                        <div className="text-xs text-gray-500">
                          {user?.email}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="px-3 py-2">
                    <div className="flex items-center justify-between">
                      <Badge variant="secondary" className="bg-blue-50 text-blue-700">
                        Guest Mode
                      </Badge>
                      <LoginDialog>
                        <Button size="sm" variant="outline">
                          <Shield className="h-4 w-4 mr-2" />
                          Sign In
                        </Button>
                      </LoginDialog>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  )
}