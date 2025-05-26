'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { useToast } from '@/hooks/use-toast'
import { 
  Workflow, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  Zap,
  Timer,
  Package,
  RefreshCw,
  TrendingUp,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  ArrowRight,
  Eye,
  Users
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

interface StageGroup {
  id: string
  name: string
  stages: StageColumn[]
  position: 'top' | 'bottom'
}

interface StageColumn {
  id: string
  name: string
  stage_code: string
  batches: Batch[]
  automation_type: 'automated' | 'manual'
  bottleneck_score: number
  expanded?: boolean
}

interface ProductionFlowBoardProps {
  refreshInterval?: number
}

export function EnhancedProductionFlowBoard({ refreshInterval = 30000 }: ProductionFlowBoardProps) {
  const { toast } = useToast()
  
  // State
  const [workflows, setWorkflows] = useState<WorkflowTemplate[]>([])
  const [selectedWorkflow, setSelectedWorkflow] = useState<string>('all')
  const [batches, setBatches] = useState<Batch[]>([])
  const [stageGroups, setStageGroups] = useState<StageGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null)
  const [showBatchDetails, setShowBatchDetails] = useState(false)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())
  const [isDragging, setIsDragging] = useState(false)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [expandedStages, setExpandedStages] = useState<Set<string>>(new Set())

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

  // Generate stage groups with 2-row layout
  const generateStageGroups = useCallback(() => {
    // Define workflow stage groups for better organization
    const stageDefinitions: Record<string, { 
      name: string
      automation_type: 'automated' | 'manual'
      group: 'preparation' | 'production' | 'quality' | 'fulfillment'
    }> = {
      'sanding': { name: 'Sanding', automation_type: 'automated', group: 'preparation' },
      'finishing': { name: 'UV Coating', automation_type: 'automated', group: 'preparation' },
      'assembly': { name: 'Assembly', automation_type: 'manual', group: 'production' },
      'acoustic_testing': { name: 'Acoustic Testing', automation_type: 'manual', group: 'production' },
      'initial_qc': { name: 'Initial QC', automation_type: 'automated', group: 'quality' },
      'qc': { name: 'Quality Control', automation_type: 'automated', group: 'quality' },
      'final_qc': { name: 'Final QC', automation_type: 'automated', group: 'quality' },
      'packaging': { name: 'Packaging', automation_type: 'automated', group: 'fulfillment' },
      'shipping': { name: 'Shipping', automation_type: 'automated', group: 'fulfillment' }
    }

    // Get all stages that actually exist in the data
    const stagesFromBatches = new Set<string>()
    const stagesFromWorkflows = new Set<string>()
    
    // Collect stages from batches
    batches.forEach(batch => {
      if (batch.current_stage) {
        stagesFromBatches.add(batch.current_stage)
      }
    })
    
    // Collect stages from all workflows
    workflows.forEach(workflow => {
      workflow.stages?.forEach((stage: any) => {
        stagesFromWorkflows.add(stage.stage)
      })
    })
    
    // Combine all unique stages
    const allStages = new Set([...stagesFromBatches, ...stagesFromWorkflows])
    
    // Create stage columns
    const stageColumns: StageColumn[] = []
    
    // Always add pending
    stageColumns.push({
      id: 'pending',
      name: 'Pending',
      stage_code: 'pending',
      automation_type: 'manual',
      bottleneck_score: 0,
      expanded: expandedStages.has('pending'),
      batches: batches.filter(b => !b.current_stage)
    })
    
    // Add stages that actually exist
    Array.from(allStages).sort().forEach(stageCode => {
      const def = stageDefinitions[stageCode] || { 
        name: stageCode.charAt(0).toUpperCase() + stageCode.slice(1).replace(/_/g, ' '), 
        automation_type: 'manual' as const,
        group: 'production' as const
      }
      
      stageColumns.push({
        id: stageCode,
        name: def.name,
        stage_code: stageCode,
        automation_type: def.automation_type,
        bottleneck_score: 0,
        expanded: expandedStages.has(stageCode),
        batches: batches.filter(b => b.current_stage === stageCode)
      })
    })
    
    // Always add completed
    stageColumns.push({
      id: 'completed',
      name: 'Completed',
      stage_code: 'completed',
      automation_type: 'manual',
      bottleneck_score: 0,
      expanded: expandedStages.has('completed'),
      batches: batches.filter(b => b.status === 'completed')
    })
    
    // Group stages into two rows
    const midpoint = Math.ceil(stageColumns.length / 2)
    
    return [
      {
        id: 'top-row',
        name: 'Pre-Production → Production',
        position: 'top' as const,
        stages: stageColumns.slice(0, midpoint)
      },
      {
        id: 'bottom-row', 
        name: 'Quality Control → Fulfillment',
        position: 'bottom' as const,
        stages: stageColumns.slice(midpoint)
      }
    ]
  }, [batches, workflows, expandedStages])

  // Toggle stage expansion
  const toggleStageExpansion = useCallback((stageId: string) => {
    setExpandedStages(prev => {
      const newSet = new Set(prev)
      if (newSet.has(stageId)) {
        newSet.delete(stageId)
      } else {
        newSet.add(stageId)
      }
      return newSet
    })
  }, [])

  // Handle drag start
  const handleDragStart = useCallback(() => {
    setIsDragging(true)
  }, [])

  // Optimistic drag handler - immediately update UI
  const handleOptimisticMove = useCallback((batchId: string, fromStage: string, toStage: string) => {
    setBatches(prev => {
      return prev.map(batch => {
        if (batch.id === batchId) {
          return {
            ...batch,
            current_stage: toStage === 'pending' ? null : toStage,
            status: toStage === 'completed' ? 'completed' as const : batch.status
          }
        }
        return batch
      })
    })
  }, [])

  // Revert optimistic update on error
  const revertOptimisticMove = useCallback(() => {
    // Regenerate groups from current batch data
    setStageGroups(generateStageGroups())
  }, [generateStageGroups])

  // Handle drag and drop with optimistic updates
  const handleDragEnd = useCallback(async (result: DropResult) => {
    setIsDragging(false)
    
    if (!result.destination) return
    
    const { source, destination, draggableId } = result
    
    // Don't do anything if dropped in the same column
    if (source.droppableId === destination.droppableId) {
      toast({
        title: 'No change',
        description: 'Batch is already in this stage',
        variant: 'default'
      })
      return
    }
    
    const batchId = draggableId
    const fromStage = source.droppableId
    const newStage = destination.droppableId
    
    // Find the batch to get its workflow
    const batch = batches.find(b => b.id === batchId)
    if (!batch) {
      toast({
        title: 'Error',
        description: 'Batch not found',
        variant: 'destructive'
      })
      return
    }
    
    // Optimistically update UI immediately
    handleOptimisticMove(batchId, fromStage, newStage)
    setIsTransitioning(true)
    
    try {
      // Make API call to transition batch
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
      
      // Success - refresh full data to sync with server
      await loadBatches()
      
      toast({
        title: 'Batch moved',
        description: `Batch moved to ${newStage} successfully`,
        variant: 'default'
      })
    } catch (error) {
      console.error('Error moving batch:', error)
      
      // Revert optimistic update on error
      revertOptimisticMove()
      
      toast({
        title: 'Failed to move batch',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive'
      })
    } finally {
      setIsTransitioning(false)
    }
  }, [handleOptimisticMove, revertOptimisticMove, loadBatches, toast, batches])

  // Auto-refresh data (less frequent to reduce conflicts)
  useEffect(() => {
    const interval = setInterval(() => {
      // Don't refresh while dragging or transitioning
      if (!isDragging && !isTransitioning) {
        loadBatches()
        setLastRefresh(new Date())
      }
    }, refreshInterval)

    return () => clearInterval(interval)
  }, [refreshInterval, loadBatches, isDragging, isTransitioning])

  // Load initial data
  useEffect(() => {
    Promise.all([loadWorkflows(), loadBatches()])
      .finally(() => setLoading(false))
  }, [loadWorkflows, loadBatches])

  // Update stage groups when data changes
  useEffect(() => {
    setStageGroups(generateStageGroups())
  }, [generateStageGroups])

  // Calculate overall statistics
  const overallStats = useMemo(() => {
    const activeBatches = batches.filter(b => b.status === 'active').length
    const completedToday = batches.filter(b => 
      b.status === 'completed' && 
      new Date(b.updated_at).toDateString() === new Date().toDateString()
    ).length
    
    const allStages = stageGroups.flatMap(group => group.stages)
    const bottlenecks = allStages.filter(stage => stage.batches.length > 3).length
    const avgTimeInStage = batches.reduce((sum, b) => sum + (b._stats?.time_in_current_stage || 0), 0) / Math.max(batches.length, 1)

    return {
      activeBatches,
      completedToday,
      bottlenecks,
      avgTimeInStage: Math.round(avgTimeInStage * 10) / 10
    }
  }, [batches, stageGroups])

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
          
          <Button 
            variant="outline" 
            disabled={isDragging || isTransitioning}
            onClick={() => {
              loadBatches()
              setLastRefresh(new Date())
            }}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isTransitioning ? 'animate-spin' : ''}`} />
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

      {/* Two-Row Stage Layout with Flow Arrows */}
      <DragDropContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="space-y-8">
          {stageGroups.map((group, groupIndex) => (
            <div key={group.id} className="space-y-4">
              {/* Group Header with Flow Arrow */}
              <div className="flex items-center space-x-4">
                <h3 className="text-lg font-semibold text-gray-800">{group.name}</h3>
                {groupIndex === 0 && (
                  <div className="flex items-center text-gray-400">
                    <ArrowRight className="h-5 w-5" />
                    <span className="text-sm ml-2">Workflow Direction</span>
                  </div>
                )}
              </div>
              
              {/* Stage Cards in Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                {group.stages.map((stage, stageIndex) => (
                  <div key={stage.id}>
                    {/* Stage Summary Card */}
                    <Card className="h-full">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2 min-w-0">
                            <CardTitle className="text-sm font-medium truncate">
                              {stage.name}
                            </CardTitle>
                            {stage.automation_type === 'automated' && (
                              <Zap className="h-3 w-3 text-blue-600 flex-shrink-0" />
                            )}
                          </div>
                          
                          <div className="flex items-center space-x-2 flex-shrink-0">
                            <Badge 
                              variant={stage.batches.length > 3 ? 'destructive' : 'secondary'}
                              className="text-xs"
                            >
                              {stage.batches.length}
                            </Badge>
                            
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleStageExpansion(stage.id)}
                              className="h-6 w-6 p-0"
                            >
                              {stage.expanded ? 
                                <ChevronDown className="h-3 w-3" /> : 
                                <Eye className="h-3 w-3" />
                              }
                            </Button>
                          </div>
                        </div>
                        
                        {/* Stage Stats */}
                        <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                          <div className="flex items-center space-x-1">
                            <Users className="h-3 w-3" />
                            <span>{stage.batches.filter(b => b.status === 'active').length} active</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Clock className="h-3 w-3" />
                            <span>
                              {stage.batches.reduce((sum, b) => sum + (b._stats?.time_in_current_stage || 0), 0).toFixed(1)}h
                            </span>
                          </div>
                        </div>
                      </CardHeader>

                      {/* Expanded Stage Content */}
                      <Collapsible open={stage.expanded}>
                        <CollapsibleContent>
                          <Droppable droppableId={stage.stage_code}>
                            {(provided, snapshot) => (
                              <CardContent
                                ref={provided.innerRef}
                                {...provided.droppableProps}
                                className={`space-y-2 min-h-32 ${
                                  snapshot.isDraggingOver ? 'bg-blue-50' : ''
                                }`}
                              >
                                {stage.batches.length === 0 ? (
                                  <div className="text-center text-gray-400 py-8">
                                    <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                    <p className="text-sm">No batches in this stage</p>
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
                                                  className="text-xs flex-shrink-0"
                                                >
                                                  {batch.status}
                                                </Badge>
                                              </div>
                                              
                                              <div className="grid grid-cols-2 gap-2 text-xs">
                                                <div className="flex items-center space-x-1">
                                                  <Package className="h-3 w-3 flex-shrink-0" />
                                                  <span>{batch._stats?.total_items || 0}</span>
                                                </div>
                                                <div className="flex items-center space-x-1">
                                                  <Clock className="h-3 w-3 flex-shrink-0" />
                                                  <span>{batch._stats?.time_in_current_stage || 0}h</span>
                                                </div>
                                              </div>

                                              {batch._stats && batch._stats.time_in_current_stage > 8 && (
                                                <div className="flex items-center space-x-1 text-xs text-orange-600">
                                                  <AlertCircle className="h-3 w-3 flex-shrink-0" />
                                                  <span className="truncate">Long stage time</span>
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
                        </CollapsibleContent>
                      </Collapsible>
                    </Card>
                    
                    {/* Flow Arrow Between Stages */}
                    {stageIndex < group.stages.length - 1 && (
                      <div className="flex justify-center py-2">
                        <ArrowRight className="h-4 w-4 text-gray-300" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DragDropContext>

      {/* Last Refresh Indicator */}
      <div className="text-center text-sm text-gray-500">
        Last updated: {lastRefresh.toLocaleTimeString()}
        {isTransitioning && (
          <span className="ml-2 text-blue-600">
            <RefreshCw className="h-3 w-3 inline animate-spin mr-1" />
            Updating...
          </span>
        )}
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