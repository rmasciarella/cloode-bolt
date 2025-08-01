"use client"

import React, { useState, useCallback, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Search, Filter, Check, X, Edit, Trash2 } from 'lucide-react'

// Advanced table hook
export function useAdvancedTable<T>(
  items: T[],
  getItemId: (item: T) => string,
  options: {
    enableFiltering?: boolean
    enableBulkOperations?: boolean
    enableSorting?: boolean
  } = {}
) {
  const [filters, setFilters] = useState<Record<string, any>>({})
  const [sortBy, setSortBy] = useState<string>('')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [isSelectionMode, setIsSelectionMode] = useState(false)

  // Filter items
  const filteredItems = useMemo(() => {
    let filtered = [...items]

    if (options.enableFiltering) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '' && value !== null) {
          filtered = filtered.filter(item => {
            const itemValue = (item as any)[key]
            
            if (typeof value === 'boolean') {
              return itemValue === value
            } else if (typeof value === 'string') {
              return String(itemValue).toLowerCase().includes(value.toLowerCase())
            } else if (typeof value === 'number') {
              return itemValue === value
            }
            
            return true
          })
        }
      })
    }

    // Apply sorting
    if (options.enableSorting && sortBy) {
      filtered.sort((a, b) => {
        const aValue = (a as any)[sortBy]
        const bValue = (b as any)[sortBy]
        
        let comparison = 0
        if (aValue < bValue) comparison = -1
        else if (aValue > bValue) comparison = 1
        
        return sortDirection === 'desc' ? -comparison : comparison
      })
    }

    return filtered
  }, [items, filters, sortBy, sortDirection, options.enableFiltering, options.enableSorting])

  // Selection functions
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

  const selectAll = useCallback((itemsToSelect?: T[], getIdFn?: (item: T) => string) => {
    const targetItems = itemsToSelect || filteredItems
    const idFunction = getIdFn || getItemId
    const allIds = targetItems.map(idFunction)
    setSelectedItems(new Set(allIds))
  }, [filteredItems, getItemId])

  const clearSelection = useCallback(() => {
    setSelectedItems(new Set())
  }, [])

  const enterSelectionMode = useCallback(() => {
    setIsSelectionMode(true)
  }, [])

  const exitSelectionMode = useCallback(() => {
    setIsSelectionMode(false)
    clearSelection()
  }, [clearSelection])

  return {
    // Data
    filteredItems,
    totalCount: items.length,
    filteredCount: filteredItems.length,
    isEmpty: filteredItems.length === 0,
    
    // Filtering
    filters,
    setFilters,
    
    // Sorting
    sortBy,
    setSortBy,
    sortDirection,
    setSortDirection,
    
    // Selection
    selectedItems,
    isSelectionMode,
    toggleSelection,
    selectAll,
    clearSelection,
    enterSelectionMode,
    exitSelectionMode
  }
}

// Filter options interface
interface FilterOption {
  key: string
  label: string
  type: 'text' | 'select' | 'boolean' | 'number'
  options?: { value: string; label: string }[]
}

interface AdvancedFilterProps {
  options: FilterOption[]
  values: Record<string, any>
  onChange: (filters: Record<string, any>) => void
  placeholder?: string
}

export function AdvancedFilter({ options, values, onChange, placeholder }: AdvancedFilterProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  const handleFilterChange = useCallback((key: string, value: any) => {
    onChange({
      ...values,
      [key]: value
    })
  }, [values, onChange])

  const clearAllFilters = useCallback(() => {
    onChange({})
    setSearchTerm('')
  }, [onChange])

  const activeFilterCount = Object.values(values).filter(v => v !== undefined && v !== '' && v !== null).length

  return (
    <div className="space-y-4">
      {/* Quick search */}
      <div className="flex items-center space-x-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder={placeholder || "Search..."}
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value)
              if (options.length > 0) {
                handleFilterChange(options[0].key, e.target.value)
              }
            }}
            className="pl-10"
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center space-x-2"
        >
          <Filter className="h-4 w-4" />
          <span>Filters</span>
          {activeFilterCount > 0 && (
            <Badge variant="secondary" className="ml-1">
              {activeFilterCount}
            </Badge>
          )}
        </Button>
        {activeFilterCount > 0 && (
          <Button variant="ghost" size="sm" onClick={clearAllFilters}>
            Clear
          </Button>
        )}
      </div>

      {/* Advanced filters */}
      {isExpanded && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 border rounded-lg bg-gray-50">
          {options.slice(1).map((option) => (
            <div key={option.key} className="space-y-2">
              <Label htmlFor={option.key}>{option.label}</Label>
              
              {option.type === 'text' && (
                <Input
                  id={option.key}
                  value={values[option.key] || ''}
                  onChange={(e) => handleFilterChange(option.key, e.target.value)}
                  placeholder={`Filter by ${option.label.toLowerCase()}`}
                />
              )}
              
              {option.type === 'select' && option.options && (
                <Select 
                  value={values[option.key] || ''} 
                  onValueChange={(value) => handleFilterChange(option.key, value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={`Select ${option.label.toLowerCase()}`} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All</SelectItem>
                    {option.options.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              
              {option.type === 'boolean' && (
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id={option.key}
                    checked={values[option.key] === true}
                    onCheckedChange={(checked) => 
                      handleFilterChange(option.key, checked ? true : undefined)
                    }
                  />
                  <Label htmlFor={option.key}>Show only active</Label>
                </div>
              )}
              
              {option.type === 'number' && (
                <Input
                  id={option.key}
                  type="number"
                  value={values[option.key] || ''}
                  onChange={(e) => handleFilterChange(option.key, parseFloat(e.target.value) || undefined)}
                  placeholder={`Filter by ${option.label.toLowerCase()}`}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

interface BulkOperationsProps<T> {
  items: T[]
  selectedItems: Set<string>
  onToggleSelection: (id: string) => void
  onSelectAll: () => void
  onClearSelection: () => void
  onBulkDelete: (ids: string[]) => void
  onBulkEdit: (ids: string[]) => void
  getId: (item: T) => string
  isSelectionMode: boolean
  onEnterSelectionMode: () => void
}

export function BulkOperations<T>({
  items,
  selectedItems,
  onToggleSelection,
  onSelectAll,
  onClearSelection,
  onBulkDelete,
  onBulkEdit,
  getId,
  isSelectionMode,
  onEnterSelectionMode
}: BulkOperationsProps<T>) {
  const selectedCount = selectedItems.size

  if (!isSelectionMode) {
    return (
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-500">
          {items.length} item{items.length !== 1 ? 's' : ''}
        </div>
        <Button variant="outline" size="sm" onClick={onEnterSelectionMode}>
          Select Items
        </Button>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
      <div className="flex items-center space-x-4">
        <div className="text-sm font-medium text-blue-900">
          {selectedCount} item{selectedCount !== 1 ? 's' : ''} selected
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="sm" onClick={onSelectAll}>
            Select All
          </Button>
          <Button variant="ghost" size="sm" onClick={onClearSelection}>
            Clear
          </Button>
        </div>
      </div>
      
      {selectedCount > 0 && (
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onBulkEdit(Array.from(selectedItems))}
            className="flex items-center space-x-1"
          >
            <Edit className="h-4 w-4" />
            <span>Edit</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onBulkDelete(Array.from(selectedItems))}
            className="flex items-center space-x-1 text-red-600 hover:text-red-700"
          >
            <Trash2 className="h-4 w-4" />
            <span>Delete</span>
          </Button>
        </div>
      )}
    </div>
  )
}