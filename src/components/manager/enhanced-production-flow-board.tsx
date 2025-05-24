'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { 
  Workflow, 
  Clock, 
  Users, 
  AlertTriangle, 
  CheckCircle, 
  ArrowRight, 
  Settings, 
  Zap,
  Timer,
  Package,
  Eye,
  RefreshCw,
  TrendingUp,
  AlertCircle
} from 'lucide-react'

interface WorkflowTemplate {
  id: string
  name: string
  stages: any[]
  stage_transitions: any[]
}

interface Batch {
  id: string
  name: string
  batch_type: string
  order_item_ids: string[]
  workflow_template_id: string | null
  current_stage: string | null
  status: 'pending' | 'active' | 'completed' | 'on_hold'
  created_at: string
  updated_at: string
  workflow_template?: WorkflowTemplate
  _stats?: {
    total_items: number
    completed_tasks: number
    active_tasks: number
    estimated_completion: string
    time_in_current_stage: number
  }
}

interface StageColumn {
  id: string
  name: string
  stage_code: string
  batches: Batch[]
  automation_type: 'automated' | 'manual'
  bottleneck_score: number
}

interface ProductionFlowBoardProps {
  refreshInterval?: number
}

export function EnhancedProductionFlowBoard({ refreshInterval = 30000 }: ProductionFlowBoardProps) {
  const { toast } = useToast()
  const supabase = createClient()
  
  // State
  const [workflows, setWorkflows] = useState<WorkflowTemplate[]>([])
  const [selectedWorkflow, setSelectedWorkflow] = useState<string>('all')
  const [batches, setBatches] = useState<Batch[]>([])
  const [stageColumns, setStageColumns] = useState<StageColumn[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null)
  const [showBatchDetails, setShowBatchDetails] = useState(false)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())

  // Load workflows
  const loadWorkflows = useCallback(async () => {
    try {
      const response = await fetch('/api/workflows')
      if (response.ok) {
        const data = await response.json()
        setWorkflows(data.filter((w: any) => w.is_active))
      }
    } catch (error) {
      console.error('Error loading workflows:', error)
    }
  }, [])

  // Load batches with workflow context
  const loadBatches = useCallback(async () => {
    try {
      const response = await fetch('/api/batches')
      if (response.ok) {
        const data = await response.json()
        
        // Enhance batches with statistics
        const enhancedBatches = await Promise.all(
          data.map(async (batch: Batch) => {
            const stats = await calculateBatchStats(batch)
            return { ...batch, _stats: stats }
          })
        )
        
        setBatches(enhancedBatches)
      }
    } catch (error) {
      console.error('Error loading batches:', error)
      toast({
        title: 'Failed to load batches',
        description: 'Please try refreshing the page',
        variant: 'destructive'
      })
    }
  }, [toast])

  // Calculate batch statistics
  const calculateBatchStats = async (batch: Batch) => {
    try {
      // Get time logs for this batch
      const timeResponse = await fetch(`/api/time/batch/${batch.id}`)
      const timeData = timeResponse.ok ? await timeResponse.json() : []
      
      // Calculate time in current stage
      const currentStageTime = timeData
        .filter((log: any) => log.stage === batch.current_stage && !log.end_time)
        .reduce((sum: number, log: any) => {
          const startTime = new Date(log.start_time)
          const now = new Date()
          return sum + ((now.getTime() - startTime.getTime()) / (1000 * 60 * 60)) // hours
        }, 0)

      // Get task counts
      const tasksResponse = await fetch(`/api/tasks?batch_id=${batch.id}`)
      const tasks = tasksResponse.ok ? (await tasksResponse.json()).tasks || [] : []
      
      const completedTasks = tasks.filter((t: any) => t.status === 'completed').length
      const activeTasks = tasks.filter((t: any) => ['assigned', 'in_progress'].includes(t.status)).length
      
      // Estimate completion based on workflow
      let estimatedCompletion = 'Unknown'
      if (batch.workflow_template) {
        const stages = batch.workflow_template.stages || []
        const currentStageIndex = stages.findIndex((s: any) => s.stage === batch.current_stage)
        const remainingStages = stages.slice(currentStageIndex + 1)
        const remainingHours = remainingStages.reduce((sum: number, s: any) => sum + (s.estimated_hours || 2), 0)
        
        if (remainingHours > 0) {
          const completionDate = new Date(Date.now() + remainingHours * 60 * 60 * 1000)
          estimatedCompletion = completionDate.toLocaleDateString()
        }
      }

      return {
        total_items: batch.order_item_ids.length,
        completed_tasks: completedTasks,
        active_tasks: activeTasks,
        estimated_completion: estimatedCompletion,
        time_in_current_stage: Math.round(currentStageTime * 10) / 10
      }
    } catch (error) {
      console.error('Error calculating batch stats:', error)
      return {
        total_items: batch.order_item_ids.length,
        completed_tasks: 0,
        active_tasks: 0,
        estimated_completion: 'Unknown',
        time_in_current_stage: 0
      }
    }
  }

  // Generate stage columns based on selected workflow
  const generateStageColumns = useCallback(() => {
    if (selectedWorkflow === 'all') {
      // Show all standard stages
      const standardStages = [
        { id: 'pending', name: 'Pending', stage_code: 'pending', automation_type: 'manual' as const },
        { id: 'sanding', name: 'Sanding', stage_code: 'sanding', automation_type: 'automated' as const },
        { id: 'finishing', name: 'UV Coating', stage_code: 'finishing', automation_type: 'automated' as const },
        { id: 'assembly', name: 'Assembly', stage_code: 'assembly', automation_type: 'manual' as const },
        { id: 'initial_qc', name: 'Initial QC', stage_code: 'initial_qc', automation_type: 'automated' as const },
        { id: 'acoustic_testing', name: 'Acoustic Testing', stage_code: 'acoustic_testing', automation_type: 'manual' as const },
        { id: 'final_qc', name: 'Final QC', stage_code: 'final_qc', automation_type: 'automated' as const },
        { id: 'packaging', name: 'Packaging', stage_code: 'packaging', automation_type: 'automated' as const },
        { id: 'shipping', name: 'Shipping', stage_code: 'shipping', automation_type: 'automated' as const },
        { id: 'completed', name: 'Completed', stage_code: 'completed', automation_type: 'manual' as const }
      ]
      
      return standardStages.map(stage => ({
        ...stage,
        batches: batches.filter(b => 
          b.current_stage === stage.stage_code || 
          (stage.stage_code === 'pending' && !b.current_stage) ||
          (stage.stage_code === 'completed' && b.status === 'completed')
        ),
        bottleneck_score: 0
      }))
    } else {
      // Show stages from selected workflow
      const workflow = workflows.find(w => w.id === selectedWorkflow)
      if (!workflow) return []
      
      const workflowStages = [
        { id: 'pending', name: 'Pending', stage_code: 'pending', automation_type: 'manual' as const },
        ...workflow.stages.map((stage: any) => ({
          id: stage.stage,
          name: stage.name || stage.stage,
          stage_code: stage.stage,
          automation_type: stage.is_automated ? 'automated' as const : 'manual' as const
        })),
        { id: 'completed', name: 'Completed', stage_code: 'completed', automation_type: 'manual' as const }
      ]
      
      return workflowStages.map(stage => ({
        ...stage,
        batches: batches.filter(b => 
          (b.workflow_template_id === selectedWorkflow || selectedWorkflow === 'all') &&
          (b.current_stage === stage.stage_code || 
           (stage.stage_code === 'pending' && !b.current_stage) ||
           (stage.stage_code === 'completed' && b.status === 'completed'))
        ),
        bottleneck_score: 0
      }))
    }
  }, [selectedWorkflow, workflows, batches])

  // Handle drag and drop
  const handleDragEnd = useCallback(async (result: DropResult) => {
    if (!result.destination) return
    
    const { source, destination, draggableId } = result
    
    if (source.droppableId === destination.droppableId) return
    
    const batchId = draggableId
    const newStage = destination.droppableId
    
    try {
      // Transition batch to new stage
      const response = await fetch(`/api/batches/${batchId}/transition`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to_stage: newStage === 'pending' ? null : newStage,
          transition_type: 'manual',
          notes: `Manually moved by manager to ${newStage}`
        })
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to transition batch')
      }
      
      // Refresh data
      await loadBatches()
      
      toast({
        title: 'Batch moved',
        description: `Batch moved to ${newStage} successfully`
      })
    } catch (error) {
      console.error('Error moving batch:', error)
      toast({
        title: 'Failed to move batch',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive'
      })
    }
  }, [loadBatches, toast])

  // Auto-refresh data
  useEffect(() => {
    const interval = setInterval(() => {
      loadBatches()
      setLastRefresh(new Date())
    }, refreshInterval)

    return () => clearInterval(interval)
  }, [refreshInterval, loadBatches])

  // Load initial data
  useEffect(() => {
    Promise.all([loadWorkflows(), loadBatches()])
      .finally(() => setLoading(false))
  }, [loadWorkflows, loadBatches])

  // Update stage columns when data changes
  useEffect(() => {
    setStageColumns(generateStageColumns())
  }, [generateStageColumns])

  // Calculate overall statistics
  const overallStats = useMemo(() => {
    const activeBatches = batches.filter(b => b.status === 'active').length
    const completedToday = batches.filter(b => 
      b.status === 'completed' && 
      new Date(b.updated_at).toDateString() === new Date().toDateString()
    ).length
    
    const bottlenecks = stageColumns.filter(col => col.batches.length > 3).length
    const avgTimeInStage = batches.reduce((sum, b) => sum + (b._stats?.time_in_current_stage || 0), 0) / Math.max(batches.length, 1)

    return {
      activeBatches,
      completedToday,
      bottlenecks,
      avgTimeInStage: Math.round(avgTimeInStage * 10) / 10
    }
  }, [batches, stageColumns])

  if (loading) {
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
      {/* Header with Workflow Selection */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Production Flow Board</h2>
          <p className="text-gray-600">Monitor and manage workflow execution in real-time</p>
        </div>
        
        <div className="flex items-center space-x-4">
          <Select value={selectedWorkflow} onValueChange={setSelectedWorkflow}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Select workflow to view" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Workflows</SelectItem>
              {workflows.map(workflow => (
                <SelectItem key={workflow.id} value={workflow.id}>
                  {workflow.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Button variant="outline" onClick={() => {
            loadBatches()
            setLastRefresh(new Date())
          }}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Overall Statistics */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Timer className="h-5 w-5 text-blue-600" />
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
              <TrendingUp className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-sm text-gray-600">Avg Time/Stage</p>
                <p className="text-2xl font-bold">{overallStats.avgTimeInStage}h</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stage Columns */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex space-x-4 overflow-x-auto pb-4">
          {stageColumns.map(column => (
            <div key={column.id} className="flex-shrink-0 w-80">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium flex items-center space-x-2">
                      <span>{column.name}</span>
                      {column.automation_type === 'automated' && (
                        <Zap className="h-3 w-3 text-blue-600" />
                      )}
                    </CardTitle>
                    <Badge variant={column.batches.length > 3 ? 'destructive' : 'secondary'}>
                      {column.batches.length}
                    </Badge>
                  </div>
                </CardHeader>
                
                <Droppable droppableId={column.stage_code}>
                  {(provided, snapshot) => (
                    <CardContent
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`space-y-2 min-h-32 ${
                        snapshot.isDraggingOver ? 'bg-blue-50' : ''
                      }`}
                    >
                      {column.batches.map((batch, index) => (
                        <Draggable key={batch.id} draggableId={batch.id} index={index}>
                          {(provided, snapshot) => (
                            <Card
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`cursor-move ${
                                snapshot.isDragging ? 'rotate-2 shadow-lg' : ''
                              }`}
                              onClick={() => {
                                setSelectedBatch(batch)
                                setShowBatchDetails(true)
                              }}
                            >
                              <CardContent className="p-3">
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <h4 className="font-medium text-sm">{batch.name}</h4>
                                    <Badge 
                                      variant={batch.status === 'active' ? 'default' : 'secondary'}
                                      className="text-xs"
                                    >
                                      {batch.status}
                                    </Badge>
                                  </div>
                                  
                                  {batch.workflow_template && (
                                    <div className="flex items-center space-x-1 text-xs text-gray-500">
                                      <Workflow className="h-3 w-3" />
                                      <span>{batch.workflow_template.name}</span>
                                    </div>
                                  )}
                                  
                                  <div className="grid grid-cols-2 gap-2 text-xs">
                                    <div className="flex items-center space-x-1">
                                      <Package className="h-3 w-3" />
                                      <span>{batch._stats?.total_items || 0} items</span>
                                    </div>
                                    <div className="flex items-center space-x-1">
                                      <Clock className="h-3 w-3" />
                                      <span>{batch._stats?.time_in_current_stage || 0}h</span>
                                    </div>
                                  </div>

                                  {batch._stats && batch._stats.time_in_current_stage > 8 && (
                                    <div className="flex items-center space-x-1 text-xs text-orange-600">
                                      <AlertCircle className="h-3 w-3" />
                                      <span>Long stage time</span>
                                    </div>
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </CardContent>
                  )}
                </Droppable>
              </Card>
            </div>
          ))}
        </div>
      </DragDropContext>

      {/* Last Refresh Indicator */}
      <div className="text-center text-sm text-gray-500">
        Last updated: {lastRefresh.toLocaleTimeString()}
      </div>

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
    </div>
  )
}

// Batch Details Component
function BatchDetailsView({ batch }: { batch: Batch }) {
  return (
    <div className="space-y-4">
      {/* Basic Info */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <h4 className="font-medium text-sm text-gray-600">Batch Type</h4>
          <p className="capitalize">{batch.batch_type}</p>
        </div>
        <div>
          <h4 className="font-medium text-sm text-gray-600">Current Status</h4>
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

      {/* Workflow Info */}
      {batch.workflow_template && (
        <div>
          <h4 className="font-medium text-sm text-gray-600 mb-2">Workflow</h4>
          <div className="flex items-center space-x-2">
            <Workflow className="h-4 w-4" />
            <span>{batch.workflow_template.name}</span>
          </div>
        </div>
      )}

      {/* Statistics */}
      {batch._stats && (
        <div>
          <h4 className="font-medium text-sm text-gray-600 mb-2">Statistics</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>Completed Tasks: {batch._stats.completed_tasks}</div>
            <div>Active Tasks: {batch._stats.active_tasks}</div>
            <div>Time in Stage: {batch._stats.time_in_current_stage}h</div>
            <div>Est. Completion: {batch._stats.estimated_completion}</div>
          </div>
        </div>
      )}

      {/* Timestamps */}
      <div>
        <h4 className="font-medium text-sm text-gray-600 mb-2">Timeline</h4>
        <div className="text-sm space-y-1">
          <div>Created: {new Date(batch.created_at).toLocaleString()}</div>
          <div>Updated: {new Date(batch.updated_at).toLocaleString()}</div>
        </div>
      </div>
    </div>
  )
} 