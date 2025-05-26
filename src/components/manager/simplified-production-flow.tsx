/**
 * Simplified Production Flow Component
 * 
 * A clean, intuitive batch management interface inspired by the successful
 * task assignment patterns. Focuses on core functionality:
 * - Simple kanban board for batch stages
 * - Easy batch creation from orders
 * - Integration with task management
 * - Clear visual progress tracking
 */

'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { 
  Package, 
  Plus, 
  RefreshCw, 
  Clock, 
  Users,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  Eye,
  Settings,
  Zap
} from 'lucide-react'

interface Batch {
  id: string
  name: string
  batch_type: string
  order_item_ids: string[]
  current_stage: string | null
  status: 'pending' | 'active' | 'completed' | 'on_hold'
  created_at: string
  updated_at: string
  workflow_template?: {
    id: string
    name: string
  }
  order_items?: {
    id: string
    product_name: string
    quantity: number
    orders: {
      order_number: string
      customer_name: string
    }
  }[]
  _stats?: {
    total_items: number
    active_tasks: number
    completed_tasks: number
    time_in_stage: number
  }
}

interface StageColumn {
  id: string
  name: string
  stage_code: string
  batches: Batch[]
  color: string
  automation_type?: 'automated' | 'manual'
}

interface SimplifiedProductionFlowProps {
  refreshInterval?: number
}

