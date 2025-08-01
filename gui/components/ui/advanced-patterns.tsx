/**
 * Advanced UI Patterns
 * Drag-and-drop, bulk operations, advanced filtering components
 */

"use client"

import React, { useState, useCallback, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Search, 
  Filter, 
  X, 
  ChevronDown, 
  Check, 
  Trash2, 
  Edit, 
  Copy,
  Move,
  MoreHorizontal
} from 'lucide-react'
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { useBulkOperations } from '@/lib/hooks/custom-hooks'

// Advanced Filtering Component
interface FilterOption {
  key: string
  label: string
  type: 'text' | 'select' | 'date' | 'number' | 'boolean'
  options?: { value: string; label: string }[]
}

interface FilterValue {
  key: string
  value: any
  operator?: 'equals' | 'contains' | 'gt' | 'lt' | 'gte' | 'lte'
}

interface AdvancedFilterProps {
  options: FilterOption[]
  values: FilterValue[]
  onChange: (filters: FilterValue[]) => void
  placeholder?: string
}

export function AdvancedFilter({ options, values, onChange, placeholder }: AdvancedFilterProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  const addFilter = useCallback((option: FilterOption) => {
    const newFilter: FilterValue = {
      key: option.key,
      value: option.type === 'boolean' ? false : '',
      operator: option.type === 'text' ? 'contains' : 'equals'
    }
    onChange([...values, newFilter])
  }, [values, onChange])

  const updateFilter = useCallback((index: number, updates: Partial<FilterValue>) => {
    const newValues = [...values]
    newValues[index] = { ...newValues[index], ...updates }
    onChange(newValues)
  }, [values, onChange])

  const removeFilter = useCallback((index: number) => {
    onChange(values.filter((_, i) => i !== index))
  }, [values, onChange])

  const availableOptions = useMemo(() => {
    const usedKeys = new Set(values.map(v => v.key))
    return options.filter(option => !usedKeys.has(option.key))
  }, [options, values])

  const filteredOptions = useMemo(() => {
    if (!searchTerm) return availableOptions
    return availableOptions.filter(option =>
      option.label.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [availableOptions, searchTerm])

  return (
    <div className="space-y-3">
      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder={placeholder || "Search..."}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
        />
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="absolute right-2 top-1/2 -translate-y-1/2"
        >
          <Filter className="h-4 w-4 mr-1" />
          Filters
          <ChevronDown className={cn("h-4 w-4 ml-1 transition-transform", isExpanded && "rotate-180")} />
        </Button>
      </div>

      {/* Active filters */}
      {values.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {values.map((filter, index) => {
            const option = options.find(o => o.key === filter.key)
            return (
              <Badge key={index} variant="secondary" className="flex items-center gap-1">
                {option?.label}: {String(filter.value)}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeFilter(index)}
                  className="h-4 w-4 p-0 hover:bg-transparent"
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            )
          })}
        </div>
      )}

      {/* Filter builder */}
      {isExpanded && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Add Filters</CardTitle>
            <CardDescription>Click on any filter to add it</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Available filter options */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {filteredOptions.map((option) => (
                <Button
                  key={option.key}
                  variant="outline"
                  size="sm"
                  onClick={() => addFilter(option)}
                  className="justify-start text-left"
                >
                  {option.label}
                </Button>
              ))}
            </div>

            {/* Active filter configuration */}
            {values.map((filter, index) => {
              const option = options.find(o => o.key === filter.key)
              if (!option) return null

              return (
                <div key={index} className="flex items-center gap-2 p-2 border rounded">
                  <Label className="min-w-0 flex-shrink-0">{option.label}</Label>
                  
                  {option.type === 'select' && (
                    <Select
                      value={filter.value}
                      onValueChange={(value) => updateFilter(index, { value })}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {option.options?.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  {option.type === 'text' && (
                    <>
                      <Select
                        value={filter.operator || 'contains'}
                        onValueChange={(operator) => updateFilter(index, { operator: operator as any })}
                      >
                        <SelectTrigger className="w-24">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="contains">Contains</SelectItem>
                          <SelectItem value="equals">Equals</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        value={filter.value}
                        onChange={(e) => updateFilter(index, { value: e.target.value })}
                        className="flex-1"
                      />
                    </>
                  )}

                  {option.type === 'number' && (
                    <>
                      <Select
                        value={filter.operator || 'equals'}
                        onValueChange={(operator) => updateFilter(index, { operator: operator as any })}
                      >
                        <SelectTrigger className="w-20">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="equals">=</SelectItem>
                          <SelectItem value="gt">&gt;</SelectItem>
                          <SelectItem value="gte">≥</SelectItem>
                          <SelectItem value="lt">&lt;</SelectItem>
                          <SelectItem value="lte">≤</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        type="number"
                        value={filter.value}
                        onChange={(e) => updateFilter(index, { value: Number(e.target.value) })}
                        className="w-24"
                      />
                    </>
                  )}

                  {option.type === 'boolean' && (
                    <Checkbox
                      checked={filter.value}
                      onCheckedChange={(value) => updateFilter(index, { value })}
                    />
                  )}

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFilter(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// Bulk Operations Component
interface BulkOperationsProps<T> {
  items: T[]
  selectedItems: Set<string>
  onToggleSelection: (id: string) => void
  onSelectAll: () => void
  onClearSelection: () => void
  onBulkDelete?: (ids: string[]) => void
  onBulkEdit?: (ids: string[]) => void
  onBulkCopy?: (ids: string[]) => void
  onBulkMove?: (ids: string[]) => void
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
  onBulkCopy,
  onBulkMove,
  getId,
  isSelectionMode,
  onEnterSelectionMode
}: BulkOperationsProps<T>) {
  const selectedCount = selectedItems.size
  const allSelected = items.length > 0 && selectedItems.size === items.length

  if (!isSelectionMode) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={onEnterSelectionMode}
        className="flex items-center gap-2"
      >
        <Check className="h-4 w-4" />
        Select Items
      </Button>
    )
  }

  return (
    <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
      <Checkbox
        checked={allSelected}
        onCheckedChange={allSelected ? onClearSelection : onSelectAll}
      />
      <span className="text-sm font-medium">
        {selectedCount} of {items.length} selected
      </span>

      {selectedCount > 0 && (
        <>
          <div className="h-4 w-px bg-border mx-2" />
          
          <div className="flex items-center gap-1">
            {onBulkEdit && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onBulkEdit(Array.from(selectedItems))}
              >
                <Edit className="h-4 w-4 mr-1" />
                Edit
              </Button>
            )}

            {onBulkCopy && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onBulkCopy(Array.from(selectedItems))}
              >
                <Copy className="h-4 w-4 mr-1" />
                Copy
              </Button>
            )}

            {onBulkMove && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onBulkMove(Array.from(selectedItems))}
              >
                <Move className="h-4 w-4 mr-1" />
                Move
              </Button>
            )}

            {onBulkDelete && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onBulkDelete(Array.from(selectedItems))}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete
              </Button>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onSelectAll}>
                  Select All
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onClearSelection}>
                  Clear Selection
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => console.log('Export selected')}>
                  Export Selected
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </>
      )}

      <div className="ml-auto">
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearSelection}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

