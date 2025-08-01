/**
 * Custom Hooks Abstraction
 * Reusable hooks for common data access patterns
 */

"use client"

import { useState, useEffect, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { departmentService, jobTemplateService, workCellService } from '@/lib/services'
import { queryKeys } from '@/lib/cache/manager'
import { useToast } from '@/hooks/use-toast'
import { Database } from '@/lib/database.types'

type Department = Database['public']['Tables']['departments']['Row']
type JobTemplate = Database['public']['Tables']['job_optimized_patterns']['Row']
type WorkCell = Database['public']['Tables']['work_cells']['Row']

interface UseDataListOptions {
  enabled?: boolean
  refetchOnWindowFocus?: boolean
  staleTime?: number
}

interface UseDataListResult<T> {
  data: T[] | undefined
  isLoading: boolean
  isError: boolean
  error: Error | null
  refetch: () => void
  isEmpty: boolean
}

// Generic hook for data lists
function useDataList<T>(
  queryKey: readonly unknown[],
  queryFn: () => Promise<{ success: boolean; data: T[] | null; error: string | null }>,
  options: UseDataListOptions = {}
): UseDataListResult<T> {
  const { toast } = useToast()

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      const response = await queryFn()
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch data')
      }
      return response.data || []
    },
    enabled: options.enabled !== false,
    refetchOnWindowFocus: options.refetchOnWindowFocus ?? false,
    staleTime: options.staleTime ?? 300000, // 5 minutes
    onError: (error: Error) => {
      console.error('Data fetch error:', error)
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      })
    }
  })

  return {
    data: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error as Error | null,
    refetch: query.refetch,
    isEmpty: query.data?.length === 0
  }
}

// Department hooks
export function useDepartments(activeOnly = true, options?: UseDataListOptions) {
  return useDataList<Department>(
    queryKeys.departments.list(activeOnly),
    () => departmentService.getAll(activeOnly),
    options
  )
}

export function useDepartment(id: string, options?: UseDataListOptions) {
  const { toast } = useToast()

  return useQuery({
    queryKey: queryKeys.departments.detail(id),
    queryFn: async () => {
      const response = await departmentService.getById(id)
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch department')
      }
      return response.data
    },
    enabled: !!id && options?.enabled !== false,
    staleTime: options?.staleTime ?? 300000,
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      })
    }
  })
}

// Job Template hooks
export function useJobTemplates(options?: UseDataListOptions) {
  return useDataList<JobTemplate>(
    queryKeys.jobTemplates.all,
    () => jobTemplateService.getAll(),
    options
  )
}

export function useJobTemplate(id: string, options?: UseDataListOptions) {
  const { toast } = useToast()

  return useQuery({
    queryKey: queryKeys.jobTemplates.detail(id),
    queryFn: async () => {
      const response = await jobTemplateService.getById(id)
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch job template')
      }
      return response.data
    },
    enabled: !!id && options?.enabled !== false,
    staleTime: options?.staleTime ?? 300000,
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      })
    }
  })
}

// Work Cell hooks
export function useWorkCells(options?: UseDataListOptions) {
  return useDataList<WorkCell>(
    queryKeys.workCells.all,
    () => workCellService.getAll(),
    options
  )
}

export function useWorkCell(id: string, options?: UseDataListOptions) {
  const { toast } = useToast()

  return useQuery({
    queryKey: queryKeys.workCells.detail(id),
    queryFn: async () => {
      const response = await workCellService.getById(id)
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch work cell')
      }
      return response.data
    },
    enabled: !!id && options?.enabled !== false,
    staleTime: options?.staleTime ?? 300000,
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      })
    }
  })
}

// Mutation hooks for CRUD operations
export function useCreateJobTemplate() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: (data: any) => jobTemplateService.create(data),
    onSuccess: (response) => {
      if (response.success) {
        queryClient.invalidateQueries({ queryKey: queryKeys.jobTemplates.all })
        toast({
          title: "Success",
          description: "Job template created successfully"
        })
      } else {
        throw new Error(response.error || 'Failed to create job template')
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      })
    }
  })
}

