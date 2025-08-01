// UI Component Extension Hooks following Inventor Black's patterns

import React from 'react'

export interface UIHooks {
  // Component rendering hooks
  beforeRender: (componentName: string, props: any) => any | Promise<any>
  afterRender: (componentName: string, element: React.ReactElement, props: any) => React.ReactElement
  wrapComponent: (componentName: string, element: React.ReactElement, props: any) => React.ReactElement
  
  // Theme and styling hooks
  getThemeVariables: (componentName: string, variant?: string) => Record<string, any>
  transformClassNames: (componentName: string, classNames: string, props: any) => string
  injectStyles: (componentName: string, props: any) => React.CSSProperties
  
  // Behavior hooks
  onComponentMount: (componentName: string, ref: any, props: any) => void
  onComponentUnmount: (componentName: string, ref: any, props: any) => void
  onPropsChange: (componentName: string, prevProps: any, nextProps: any) => void
  
  // Event handling hooks
  interceptEvent: (componentName: string, eventName: string, event: any, originalHandler?: Function) => boolean
  beforeEventHandler: (componentName: string, eventName: string, event: any) => any
  afterEventHandler: (componentName: string, eventName: string, event: any, result: any) => void
  
  // Accessibility hooks
  enhanceA11y: (componentName: string, props: any) => Record<string, any>
  announceChange: (componentName: string, change: string, props: any) => void
  
  // Validation and form hooks
  validateProps: (componentName: string, props: any) => string[]
  transformFormValue: (componentName: string, fieldName: string, value: any) => any
  
  // Extension point hooks
  renderAdditionalContent: (componentName: string, position: 'before' | 'after' | 'replace', props: any) => React.ReactNode
  addContextMenuItems: (componentName: string, props: any) => Array<{label: string, action: Function, icon?: React.ReactNode}>
}

type UIHookHandler<K extends keyof UIHooks> = UIHooks[K]

class UIHookRegistry {
  private hooks: Map<keyof UIHooks, Array<{ handler: UIHookHandler<any>, priority: number, condition?: (componentName: string, props: any) => boolean }>> = new Map()
  
  register<K extends keyof UIHooks>(
    hookName: K,
    handler: UIHookHandler<K>,
    options: {
      priority?: number
      condition?: (componentName: string, props: any) => boolean
      components?: string[]
    } = {}
  ): () => void {
    const { priority = 10, condition, components } = options
    
    if (!this.hooks.has(hookName)) {
      this.hooks.set(hookName, [])
    }
    
    const effectiveCondition = components 
      ? (componentName: string) => components.includes(componentName)
      : condition
    
    const handlers = this.hooks.get(hookName)!
    const entry = { handler, priority, condition: effectiveCondition }
    handlers.push(entry)
    handlers.sort((a, b) => a.priority - b.priority)
    
    return () => {
      const index = handlers.findIndex(h => h.handler === handler)
      if (index > -1) handlers.splice(index, 1)
    }
  }
  
  async execute<K extends keyof UIHooks>(
    hookName: K,
    componentName: string,
    ...args: any[]
  ): Promise<any> {
    const handlers = this.hooks.get(hookName) || []
    const applicableHandlers = handlers.filter(({ condition }) => 
      !condition || condition(componentName, args[0])
    )
    
    if (applicableHandlers.length === 0) {
      return this.getDefaultReturn(hookName, args)
    }
    
    // Props transformation hooks (chain)
    if (['beforeRender', 'transformClassNames', 'enhanceA11y', 'transformFormValue'].includes(hookName as string)) {
      return applicableHandlers.reduce(async (result, { handler }) => {
        const data = await result
        return handler(componentName, data, ...args.slice(1))
      }, Promise.resolve(args[0]))
    }
    
    // Component wrapping hooks (chain)
    if (['afterRender', 'wrapComponent'].includes(hookName as string)) {
      return applicableHandlers.reduce((element, { handler }) => {
        return handler(componentName, element, ...args.slice(1))
      }, args[0] as React.ReactElement)
    }
    
    // Object merging hooks (merge all results)
    if (['getThemeVariables', 'injectStyles'].includes(hookName as string)) {
      const results = await Promise.all(
        applicableHandlers.map(({ handler }) => handler(componentName, ...args))
      )
      return results.reduce((merged, result) => ({ ...merged, ...result }), {})
    }
    
    // Array merging hooks (concatenate results)
    if (['validateProps', 'addContextMenuItems'].includes(hookName as string)) {
      const results = await Promise.all(
        applicableHandlers.map(({ handler }) => handler(componentName, ...args))
      )
      return results.flat()
    }
    
    // Content rendering hooks (render all)
    if (hookName === 'renderAdditionalContent') {
      const results = await Promise.all(
        applicableHandlers.map(({ handler }) => handler(componentName, ...args))
      )
      return results.filter(Boolean)
    }
    
    // Event interception hooks (first false stops chain)
    if (hookName === 'interceptEvent') {
      for (const { handler } of applicableHandlers) {
        const result = await handler(componentName, ...args)
        if (result === false) return false
      }
      return true
    }
    
    // Notification hooks (fire all)
    await Promise.all(
      applicableHandlers.map(({ handler }) => handler(componentName, ...args))
    )
  }
  
