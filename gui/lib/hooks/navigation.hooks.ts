// Navigation Extension Hooks following Inventor Black's patterns

export interface NavigationItem {
  key: string
  label: string
  icon: React.ComponentType<any>
  component?: React.ComponentType<any>
  order?: number
  visible?: boolean
  permission?: string
}

export interface NavigationSection {
  title: string
  icon: React.ComponentType<any>
  items: NavigationItem[]
  order?: number
  visible?: boolean
}

export interface NavigationHooks {
  // Pre-render hooks for modifying navigation structure
  beforeNavigationRender: (sections: NavigationSection[]) => NavigationSection[]
  
  // Component resolution hooks
  resolveFormComponent: (activeSection: string) => React.ComponentType<any> | null
  
  // Navigation state hooks
  beforeNavigationChange: (from: string, to: string) => boolean | Promise<boolean>
  afterNavigationChange: (from: string, to: string) => void
  
  // Permission hooks
  canAccessSection: (sectionKey: string, user?: any) => boolean
  
  // Dynamic section registration
  registerNavSection: (section: NavigationSection) => void
  registerNavItem: (sectionTitle: string, item: NavigationItem) => void
}

type NavigationHookHandler<T extends keyof NavigationHooks> = NavigationHooks[T]

class NavigationHookRegistry {
  private hooks: Map<keyof NavigationHooks, Array<NavigationHookHandler<any>>> = new Map()
  
  register<T extends keyof NavigationHooks>(
    hookName: T,
    handler: NavigationHookHandler<T>,
    priority: number = 10
  ): () => void {
    if (!this.hooks.has(hookName)) {
      this.hooks.set(hookName, [])
    }
    
    const handlers = this.hooks.get(hookName)!
    handlers.push({ handler, priority })
    handlers.sort((a, b) => a.priority - b.priority)
    
    // Return unregister function
    return () => {
      const index = handlers.findIndex(h => h.handler === handler)
      if (index > -1) handlers.splice(index, 1)
    }
  }
  
  async execute<T extends keyof NavigationHooks>(
    hookName: T,
    ...args: Parameters<NavigationHookHandler<T>>
  ): Promise<any> {
    const handlers = this.hooks.get(hookName) || []
    
    if (hookName === 'beforeNavigationRender') {
      // Chain transformations for data modification hooks
      return handlers.reduce((result, { handler }) => {
        return handler(result)
      }, args[0])
    }
    
    if (hookName === 'beforeNavigationChange') {
      // All handlers must return true for action hooks
      for (const { handler } of handlers) {
        const result = await handler(...args)
        if (result === false) return false
      }
      return true
    }
    
    if (hookName === 'resolveFormComponent') {
      // First non-null result wins for resolver hooks
      for (const { handler } of handlers) {
        const result = handler(...args)
        if (result !== null) return result
      }
      return null
    }
    
    // Fire-and-forget for notification hooks
    handlers.forEach(({ handler }) => handler(...args))
  }
}

export const navigationRegistry = new NavigationHookRegistry()

// Hook for components to use
export function useNavigationHooks() {
  return {
    register: navigationRegistry.register.bind(navigationRegistry),
    execute: navigationRegistry.execute.bind(navigationRegistry)
  }
}