export function useUpdateJobTemplate() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => 
      jobTemplateService.update(id, data),
    onSuccess: (response, { id }) => {
      if (response.success) {
        queryClient.invalidateQueries({ queryKey: queryKeys.jobTemplates.all })
        queryClient.invalidateQueries({ queryKey: queryKeys.jobTemplates.detail(id) })
        toast({
          title: "Success",
          description: "Job template updated successfully"
        })
      } else {
        throw new Error(response.error || 'Failed to update job template')
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      })
    }
  })
}

export function useDeleteJobTemplate() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: (id: string) => jobTemplateService.delete(id),
    onSuccess: (response) => {
      if (response.success) {
        queryClient.invalidateQueries({ queryKey: queryKeys.jobTemplates.all })
        toast({
          title: "Success",
          description: "Job template deleted successfully"
        })
      } else {
        throw new Error(response.error || 'Failed to delete job template')
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      })
    }
  })
}

// Generic entity hooks factory
export function useEntity<T>(entityName: string) {
  const keys = queryKeys.entity(entityName)
  
  return {
    useList: (options?: UseDataListOptions) => 
      useDataList<T>(keys.all, async () => ({ success: true, data: [], error: null }), options),
    
    useDetail: (id: string, queryFn: (id: string) => Promise<any>, options?: UseDataListOptions) => {
      const { toast } = useToast()
      
      return useQuery({
        queryKey: keys.detail(id),
        queryFn: async () => {
          const response = await queryFn(id)
          if (!response.success) {
            throw new Error(response.error || `Failed to fetch ${entityName}`)
          }
          return response.data
        },
        enabled: !!id && options?.enabled !== false,
        staleTime: options?.staleTime ?? 300000,
        onError: (error: Error) => {
          toast({
            title: "Error",
            description: error.message,
            variant: "destructive"
          })
        }
      })
    }
  }
}

// Loading state aggregation hook
export function useLoadingStates(...queries: Array<{ isLoading: boolean }>) {
  return queries.some(query => query.isLoading)
}

// Error state aggregation hook
export function useErrorStates(...queries: Array<{ isError: boolean; error: Error | null }>) {
  const errors = queries.filter(query => query.isError).map(query => query.error)
  return {
    hasErrors: errors.length > 0,
    errors,
    firstError: errors[0]
  }
}

// Optimistic updates hook
export function useOptimisticUpdate<T>(
  queryKey: readonly unknown[],
  updateFn: (oldData: T[] | undefined, newItem: T) => T[]
) {
  const queryClient = useQueryClient()

  const applyOptimisticUpdate = useCallback((newItem: T) => {
    queryClient.setQueryData(queryKey, (oldData: T[] | undefined) => 
      updateFn(oldData, newItem)
    )
  }, [queryClient, queryKey, updateFn])

  const revertOptimisticUpdate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey })
  }, [queryClient, queryKey])

  return { applyOptimisticUpdate, revertOptimisticUpdate }
}

// Bulk operations hook
export function useBulkOperations<T>() {
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [isSelectionMode, setIsSelectionMode] = useState(false)

  const toggleSelection = useCallback((id: string) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }, [])

  const selectAll = useCallback((items: T[], getId: (item: T) => string) => {
    setSelectedItems(new Set(items.map(getId)))
  }, [])

  const clearSelection = useCallback(() => {
    setSelectedItems(new Set())
    setIsSelectionMode(false)
  }, [])

  const enterSelectionMode = useCallback(() => {
    setIsSelectionMode(true)
  }, [])

  return {
    selectedItems,
    isSelectionMode,
    selectedCount: selectedItems.size,
    toggleSelection,
    selectAll,
    clearSelection,
    enterSelectionMode,
    hasSelection: selectedItems.size > 0
  }
}