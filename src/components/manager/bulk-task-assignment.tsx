/**
 * Bulk Task Assignment Component
 * 
 * Allows managers to quickly assign multiple tasks to workers using filters:
 * - Filter by task type (sanding, assembly, qc, packaging)
 * - Filter by product/model name (Atticus, Aeon, etc.)
 * - Filter by wood type (cherry, walnut, etc.)
 * - Filter by material type
 * 
 * Works alongside the drag-and-drop interface to provide flexible assignment options.
 */

'use client'

import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/hooks/use-toast'
import { Users, Package, Wrench, CheckSquare, Archive, Filter, UserPlus, Info } from 'lucide-react'

interface Task {
  id: string
  task_type: string
  priority: 'low' | 'normal' | 'high' | 'urgent'
  order_item: {
    product_name: string
    variant_title?: string
    product_data?: {
      headphone_specs?: {
        wood_type?: string
        material?: string
        color?: string
        pad_type?: string
        cable_type?: string
        custom_engraving?: string
        product_category?: string
      }
    }
    order: {
      order_number: string
      customer_name: string
    }
  }
  assigned_to?: {
    name: string
    role: string
  }
}

interface Worker {
  id: string
  name: string
  role: string
  skills: string[]
}

interface BulkAssignmentFilters {
  taskType: string
  productName: string
  woodType: string
  material: string
}

interface BulkTaskAssignmentProps {
  tasks: Task[]
  workers: Worker[]
  filters: BulkAssignmentFilters
  onFiltersChange: (filters: BulkAssignmentFilters) => void
  onAssignmentComplete: () => void
}

const taskTypeIcons = {
  sanding: Wrench,
  assembly: Package,
  qc: CheckSquare,
  packaging: Archive
}

const taskTypeColors = {
  sanding: 'border-orange-300 text-orange-700 bg-orange-50',
  assembly: 'border-blue-300 text-blue-700 bg-blue-50',
  qc: 'border-green-300 text-green-700 bg-green-50',
  packaging: 'border-purple-300 text-purple-700 bg-purple-50'
}

