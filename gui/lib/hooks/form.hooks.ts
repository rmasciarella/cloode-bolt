// Form Lifecycle Hooks following Inventor Black's patterns

import { UseFormReturn } from 'react-hook-form'
import { z } from 'zod'

export interface FormHooks<T = any> {
  // Validation hooks
  beforeValidation: (data: T) => T | Promise<T>
  afterValidation: (data: T, errors: any) => void
  customValidation: (data: T) => Record<string, string> | Promise<Record<string, string>>
  
  // Submission lifecycle hooks
  beforeSubmit: (data: T, isEditing: boolean) => boolean | Promise<boolean>
  transformSubmitData: (data: T, isEditing: boolean) => T | Promise<T>
  afterSubmitSuccess: (data: T, result: any, isEditing: boolean) => void
  afterSubmitError: (data: T, error: any, isEditing: boolean) => void
  
  // CRUD operation hooks
  beforeCreate: (data: T) => T | Promise<T>
  afterCreate: (data: T, result: any) => void
  beforeUpdate: (id: string, data: T) => T | Promise<T>
  afterUpdate: (id: string, data: T, result: any) => void
  beforeDelete: (id: string, record: any) => boolean | Promise<boolean>
  afterDelete: (id: string, record: any) => void
  
  // Data loading hooks
  beforeDataLoad: (filters?: any) => any | Promise<any>
  transformLoadedData: (data: any[]) => any[] | Promise<any[]>
  afterDataLoad: (data: any[]) => void
  
  // UI interaction hooks
  beforeEdit: (record: any) => boolean | Promise<boolean>
  afterEdit: (record: any, form: UseFormReturn<T>) => void
  beforeCancel: () => boolean | Promise<boolean>
  afterCancel: () => void
}

type FormHookHandler<T, K extends keyof FormHooks<T>> = FormHooks<T>[K]

export class FormHookRegistry<T = any> {
  private hooks: Map<keyof FormHooks<T>, Array<{ handler: FormHookHandler<T, any>, priority: number }>> = new Map()
  
  register<K extends keyof FormHooks<T>>(
    hookName: K,
    handler: FormHookHandler<T, K>,
    priority: number = 10
  ): () => void {
    if (!this.hooks.has(hookName)) {
      this.hooks.set(hookName, [])
    }
    
    const handlers = this.hooks.get(hookName)!
    handlers.push({ handler, priority })
    handlers.sort((a, b) => a.priority - b.priority)
    
    return () => {
      const index = handlers.findIndex(h => h.handler === handler)
      if (index > -1) handlers.splice(index, 1)
    }
  }
  
  async execute<K extends keyof FormHooks<T>>(
    hookName: K,
    ...args: Parameters<FormHookHandler<T, K>>
  ): Promise<any> {
    const handlers = this.hooks.get(hookName) || []
    
    // Data transformation hooks (chain transformations)
    if (['beforeValidation', 'transformSubmitData', 'beforeCreate', 'beforeUpdate', 'transformLoadedData'].includes(hookName as string)) {
      return handlers.reduce(async (result, { handler }) => {
        const data = await result
        return handler(data, ...args.slice(1))
      }, Promise.resolve(args[0]))
    }
    
    // Validation hooks (merge results)
    if (hookName === 'customValidation') {
      const results = await Promise.all(handlers.map(({ handler }) => handler(...args)))
      return results.reduce((merged, result) => ({ ...merged, ...result }), {})
    }
    
    // Guard hooks (all must return true)
    if (['beforeSubmit', 'beforeDelete', 'beforeEdit', 'beforeCancel'].includes(hookName as string)) {
      for (const { handler } of handlers) {
        const result = await handler(...args)
        if (result === false) return false
      }
      return true
    }
    
    // Data loading filter hooks
    if (hookName === 'beforeDataLoad') {
      return handlers.reduce(async (result, { handler }) => {
        const filters = await result
        return handler(filters)
      }, Promise.resolve(args[0] || {}))
    }
    
    // Notification hooks (fire all)
    await Promise.all(handlers.map(({ handler }) => handler(...args)))
  }
}

// Enhanced form hook with built-in CRUD patterns
export function useFormHooks<T>(entityName: string, schema?: z.ZodSchema<T>) {
  const registry = new FormHookRegistry<T>()
  
  // Built-in audit logging hook
  registry.register('afterCreate', (data, result) => {
    console.log(`${entityName} created:`, { data, result })
  }, 1)
  
  registry.register('afterUpdate', (id, data, result) => {
    console.log(`${entityName} updated:`, { id, data, result })
  }, 1)
  
  registry.register('afterDelete', (id, record) => {
    console.log(`${entityName} deleted:`, { id, record })
  }, 1)
  
  // Built-in schema validation hook if provided
  if (schema) {
    registry.register('customValidation', async (data) => {
      try {
        schema.parse(data)
        return {}
      } catch (error) {
        if (error instanceof z.ZodError) {
          return error.errors.reduce((acc, err) => {
            const field = err.path.join('.')
            acc[field] = err.message
            return acc
          }, {} as Record<string, string>)
        }
        return { _root: 'Validation failed' }
      }
    }, 1)
  }
  
  return {
    register: registry.register.bind(registry),
    execute: registry.execute.bind(registry)
  }
}

// Hook factory for common form patterns
export function createFormHooks<T>(config: {
  entityName: string
  schema?: z.ZodSchema<T>
  auditLog?: boolean
  autoSave?: boolean
  optimisticUpdates?: boolean
}) {
  // Create hooks instance without using React hook
  const registry = new FormHookRegistry<T>()
  
  // Set up schema validation if provided
  if (config.schema) {
    registry.register('customValidation', async (data) => {
      try {
        config.schema!.parse(data)
        return {}
      } catch (error) {
        if (error instanceof z.ZodError) {
          return error.errors.reduce((acc, err) => {
            const field = err.path.join('.')
            acc[field] = err.message
            return acc
          }, {} as Record<string, string>)
        }
        return { _root: 'Validation failed' }
      }
    }, 1)
  }
  
  const hooks = {
    register: registry.register.bind(registry),
    execute: registry.execute.bind(registry)
  }
  
  if (config.optimisticUpdates) {
    hooks.register('beforeSubmit', async (data, isEditing) => {
      // Apply optimistic update to UI
      console.log('Applying optimistic update for', config.entityName)
      return true
    }, 5)
  }
  
  if (config.autoSave) {
    let autoSaveTimeout: NodeJS.Timeout
    hooks.register('afterValidation', (data, errors) => {
      if (Object.keys(errors).length === 0) {
        clearTimeout(autoSaveTimeout)
        autoSaveTimeout = setTimeout(() => {
          console.log('Auto-saving', config.entityName, data)
        }, 2000)
      }
    })
  }
  
  return hooks
}