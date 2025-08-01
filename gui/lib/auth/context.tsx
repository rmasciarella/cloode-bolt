'use client'

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User, Session, AuthChangeEvent } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { getAuthConfig, AuthConfig, SecurityLevel, FeatureName, featureSecurity } from './config'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  isAuthenticated: boolean
  isGuest: boolean
  config: AuthConfig
  
  // Auth actions
  signIn: (email: string, password: string) => Promise<{ error?: string }>
  signUp: (email: string, password: string, metadata?: any) => Promise<{ error?: string }>
  signOut: () => Promise<void>
  
  // Security checks
  canAccess: (feature: FeatureName) => boolean
  requiresAuth: (feature: FeatureName) => boolean
  getAccessLevel: (feature: FeatureName) => SecurityLevel
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const config = getAuthConfig()

  // Initialize auth state
  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.warn('Auth session error:', error)
      }
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session: Session | null) => {
        console.log('Auth state changed:', event, session?.user?.email)
        setSession(session)
        setUser(session?.user ?? null)
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  // Auth actions
  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      })
      
      if (error) {
        return { error: error.message }
      }
      
      return {}
    } catch (error) {
      return { error: 'An unexpected error occurred' }
    }
  }

  const signUp = async (email: string, password: string, metadata?: any) => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata
        }
      })
      
      if (error) {
        return { error: error.message }
      }
      
      return {}
    } catch (error) {
      return { error: 'An unexpected error occurred' }
    }
  }

  const signOut = async () => {
    try {
      await supabase.auth.signOut()
    } catch (error) {
      console.error('Sign out error:', error)
    }
  }

  // Security checks
  const canAccess = (feature: FeatureName): boolean => {
    const securityLevel = featureSecurity[feature]
    
    switch (securityLevel) {
      case SecurityLevel.OPTIONAL:
        return true // Always accessible, auth just enhances experience
      case SecurityLevel.REQUIRED:
        if (!config.enabled) return true // If auth disabled, allow everything
        if (config.fallbackToAnon && !config.required) return true // Fallback mode
        return isAuthenticated
      default:
        return isAuthenticated
    }
  }

  const requiresAuth = (feature: FeatureName): boolean => {
    if (!config.enabled) return false
    const securityLevel = featureSecurity[feature]
    return securityLevel === SecurityLevel.REQUIRED && !config.fallbackToAnon
  }

  const getAccessLevel = (feature: FeatureName): SecurityLevel => {
    return featureSecurity[feature]
  }

  const isAuthenticated = !!user
  const isGuest = !isAuthenticated && config.enableGuestAccess

  const value: AuthContextType = {
    user,
    session,
    loading,
    isAuthenticated,
    isGuest,
    config,
    signIn,
    signUp,
    signOut,
    canAccess,
    requiresAuth,
    getAccessLevel
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

// Helper hook for checking feature access
export function useFeatureAccess(feature: FeatureName) {
  const auth = useAuth()
  
  return {
    canAccess: auth.canAccess(feature),
    requiresAuth: auth.requiresAuth(feature),
    securityLevel: auth.getAccessLevel(feature),
    isAuthenticated: auth.isAuthenticated,
    isGuest: auth.isGuest
  }
}