export function SimplifiedProductionFlow({ refreshInterval = 30000 }: SimplifiedProductionFlowProps) {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  
  // State
  const [isDragging, setIsDragging] = useState(false)
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null)
  const [showBatchDetails, setShowBatchDetails] = useState(false)
  const [showCreateBatch, setShowCreateBatch] = useState(false)
  const [selectedWorkflow, setSelectedWorkflow] = useState<string>('all')

  // Fetch batches
  const { data: batchesData, isLoading: batchesLoading } = useQuery({
    queryKey: ['production-batches'],
    queryFn: async () => {
      const response = await fetch('/api/batches')
      if (!response.ok) throw new Error('Failed to fetch batches')
      return response.json()
    },
    refetchInterval: isDragging ? false : refreshInterval
  })

  // Fetch workflows for filtering
  const { data: workflows } = useQuery({
    queryKey: ['workflows'],
    queryFn: async () => {
      const response = await fetch('/api/workflows')
      if (!response.ok) throw new Error('Failed to fetch workflows')
      const data = await response.json()
      return data.filter((w: any) => w.is_active)
    }
  })

  // Enhance batches with statistics
  const enhancedBatches = useMemo(() => {
    if (!batchesData) return []
    
    return batchesData.map((batch: Batch) => ({
      ...batch,
      _stats: {
        total_items: batch.order_item_ids?.length || 0,
        active_tasks: 0, // We'll calculate this from tasks API if needed
        completed_tasks: 0,
        time_in_stage: 0 // We'll calculate this from time logs if needed
      }
    }))
  }, [batchesData])

  // Filter batches by workflow if selected
  const filteredBatches = useMemo(() => {
    if (selectedWorkflow === 'all') return enhancedBatches
    return enhancedBatches.filter((batch: Batch) => 
      batch.workflow_template?.id === selectedWorkflow
    )
  }, [enhancedBatches, selectedWorkflow])

  // Define stage columns with proper workflow stages
  const stageColumns: StageColumn[] = useMemo(() => {
    const stages = [
      { id: 'pending', name: 'Pending', stage_code: 'pending', color: 'bg-gray-100', automation_type: 'manual' as const },
      { id: 'sanding', name: 'Sanding', stage_code: 'sanding', color: 'bg-blue-100', automation_type: 'automated' as const },
      { id: 'assembly', name: 'Assembly', stage_code: 'assembly', color: 'bg-yellow-100', automation_type: 'manual' as const },
      { id: 'qc', name: 'Quality Control', stage_code: 'qc', color: 'bg-purple-100', automation_type: 'automated' as const },
      { id: 'packaging', name: 'Packaging', stage_code: 'packaging', color: 'bg-green-100', automation_type: 'automated' as const },
      { id: 'completed', name: 'Completed', stage_code: 'completed', color: 'bg-emerald-100', automation_type: 'manual' as const }
    ]

    return stages.map(stage => ({
      ...stage,
      batches: filteredBatches.filter((batch: Batch) => {
        if (stage.stage_code === 'pending') return !batch.current_stage
        if (stage.stage_code === 'completed') return batch.status === 'completed'
        return batch.current_stage === stage.stage_code
      })
    }))
  }, [filteredBatches])

  // Move batch mutation
  const moveBatchMutation = useMutation({
    mutationFn: async ({ batchId, newStage }: { batchId: string; newStage: string }) => {
      const response = await fetch(`/api/batches/${batchId}/transition`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to_stage: newStage === 'pending' ? null : newStage,
          transition_type: 'manual',
          notes: `Moved to ${newStage} via production flow board`
        })
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to move batch')
      }
      
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['production-batches'] })
      toast({
        title: 'Batch moved successfully',
        description: 'The batch has been moved to the new stage',
      })
    },
    onError: (error) => {
      toast({
        title: 'Failed to move batch',
        description: error.message,
        variant: 'destructive'
      })
    }
  })

  // Handle drag and drop
  const handleDragStart = useCallback(() => {
    setIsDragging(true)
  }, [])

  const handleDragEnd = useCallback(async (result: DropResult) => {
    setIsDragging(false)
    
    if (!result.destination) return
    
    const { source, destination, draggableId } = result
    
    // Don't do anything if dropped in the same column
    if (source.droppableId === destination.droppableId) return
    
    const batchId = draggableId
    const newStage = destination.droppableId
    
    // Optimistically update the UI
    queryClient.setQueryData(['production-batches'], (old: any) => {
      if (!old) return old
      return old.map((batch: Batch) => {
        if (batch.id === batchId) {
          return {
            ...batch,
            current_stage: newStage === 'pending' ? null : newStage,
            status: newStage === 'completed' ? 'completed' : batch.status
          }
        }
        return batch
      })
    })
    
    // Make the API call
    try {
      await moveBatchMutation.mutateAsync({ batchId, newStage })
    } catch (error) {
      // Revert the optimistic update on error
      queryClient.invalidateQueries({ queryKey: ['production-batches'] })
    }
  }, [moveBatchMutation, queryClient])

  // Calculate overall statistics
  const overallStats = useMemo(() => {
    const activeBatches = filteredBatches.filter((b: Batch) => b.status === 'active').length
    const completedToday = filteredBatches.filter((b: Batch) => 
      b.status === 'completed' && 
      new Date(b.updated_at).toDateString() === new Date().toDateString()
    ).length
    const bottlenecks = stageColumns.filter(stage => stage.batches.length > 5).length
    const totalItems = filteredBatches.reduce((sum: number, b: Batch) => sum + (b._stats?.total_items || 0), 0)

    return {
      activeBatches,
      completedToday,
      bottlenecks,
      totalItems
    }
  }, [filteredBatches, stageColumns])

  if (batchesLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center space-x-2">
          <RefreshCw className="h-5 w-5 animate-spin" />
          <span>Loading production flow...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with Controls */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Production Flow</h2>
          <p className="text-gray-600">Manage batch workflow and track production progress</p>
        </div>
        
        <div className="flex items-center space-x-4">
          <Select value={selectedWorkflow} onValueChange={setSelectedWorkflow}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by workflow" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Workflows</SelectItem>
              {workflows?.map((workflow: any) => (
                <SelectItem key={workflow.id} value={workflow.id}>
                  {workflow.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Button onClick={() => setShowCreateBatch(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Batch
          </Button>
          
          <Button 
            variant="outline" 
            onClick={() => queryClient.invalidateQueries({ queryKey: ['production-batches'] })}
            disabled={moveBatchMutation.isPending}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${moveBatchMutation.isPending ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Overall Statistics */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Package className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">Active Batches</p>
                <p className="text-2xl font-bold">{overallStats.activeBatches}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">Completed Today</p>
                <p className="text-2xl font-bold">{overallStats.completedToday}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-sm text-gray-600">Bottlenecks</p>
                <p className="text-2xl font-bold">{overallStats.bottlenecks}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-sm text-gray-600">Total Items</p>
                <p className="text-2xl font-bold">{overallStats.totalItems}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Production Flow Board */}
      <DragDropContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex items-center space-x-4 mb-4">
          <ArrowRight className="h-5 w-5 text-gray-400" />
          <span className="text-sm text-gray-600">Drag batches to move them through the production workflow</span>
        </div>
        
        <div className="grid grid-cols-6 gap-4">
          {stageColumns.map((stage) => (
            <Card key={stage.id} className="h-fit">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-2">
                    <span>{stage.name}</span>
                    {stage.automation_type === 'automated' && (
                      <Zap className="h-3 w-3 text-blue-600" />
                    )}
                  </div>
                  <Badge 
                    variant={stage.batches.length > 5 ? 'destructive' : 'secondary'}
                    className="text-xs"
                  >
                    {stage.batches.length}
                  </Badge>
                </CardTitle>
              </CardHeader>

              <Droppable droppableId={stage.stage_code}>
                {(provided, snapshot) => (
                  <CardContent
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`space-y-2 min-h-96 ${
                      snapshot.isDraggingOver ? 'bg-blue-50' : ''
                    }`}
                  >
                    {stage.batches.length === 0 ? (
                      <div className="text-center text-gray-400 py-8">
                        <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No batches</p>
                      </div>
                    ) : (
                      stage.batches.map((batch, index) => (
                        <Draggable key={batch.id} draggableId={batch.id} index={index}>
                          {(provided, snapshot) => (
                            <Card
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`cursor-move transition-transform ${
                                snapshot.isDragging ? 'rotate-1 shadow-lg scale-105' : 'hover:shadow-md'
                              }`}
                              onClick={() => {
                                if (!snapshot.isDragging) {
                                  setSelectedBatch(batch)
                                  setShowBatchDetails(true)
                                }
                              }}
                            >
                              <CardContent className="p-3">
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <h4 className="font-medium text-sm truncate">{batch.name}</h4>
                                    <Badge 
                                      variant={batch.status === 'active' ? 'default' : 'secondary'}
                                      className="text-xs"
                                    >
                                      {batch.status}
                                    </Badge>
                                  </div>
                                  
                                  <div className="text-xs text-gray-600">
                                    <div className="flex items-center justify-between">
                                      <span>{batch._stats?.total_items || 0} items</span>
                                      <span className="capitalize">{batch.batch_type}</span>
                                    </div>
                                  </div>

                                  {batch.workflow_template && (
                                    <div className="text-xs text-blue-600">
                                      {batch.workflow_template.name}
                                    </div>
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          )}
                        </Draggable>
                      ))
                    )}
                    {provided.placeholder}
                  </CardContent>
                )}
              </Droppable>
            </Card>
          ))}
        </div>
      </DragDropContext>

      {/* Batch Details Dialog */}
      <Dialog open={showBatchDetails} onOpenChange={setShowBatchDetails}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Batch Details: {selectedBatch?.name}</DialogTitle>
          </DialogHeader>
          
          {selectedBatch && (
            <BatchDetailsView batch={selectedBatch} />
          )}
        </DialogContent>
      </Dialog>

      {/* Create Batch Dialog */}
      <Dialog open={showCreateBatch} onOpenChange={setShowCreateBatch}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Create New Batch</DialogTitle>
          </DialogHeader>
          
          <CreateBatchForm 
            workflows={workflows || []}
            onSuccess={() => {
              setShowCreateBatch(false)
              queryClient.invalidateQueries({ queryKey: ['production-batches'] })
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Batch Details Component
function BatchDetailsView({ batch }: { batch: Batch }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <h4 className="font-medium text-sm text-gray-600">Batch Type</h4>
          <p className="capitalize">{batch.batch_type}</p>
        </div>
        <div>
          <h4 className="font-medium text-sm text-gray-600">Status</h4>
          <Badge variant={batch.status === 'active' ? 'default' : 'secondary'}>
            {batch.status}
          </Badge>
        </div>
        <div>
          <h4 className="font-medium text-sm text-gray-600">Current Stage</h4>
          <p>{batch.current_stage || 'Pending'}</p>
        </div>
        <div>
          <h4 className="font-medium text-sm text-gray-600">Total Items</h4>
          <p>{batch._stats?.total_items || 0}</p>
        </div>
      </div>

      <div>
        <h4 className="font-medium text-sm text-gray-600 mb-2">Timeline</h4>
        <div className="text-sm space-y-1">
          <div>Created: {new Date(batch.created_at).toLocaleString()}</div>
          <div>Updated: {new Date(batch.updated_at).toLocaleString()}</div>
        </div>
      </div>

      <div className="flex space-x-2">
        <Button variant="outline" size="sm">
          <Eye className="h-4 w-4 mr-2" />
          View Tasks
        </Button>
        <Button variant="outline" size="sm">
          <Settings className="h-4 w-4 mr-2" />
          Edit Batch
        </Button>
      </div>
    </div>
  )
}

// Create Batch Form Component (simplified for now)
function CreateBatchForm({ workflows, onSuccess }: { workflows: any[]; onSuccess: () => void }) {
  return (
    <div className="space-y-4">
      <p className="text-gray-600">
        Batch creation form will be implemented here. This will allow:
      </p>
      <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
        <li>Select orders to include in the batch</li>
        <li>Choose batch criteria (model, wood type, etc.)</li>
        <li>Assign workflow template</li>
        <li>Set initial stage and priority</li>
      </ul>
      <div className="flex justify-end space-x-2">
        <Button variant="outline" onClick={onSuccess}>
          Cancel
        </Button>
        <Button onClick={onSuccess}>
          Create Batch
        </Button>
      </div>
    </div>
  )
} 