export function BulkTaskAssignment({ tasks, workers, filters, onFiltersChange, onAssignmentComplete }: BulkTaskAssignmentProps) {
  
  const { toast } = useToast()
  const queryClient = useQueryClient()
  
  // Filter unassigned tasks
  const unassignedTasks = useMemo(() => 
    tasks.filter(task => !task.assigned_to),
    [tasks]
  )
  
  // Extract unique values for filter dropdowns
  const filterOptions = useMemo(() => {
    const taskTypes = [...new Set(unassignedTasks.map(t => t.task_type))]
    const productNames = [...new Set(unassignedTasks.map(t => t.order_item.product_name))]
    const woodTypes = [...new Set(unassignedTasks
      .map(t => t.order_item.product_data?.headphone_specs?.wood_type)
      .filter((wood): wood is string => Boolean(wood)))]
    const materials = [...new Set(unassignedTasks
      .map(t => t.order_item.product_data?.headphone_specs?.material)
      .filter((material): material is string => Boolean(material)))]
    
    return { taskTypes, productNames, woodTypes, materials }
  }, [unassignedTasks])
  
  // Apply filters to get matching tasks
  const filteredTasks = useMemo(() => {
    return unassignedTasks.filter(task => {
      const specs = task.order_item.product_data?.headphone_specs
      
      if (filters.taskType !== 'all' && task.task_type !== filters.taskType) return false
      if (filters.productName !== 'all' && !task.order_item.product_name.toLowerCase().includes(filters.productName.toLowerCase())) return false
      if (filters.woodType !== 'all' && specs?.wood_type !== filters.woodType) return false
      if (filters.material !== 'all' && specs?.material !== filters.material) return false
      
      return true
    })
  }, [unassignedTasks, filters])
  
  // Get worker list (active workers only)
  const activeWorkers = useMemo(() => 
    workers.filter(w => w.role === 'worker').slice(0, 5), // Limit to 5 workers for UI
    [workers]
  )
  
  const bulkAssignMutation = useMutation({
    mutationFn: async ({ workerId }: { workerId: string | null }) => {
      const response = await fetch('/api/tasks/assign-bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workerId,
          filters: {
            taskType: filters.taskType !== 'all' ? filters.taskType : undefined,
            productName: filters.productName !== 'all' ? filters.productName : undefined,
            woodType: filters.woodType !== 'all' ? filters.woodType : undefined,
            material: filters.material !== 'all' ? filters.material : undefined
          },
          assignmentMode: 'all'
        })
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to assign tasks')
      }
      return response.json()
    },
    onSuccess: (data) => {
      toast({
        title: 'Bulk assignment successful',
        description: `${data.tasksAssigned} tasks assigned successfully`
      })
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      onAssignmentComplete()
    },
    onError: (error: Error) => {
      toast({
        title: 'Assignment failed',
        description: error.message,
        variant: 'destructive'
      })
    }
  })
  
  const clearFilters = () => {
    onFiltersChange({
      taskType: 'all',
      productName: 'all',
      woodType: 'all',
      material: 'all'
    })
  }
  
  const hasActiveFilters = Object.values(filters).some(value => value !== 'all')
  
  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Filter className="h-5 w-5" />
          Bulk Task Assignment
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Filter and assign multiple tasks at once to speed up your workflow
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Usage Tip */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex gap-2">
            <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-800">
              <strong>Quick Tip:</strong> Use filters to select specific tasks, then click a worker button to assign all matching tasks at once. 
              Great for assigning all &quot;sanding&quot; tasks of a specific wood type, or all &quot;assembly&quot; tasks for a particular model.
            </div>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label htmlFor="task-type">Task Type</Label>
            <Select 
              value={filters.taskType} 
              onValueChange={(value) => onFiltersChange({ ...filters, taskType: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                {filterOptions.taskTypes.map(type => {
                  const Icon = taskTypeIcons[type as keyof typeof taskTypeIcons]
                  return (
                    <SelectItem key={type} value={type}>
                      <div className="flex items-center gap-2">
                        {Icon && <Icon className="h-4 w-4" />}
                        {type}
                      </div>
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="product-name">Product/Model</Label>
            <Select 
              value={filters.productName} 
              onValueChange={(value) => onFiltersChange({ ...filters, productName: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="All models" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All models</SelectItem>
                {filterOptions.productNames.map(name => (
                  <SelectItem key={name} value={name}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="wood-type">Wood Type</Label>
            <Select 
              value={filters.woodType} 
              onValueChange={(value) => onFiltersChange({ ...filters, woodType: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="All woods" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All woods</SelectItem>
                {filterOptions.woodTypes.map(wood => (
                  <SelectItem key={wood} value={wood}>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-amber-100 border border-amber-300"></div>
                      {wood}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="material">Material</Label>
            <Select 
              value={filters.material} 
              onValueChange={(value) => onFiltersChange({ ...filters, material: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="All materials" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All materials</SelectItem>
                {filterOptions.materials.map(material => (
                  <SelectItem key={material} value={material}>
                    {material}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        
        {/* Filter Summary */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="px-3 py-1">
              {filteredTasks.length} task{filteredTasks.length !== 1 ? 's' : ''} matching filters
            </Badge>
            {hasActiveFilters && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={clearFilters}
                className="text-muted-foreground hover:text-foreground"
              >
                Clear filters
              </Button>
            )}
          </div>
        </div>
        
        <Separator />
        
        {/* Quick Assignment Buttons */}
        {filteredTasks.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground">
              Quick assign {filteredTasks.length} task{filteredTasks.length !== 1 ? 's' : ''} to:
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {activeWorkers.map(worker => {
                const currentTaskCount = tasks.filter(t => t.assigned_to?.name === worker.name).length
                return (
                  <Button
                    key={worker.id}
                    variant="outline"
                    size="sm"
                    onClick={() => bulkAssignMutation.mutate({ workerId: worker.id })}
                    disabled={bulkAssignMutation.isPending}
                    className="justify-start gap-2 h-auto py-2"
                  >
                    <UserPlus className="h-4 w-4" />
                    <div className="text-left flex-1">
                      <div className="font-medium flex items-center justify-between">
                        {worker.name}
                        <Badge variant="secondary" className="ml-2 text-xs">
                          {currentTaskCount}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {worker.skills.slice(0, 2).join(', ')}
                        {worker.skills.length > 2 && ` +${worker.skills.length - 2}`}
                      </div>
                    </div>
                  </Button>
                )
              })}
              
              {/* Unassign all button */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => bulkAssignMutation.mutate({ workerId: null })}
                disabled={bulkAssignMutation.isPending}
                className="justify-start gap-2 h-auto py-2 border-red-200 text-red-700 hover:bg-red-50"
              >
                <Users className="h-4 w-4" />
                <div className="text-left">
                  <div className="font-medium">Unassign All</div>
                  <div className="text-xs text-muted-foreground">
                    Move back to pending
                  </div>
                </div>
              </Button>
            </div>
          </div>
        )}
        
        {filteredTasks.length === 0 && hasActiveFilters && (
          <div className="text-center py-6 text-muted-foreground">
            <Filter className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No tasks match the current filters</p>
            <Button variant="link" onClick={clearFilters} className="mt-2">
              Clear filters to see all tasks
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
} 