  private getDefaultReturn(hookName: keyof UIHooks, args: any[]): any {
    switch (hookName) {
      case 'beforeRender':
      case 'transformClassNames':
      case 'transformFormValue':
        return args[0]
      case 'afterRender':
      case 'wrapComponent':
        return args[0]
      case 'getThemeVariables':
      case 'injectStyles':
      case 'enhanceA11y':
        return {}
      case 'validateProps':
      case 'addContextMenuItems':
        return []
      case 'interceptEvent':
        return true
      case 'renderAdditionalContent':
        return null
      default:
        return undefined
    }
  }
}

export const uiRegistry = new UIHookRegistry()

// Higher-order component to add hook support to existing components
export function withUIHooks<P extends object>(
  componentName: string,
  WrappedComponent: React.ComponentType<P>
): React.ComponentType<P> {
  return React.forwardRef<any, P>((props, ref) => {
    const [enhancedProps, setEnhancedProps] = React.useState(props)
    const componentRef = React.useRef<any>(null)
    
    // Merge forwarded ref with internal ref
    const mergedRef = React.useCallback((node: any) => {
      componentRef.current = node
      if (typeof ref === 'function') {
        ref(node)
      } else if (ref) {
        ref.current = node
      }
    }, [ref])
    
    React.useEffect(() => {
      const processProps = async () => {
        // Execute beforeRender hook
        const modifiedProps = await uiRegistry.execute('beforeRender', componentName, props)
        
        // Enhance accessibility
        const a11yProps = await uiRegistry.execute('enhanceA11y', componentName, modifiedProps)
        
        // Validate props
        const validationErrors = await uiRegistry.execute('validateProps', componentName, modifiedProps)
        if (validationErrors.length > 0) {
          console.warn(`[${componentName}] Validation errors:`, validationErrors)
        }
        
        setEnhancedProps({ ...modifiedProps, ...a11yProps })
      }
      
      processProps()
    }, [props])
    
    React.useEffect(() => {
      // Component mount hook
      uiRegistry.execute('onComponentMount', componentName, componentRef.current, enhancedProps)
      
      return () => {
        // Component unmount hook
        uiRegistry.execute('onComponentUnmount', componentName, componentRef.current, enhancedProps)
      }
    }, [enhancedProps])
    
    React.useEffect(() => {
      // Props change hook
      uiRegistry.execute('onPropsChange', componentName, props, enhancedProps)
    }, [props, enhancedProps])
    
    // Get theme variables and inject styles
    const [themeVars, setThemeVars] = React.useState<Record<string, any>>({})
    const [injectedStyles, setInjectedStyles] = React.useState<React.CSSProperties>({})
    const [transformedClassName, setTransformedClassName] = React.useState<string | undefined>()
    
    React.useEffect(() => {
      const loadThemeAndStyles = async () => {
        const theme = await uiRegistry.execute('getThemeVariables', componentName, (enhancedProps as any).variant)
        const styles = await uiRegistry.execute('injectStyles', componentName, enhancedProps)
        setThemeVars(theme || {})
        setInjectedStyles(styles || {})
      }
      loadThemeAndStyles()
    }, [(enhancedProps as any).variant, enhancedProps])
    
    React.useEffect(() => {
      const loadClassName = async () => {
        if ('className' in enhancedProps) {
          const className = await uiRegistry.execute('transformClassNames', componentName, (enhancedProps as any).className as string, enhancedProps)
          setTransformedClassName(className)
        } else {
          setTransformedClassName(undefined)
        }
      }
      loadClassName()
    }, [enhancedProps])
    
    // Create enhanced event handlers
    const createEnhancedHandler = React.useCallback((eventName: string, originalHandler?: Function) => {
      return async (event: any) => {
        // Check if event should be intercepted
        const shouldContinue = await uiRegistry.execute('interceptEvent', componentName, eventName, event, originalHandler)
        if (!shouldContinue) return
        
        // Execute beforeEventHandler
        const modifiedEvent = await uiRegistry.execute('beforeEventHandler', componentName, eventName, event)
        
        // Execute original handler if provided
        let result
        if (originalHandler) {
          result = await originalHandler(modifiedEvent || event)
        }
        
        // Execute afterEventHandler
        await uiRegistry.execute('afterEventHandler', componentName, eventName, modifiedEvent || event, result)
        
        return result
      }
    }, [componentName])
    
    // Enhance event props
    const enhancedEventProps = React.useMemo(() => {
      const eventProps: any = {}
      Object.keys(enhancedProps).forEach(key => {
        if (key.startsWith('on') && typeof (enhancedProps as any)[key] === 'function') {
          const eventName = key.slice(2).toLowerCase()
          eventProps[key] = createEnhancedHandler(eventName, (enhancedProps as any)[key])
        }
      })
      return eventProps
    }, [enhancedProps, createEnhancedHandler])
    
    // State for async-rendered elements
    const [finalElement, setFinalElement] = React.useState<React.ReactElement | null>(null)
    
    React.useEffect(() => {
      const renderEnhancedElement = async () => {
        // Render component with all enhancements
        let element = React.createElement(WrappedComponent, {
          ...enhancedProps,
          ...enhancedEventProps,
          ref: mergedRef,
          className: transformedClassName || (enhancedProps as any).className,
          style: { ...(enhancedProps as any).style, ...injectedStyles }
        })
        
        // Execute afterRender and wrapComponent hooks
        element = await uiRegistry.execute('afterRender', componentName, element, enhancedProps) as React.ReactElement || element
        element = await uiRegistry.execute('wrapComponent', componentName, element, enhancedProps) as React.ReactElement || element
        
        // Render additional content
        const beforeContent = await uiRegistry.execute('renderAdditionalContent', componentName, 'before', enhancedProps)
        const afterContent = await uiRegistry.execute('renderAdditionalContent', componentName, 'after', enhancedProps)
        const replaceContent = await uiRegistry.execute('renderAdditionalContent', componentName, 'replace', enhancedProps)
        
        if (replaceContent) {
          setFinalElement(replaceContent as React.ReactElement)
          return
        }
        
        setFinalElement(
          <React.Fragment>
            {beforeContent}
            {element}
            {afterContent}
          </React.Fragment>
        )
      }
      
      renderEnhancedElement()
    }, [enhancedProps, enhancedEventProps, transformedClassName, injectedStyles, mergedRef])
    
    // Return loading state while async operations complete
    if (!finalElement) {
      return React.createElement(WrappedComponent, {
        ...enhancedProps,
        ref: mergedRef
      })
    }
    
    return finalElement
  })
}

// Hook for accessing UI registry in components
export function useUIHooks() {
  return {
    register: uiRegistry.register.bind(uiRegistry),
    execute: uiRegistry.execute.bind(uiRegistry)
  }
}

// Common UI hook patterns
export function createUIHookPatterns() {
  // Debug overlay for development
  if (process.env.NODE_ENV === 'development') {
    uiRegistry.register('wrapComponent', (componentName, element, props) => {
      return (
        <div data-component={componentName} title={`Component: ${componentName}`}>
          {element}
        </div>
      )
    }, { priority: 1000 })
  }
  
  // Focus management
  uiRegistry.register('onComponentMount', (componentName, ref, props) => {
    if (props.autoFocus && ref && ref.focus) {
      setTimeout(() => ref.focus(), 0)
    }
  }, { components: ['Input', 'Textarea', 'Select'] })
  
  // Keyboard navigation
  uiRegistry.register('beforeEventHandler', (componentName, eventName, event) => {
    if (eventName === 'keydown' && event.key === 'Escape') {
      const activeElement = document.activeElement as HTMLElement
      if (activeElement && activeElement.blur) {
        activeElement.blur()
      }
    }
    return event
  })
  
  return uiRegistry
}