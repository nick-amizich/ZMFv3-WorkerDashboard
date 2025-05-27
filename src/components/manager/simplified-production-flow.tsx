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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
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
  Zap,
  XCircle
} from 'lucide-react'
import { Label } from '@/components/ui/label'

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
  const [showCleanupDialog, setShowCleanupDialog] = useState(false)
  const [cleaningUp, setCleaningUp] = useState(false)

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
    
    // Calculate potentially orphaned batches (old batches with no recent activity)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const orphanedBatches = filteredBatches.filter((b: Batch) => 
      new Date(b.updated_at) < thirtyDaysAgo && 
      b.status !== 'completed' &&
      (!b.order_item_ids || b.order_item_ids.length === 0)
    ).length

    return {
      activeBatches,
      completedToday,
      bottlenecks,
      totalItems,
      orphanedBatches
    }
  }, [filteredBatches, stageColumns])

  // Cleanup orphaned batches
  const cleanupOrphanedBatches = async () => {
    setCleaningUp(true)
    try {
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      
      // Identify orphaned batches
      const orphanedBatches = filteredBatches.filter((b: Batch) => 
        new Date(b.updated_at) < thirtyDaysAgo && 
        b.status !== 'completed' &&
        (!b.order_item_ids || b.order_item_ids.length === 0)
      )

      if (orphanedBatches.length === 0) {
        toast({
          title: 'No orphaned batches found',
          description: 'All batches appear to be valid or recently active'
        })
        setShowCleanupDialog(false)
        return
      }

      // Delete each orphaned batch
      let deleted = 0
      let failed = 0
      
      for (const batch of orphanedBatches) {
        try {
          const response = await fetch(`/api/batches/${batch.id}`, {
            method: 'DELETE'
          })
          
          if (response.ok) {
            deleted++
          } else {
            failed++
          }
        } catch (error) {
          failed++
        }
      }

      toast({
        title: 'Cleanup completed',
        description: `Deleted ${deleted} orphaned batches. ${failed > 0 ? `${failed} failed to delete.` : ''}`
      })

      // Refresh the batches list
      queryClient.invalidateQueries({ queryKey: ['production-batches'] })
      setShowCleanupDialog(false)
      
    } catch (error) {
      toast({
        title: 'Cleanup failed',
        description: 'Failed to clean up orphaned batches',
        variant: 'destructive'
      })
    } finally {
      setCleaningUp(false)
    }
  }

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
          
          {overallStats.orphanedBatches > 0 && (
            <Button 
              variant="outline" 
              onClick={() => setShowCleanupDialog(true)}
              className="text-orange-600 border-orange-200 hover:bg-orange-50"
            >
              <AlertTriangle className="h-4 w-4 mr-2" />
              Clean Up ({overallStats.orphanedBatches})
            </Button>
          )}
          
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
                <p className="text-sm text-gray-600">
                  {overallStats.orphanedBatches > 0 ? 'Orphaned Batches' : 'Total Items'}
                </p>
                <p className={`text-2xl font-bold ${overallStats.orphanedBatches > 0 ? 'text-orange-600' : ''}`}>
                  {overallStats.orphanedBatches > 0 ? overallStats.orphanedBatches : overallStats.totalItems}
                </p>
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
                              className={`cursor-move transition-transform group ${
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
                                    <div className="flex items-center space-x-1">
                                      <Badge 
                                        variant={batch.status === 'active' ? 'default' : 'secondary'}
                                        className="text-xs"
                                      >
                                        {batch.status}
                                      </Badge>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          setSelectedBatch(batch)
                                          setShowBatchDetails(true)
                                        }}
                                      >
                                        <XCircle className="h-3 w-3 text-red-500" />
                                      </Button>
                                    </div>
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
            <DialogDescription>
              View batch information, timeline, and manage batch settings
            </DialogDescription>
          </DialogHeader>
          
          {selectedBatch && (
            <BatchDetailsView batch={selectedBatch} onClose={() => setShowBatchDetails(false)} />
          )}
        </DialogContent>
      </Dialog>

      {/* Create Batch Dialog */}
      <Dialog open={showCreateBatch} onOpenChange={setShowCreateBatch}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Create New Batch</DialogTitle>
            <DialogDescription>
              Group orders into batches for efficient production workflow management
            </DialogDescription>
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

      {/* Cleanup Orphaned Batches Dialog */}
      <Dialog open={showCleanupDialog} onOpenChange={setShowCleanupDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clean Up Orphaned Batches</DialogTitle>
            <DialogDescription>
              Remove old batches that appear to be orphaned or have no valid order items
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-orange-800">This will delete batches that:</p>
                  <ul className="mt-2 list-disc list-inside text-orange-700 space-y-1">
                    <li>Haven't been updated in the last 30 days</li>
                    <li>Are not marked as completed</li>
                    <li>Have no order items or empty order item lists</li>
                    <li>Are likely orphaned from deleted builds/orders</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="text-sm text-gray-600">
              <strong>Orphaned batches found:</strong> {overallStats.orphanedBatches}<br />
              <strong>This action cannot be undone.</strong>
            </div>
          </div>
          
          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={() => setShowCleanupDialog(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={cleanupOrphanedBatches}
              disabled={cleaningUp}
            >
              {cleaningUp ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Cleaning up...
                </>
              ) : (
                <>
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Clean Up {overallStats.orphanedBatches} Batches
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Batch Details Component
function BatchDetailsView({ batch, onClose }: { batch: Batch; onClose?: () => void }) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const deleteBatch = async () => {
    setDeleting(true)
    try {
      const response = await fetch(`/api/batches/${batch.id}`, {
        method: 'DELETE'
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete batch')
      }
      
      const result = await response.json()
      toast({
        title: 'Batch deleted successfully',
        description: result.message || 'The batch and all related data have been cleaned up'
      })
      
      // Refresh the batches list and close both dialogs
      queryClient.invalidateQueries({ queryKey: ['production-batches'] })
      setShowDeleteConfirm(false)
      onClose?.() // Close the parent batch details dialog
      
    } catch (error) {
      toast({
        title: 'Failed to delete batch',
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: 'destructive'
      })
    } finally {
      setDeleting(false)
    }
  }

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
        <Button 
          variant="destructive" 
          size="sm"
          onClick={() => setShowDeleteConfirm(true)}
        >
          <XCircle className="h-4 w-4 mr-2" />
          Delete Batch
        </Button>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Batch</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this batch? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-yellow-800">This will:</p>
                  <ul className="mt-2 list-disc list-inside text-yellow-700 space-y-1">
                    <li>Delete the batch permanently</li>
                    <li>Remove all stage transition history</li>
                    <li>Remove all workflow execution logs</li>
                    <li>Unlink any completed tasks (but keep them as historical records)</li>
                    <li>Prevent deletion if there are active tasks</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="text-sm text-gray-600">
              <strong>Batch:</strong> {batch.name}<br />
              <strong>Items:</strong> {batch._stats?.total_items || 0}<br />
              <strong>Status:</strong> {batch.status}
            </div>
          </div>
          
          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={deleteBatch}
              disabled={deleting}
            >
              {deleting ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4 mr-2" />
                  Delete Batch
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Create Batch Form Component
function CreateBatchForm({ workflows, onSuccess }: { workflows: any[]; onSuccess: () => void }) {
  const [batchName, setBatchName] = useState('')
  const [selectedWorkflow, setSelectedWorkflow] = useState('')
  const [batchType, setBatchType] = useState('production')
  const [selectedOrders, setSelectedOrders] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [batchCreationType, setBatchCreationType] = useState<'orders' | 'stock'>('orders')
  
  // Stock batch configuration
  const [stockConfig, setStockConfig] = useState({
    model: '',
    woodType: '',
    padType: '',
    cableType: '',
    quantity: 1,
    description: ''
  })
  
  const { toast } = useToast()

  // Fetch available orders for batch creation
  const { data: availableOrdersData, isLoading: ordersLoading } = useQuery({
    queryKey: ['available-orders'],
    queryFn: async () => {
      const response = await fetch('/api/orders?status=pending&limit=50')
      if (!response.ok) throw new Error('Failed to fetch orders')
      return response.json()
    }
  })

  const availableOrders = availableOrdersData?.items || []

  const handleCreateBatch = async () => {
    // Validation based on batch creation type
    if (!batchName || !selectedWorkflow) {
      toast({
        title: 'Missing information',
        description: 'Please enter a batch name and select a workflow template',
        variant: 'destructive'
      })
      return
    }

    if (batchCreationType === 'orders' && selectedOrders.length === 0) {
      toast({
        title: 'No orders selected',
        description: 'Please select at least one order for the batch',
        variant: 'destructive'
      })
      return
    }

    if (batchCreationType === 'stock' && (!stockConfig.model || !stockConfig.woodType || stockConfig.quantity < 1)) {
      toast({
        title: 'Missing stock configuration',
        description: 'Please configure the stock model, wood type, and quantity',
        variant: 'destructive'
      })
      return
    }

    setLoading(true)
    try {
      let batchData: any = {
        name: batchName,
        batch_type: batchCreationType === 'stock' ? 'stock' : batchType,
        workflow_template_id: selectedWorkflow,
      }

      if (batchCreationType === 'orders') {
        batchData.order_item_ids = selectedOrders
        batchData.notes = `Created from production flow - ${selectedOrders.length} customer orders`
      } else {
        // For stock batches, we'll create placeholder order items
        batchData.stock_config = stockConfig
        batchData.notes = `Stock batch: ${stockConfig.quantity}x ${stockConfig.model} ${stockConfig.woodType} - ${stockConfig.description || 'No description'}`
      }

      const response = await fetch('/api/batches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(batchData)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create batch')
      }

      const newBatch = await response.json()
      const itemCount = batchCreationType === 'orders' ? selectedOrders.length : stockConfig.quantity
      
      toast({
        title: 'Batch created successfully',
        description: `${batchCreationType === 'stock' ? 'Stock batch' : 'Batch'} "${batchName}" created with ${itemCount} items`
      })
      onSuccess()
    } catch (error) {
      toast({
        title: 'Failed to create batch',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  if (ordersLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <RefreshCw className="h-5 w-5 animate-spin mr-2" />
        Loading available orders...
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Batch Creation Type Selection */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Batch Creation Type</Label>
          <div className="flex space-x-4">
            <Button
              variant={batchCreationType === 'orders' ? 'default' : 'outline'}
              onClick={() => setBatchCreationType('orders')}
              className="flex-1"
            >
              <Package className="h-4 w-4 mr-2" />
              Customer Orders
            </Button>
            <Button
              variant={batchCreationType === 'stock' ? 'default' : 'outline'}
              onClick={() => setBatchCreationType('stock')}
              className="flex-1"
            >
              <Zap className="h-4 w-4 mr-2" />
              Stock Models
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            {batchCreationType === 'orders' 
              ? 'Create batches from existing customer orders'
              : 'Create stock batches for common models built ahead of orders'
            }
          </p>
        </div>
      </div>

      {/* Batch Configuration */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="batch-name">Batch Name</Label>
          <Input
            id="batch-name"
            placeholder={batchCreationType === 'stock' 
              ? "e.g., Stock Aeon Cherry - Week 47" 
              : "e.g., Customer Orders - Week 47"
            }
            value={batchName}
            onChange={(e) => setBatchName(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="workflow">Workflow Template</Label>
          <Select value={selectedWorkflow} onValueChange={setSelectedWorkflow}>
            <SelectTrigger>
              <SelectValue placeholder="Select workflow template" />
            </SelectTrigger>
            <SelectContent>
              {workflows.map((workflow: any) => (
                <SelectItem key={workflow.id} value={workflow.id}>
                  {workflow.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Conditional Batch Type Selection (only for customer orders) */}
      {batchCreationType === 'orders' && (
        <div className="space-y-2">
          <Label htmlFor="batch-type">Priority/Type</Label>
          <Select value={batchType} onValueChange={setBatchType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="production">Standard Production</SelectItem>
              <SelectItem value="rush">Rush Order</SelectItem>
              <SelectItem value="sample">Sample/Prototype</SelectItem>
              <SelectItem value="rework">Rework</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Conditional Content Based on Batch Type */}
      {batchCreationType === 'orders' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Select Orders for Batch</Label>
            <Badge variant="outline">
              {selectedOrders.length} selected
            </Badge>
          </div>

          <div className="border rounded-lg max-h-64 overflow-y-auto">
            {availableOrders.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No pending orders available for batching</p>
                <p className="text-sm mt-2">Try importing orders from the Orders page first</p>
              </div>
            ) : (
              <div className="space-y-1 p-2">
                {availableOrders.map((order: any) => (
                  <div
                    key={order.id}
                    className={`p-3 rounded cursor-pointer border transition-colors ${
                      selectedOrders.includes(order.id)
                        ? 'bg-blue-50 border-blue-200'
                        : 'hover:bg-gray-50 border-transparent'
                    }`}
                    onClick={() => {
                      setSelectedOrders(prev =>
                        prev.includes(order.id)
                          ? prev.filter(id => id !== order.id)
                          : [...prev, order.id]
                      )
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">
                          {order.shopify_order_name} - {order.customer_name}
                        </div>
                        <div className="text-sm text-gray-600">
                          {order.title} • Qty: {order.quantity}
                        </div>
                        {order.model_name && (
                          <div className="text-xs text-gray-500">
                            Model: {order.model_name}
                            {order.wood_type && ` • Wood: ${order.wood_type}`}
                          </div>
                        )}
                      </div>
                      <div className="text-sm text-gray-500">
                        SKU: {order.sku}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {availableOrders.length > 0 && (
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setSelectedOrders(availableOrders.map((o: any) => o.id))}
              >
                Select All
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setSelectedOrders([])}
              >
                Clear Selection
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Stock Batch Configuration */}
      {batchCreationType === 'stock' && (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <Zap className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-blue-800">Stock Batch Configuration</p>
                <p className="text-blue-700 mt-1">
                  Create batches for popular models to build ahead of orders. These help maintain inventory and reduce customer wait times.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="stock-model">Model</Label>
              <Select 
                value={stockConfig.model} 
                onValueChange={(value) => setStockConfig(prev => ({ ...prev, model: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select headphone model" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Auteur">ZMF Auteur</SelectItem>
                  <SelectItem value="Verite">ZMF Verite</SelectItem>
                  <SelectItem value="Aeon">ZMF Aeon</SelectItem>
                  <SelectItem value="Atticus">ZMF Atticus</SelectItem>
                  <SelectItem value="Eikon">ZMF Eikon</SelectItem>
                  <SelectItem value="Aeolus">ZMF Aeolus</SelectItem>
                  <SelectItem value="Caldera">ZMF Caldera</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="stock-wood">Wood Type</Label>
              <Select 
                value={stockConfig.woodType} 
                onValueChange={(value) => setStockConfig(prev => ({ ...prev, woodType: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select wood type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Cherry">Cherry</SelectItem>
                  <SelectItem value="Walnut">Walnut</SelectItem>
                  <SelectItem value="Ebony">Ebony</SelectItem>
                  <SelectItem value="Maple">Maple</SelectItem>
                  <SelectItem value="Mahogany">Mahogany</SelectItem>
                  <SelectItem value="Blackwood">Blackwood</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="stock-pads">Pad Type</Label>
              <Select 
                value={stockConfig.padType} 
                onValueChange={(value) => setStockConfig(prev => ({ ...prev, padType: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select pad type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Leather">Leather</SelectItem>
                  <SelectItem value="Suede">Suede</SelectItem>
                  <SelectItem value="Vegan">Vegan</SelectItem>
                  <SelectItem value="Perforated">Perforated Leather</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="stock-cable">Cable Type</Label>
              <Select 
                value={stockConfig.cableType} 
                onValueChange={(value) => setStockConfig(prev => ({ ...prev, cableType: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select cable type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1/4">1/4" TRS</SelectItem>
                  <SelectItem value="XLR">4-pin XLR</SelectItem>
                  <SelectItem value="3.5mm">3.5mm</SelectItem>
                  <SelectItem value="1/8">1/8" (3.5mm)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="stock-quantity">Quantity</Label>
              <Input
                id="stock-quantity"
                type="number"
                min="1"
                max="20"
                value={stockConfig.quantity}
                onChange={(e) => setStockConfig(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="stock-description">Description (Optional)</Label>
              <Input
                id="stock-description"
                placeholder="e.g., Popular holiday configuration"
                value={stockConfig.description}
                onChange={(e) => setStockConfig(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-end space-x-2 pt-4 border-t">
        <Button variant="outline" onClick={onSuccess}>
          Cancel
        </Button>
        <Button 
          onClick={handleCreateBatch}
          disabled={loading || !batchName || !selectedWorkflow || 
            (batchCreationType === 'orders' && selectedOrders.length === 0) ||
            (batchCreationType === 'stock' && (!stockConfig.model || !stockConfig.woodType || stockConfig.quantity < 1))
          }
        >
          {loading ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Creating...
            </>
          ) : (
            <>
              <Plus className="h-4 w-4 mr-2" />
              Create {batchCreationType === 'stock' ? 'Stock' : ''} Batch
            </>
          )}
        </Button>
      </div>
    </div>
  )
} 