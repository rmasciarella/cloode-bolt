// Auth configuration
export { 
  getAuthConfig, 
  defaultAuthConfig, 
  SecurityLevel, 
  featureSecurity,
  type AuthConfig,
  type FeatureName
} from './config'

// Auth context and hooks
export { 
  AuthProvider, 
  useAuth, 
  useFeatureAccess 
} from './context'

// Auth-aware Supabase client
export { 
  authAwareSupabase, 
  AuthAwareSupabaseClient 
} from '../supabase-auth'

// Re-export original supabase client for backward compatibility
export { supabase } from '../supabase'