// Draggable Item Component (basic implementation without external drag library)
interface DraggableItemProps {
  children: React.ReactNode
  onDragStart?: (event: React.DragEvent) => void
  onDragEnd?: (event: React.DragEvent) => void
  draggable?: boolean
  className?: string
}

export function DraggableItem({ 
  children, 
  onDragStart, 
  onDragEnd, 
  draggable = true, 
  className 
}: DraggableItemProps) {
  return (
    <div
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={cn(
        "cursor-move transition-opacity",
        draggable && "hover:opacity-75",
        className
      )}
    >
      {children}
    </div>
  )
}

// Drop Zone Component
interface DropZoneProps {
  onDrop: (event: React.DragEvent) => void
  onDragOver?: (event: React.DragEvent) => void
  onDragEnter?: (event: React.DragEvent) => void
  onDragLeave?: (event: React.DragEvent) => void
  children: React.ReactNode
  className?: string
  activeClassName?: string
}

export function DropZone({
  onDrop,
  onDragOver,
  onDragEnter,
  onDragLeave,
  children,
  className,
  activeClassName
}: DropZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false)

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault()
    onDragOver?.(event)
  }

  const handleDragEnter = (event: React.DragEvent) => {
    event.preventDefault()
    setIsDragOver(true)
    onDragEnter?.(event)
  }

  const handleDragLeave = (event: React.DragEvent) => {
    event.preventDefault()
    setIsDragOver(false)
    onDragLeave?.(event)
  }

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault()
    setIsDragOver(false)
    onDrop(event)
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        className,
        isDragOver && activeClassName
      )}
    >
      {children}
    </div>
  )
}

// Combined hook for advanced table functionality
export function useAdvancedTable<T>(
  items: T[],
  getId: (item: T) => string,
  options: {
    enableFiltering?: boolean
    enableBulkOperations?: boolean
    enableSorting?: boolean
  } = {}
) {
  const [searchTerm, setSearchTerm] = useState('')
  const [filters, setFilters] = useState<FilterValue[]>([])
  const [sortBy, setSortBy] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

  const bulk = useBulkOperations<T>()

  // Apply filters and search
  const filteredItems = useMemo(() => {
    let result = items

    // Apply search
    if (searchTerm && options.enableFiltering) {
      result = result.filter(item => {
        const searchable = Object.values(item as any)
          .join(' ')
          .toLowerCase()
        return searchable.includes(searchTerm.toLowerCase())
      })
    }

    // Apply filters
    if (options.enableFiltering) {
      result = result.filter(item => {
        return filters.every(filter => {
          const value = (item as any)[filter.key]
          const filterValue = filter.value

          switch (filter.operator) {
            case 'contains':
              return String(value).toLowerCase().includes(String(filterValue).toLowerCase())
            case 'equals':
              return value === filterValue
            case 'gt':
              return Number(value) > Number(filterValue)
            case 'gte':
              return Number(value) >= Number(filterValue)
            case 'lt':
              return Number(value) < Number(filterValue)
            case 'lte':
              return Number(value) <= Number(filterValue)
            default:
              return true
          }
        })
      })
    }

    // Apply sorting
    if (sortBy && options.enableSorting) {
      result.sort((a, b) => {
        const aValue = (a as any)[sortBy]
        const bValue = (b as any)[sortBy]
        
        let comparison = 0
        if (aValue > bValue) comparison = 1
        if (aValue < bValue) comparison = -1
        
        return sortDirection === 'desc' ? -comparison : comparison
      })
    }

    return result
  }, [items, searchTerm, filters, sortBy, sortDirection, options])

  return {
    // Data
    filteredItems,
    
    // Search and filter
    searchTerm,
    setSearchTerm,
    filters,
    setFilters,
    
    // Sorting
    sortBy,
    setSortBy,
    sortDirection,
    setSortDirection,
    
    // Bulk operations
    ...bulk,
    
    // Utilities
    isEmpty: filteredItems.length === 0,
    totalCount: items.length,
    filteredCount: filteredItems.length
  }
}