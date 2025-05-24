'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  Clock, 
  Play, 
  Pause, 
  CheckCircle, 
  Clipboard, 
  Workflow, 
  ArrowRight, 
  MapPin,
  Timer,
  Package,
  Zap,
  AlertCircle,
  Shield
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { QCModal } from './qc-modal'
import { QualityCheckpointModal } from './quality-checkpoint-modal'

interface WorkerTaskListProps {
  workerId: string
}

interface Task {
  id: string
  task_type: string
  stage: string
  status: string
  priority: string
  estimated_hours: number
  actual_hours: number
  notes: string
  batch_id: string
  workflow_template_id: string
  order_item: {
    id: string
    product_name: string
    order: {
      order_number: string
    }
  }
  batch?: {
    id: string
    name: string
    current_stage: string
    workflow_template?: {
      id: string
      name: string
      stages: any[]
    }
  }
}

export function EnhancedWorkerTaskList({ workerId }: WorkerTaskListProps) {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [qcModalOpen, setQcModalOpen] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [qualityCheckpointModalOpen, setQualityCheckpointModalOpen] = useState(false)
  const [checkpointType, setCheckpointType] = useState<'pre_work' | 'post_work'>('pre_work')

  const { data: tasks = [] } = useQuery({
    queryKey: ['worker-tasks-enhanced', workerId],
    queryFn: async () => {
      const response = await fetch(`/api/tasks/worker/${workerId}`)
      if (!response.ok) throw new Error('Failed to fetch tasks')
      const tasks = await response.json()
      
      // Enhance tasks with batch and workflow information
      const enhancedTasks = await Promise.all(
        tasks.map(async (task: Task) => {
          if (task.batch_id) {
            try {
              const batchResponse = await fetch(`/api/batches/${task.batch_id}`)
              if (batchResponse.ok) {
                const batch = await batchResponse.json()
                return { ...task, batch }
              }
            } catch (error) {
              console.error('Error fetching batch info:', error)
            }
          }
          return task
        })
      )
      
      return enhancedTasks
    },
    refetchInterval: 10000 // Real-time updates
  })

  const updateTask = useMutation({
    mutationFn: async ({ taskId, action }: { taskId: string; action: 'start' | 'pause' | 'complete' }) => {
      const response = await fetch(`/api/tasks/${taskId}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      if (!response.ok) throw new Error(`Failed to ${action} task`)
      return response.json()
    },
    onSuccess: (data, { action }) => {
      queryClient.invalidateQueries({ queryKey: ['worker-tasks-enhanced', workerId] })
      toast({
        title: `Task ${action}ed successfully`,
        description: action === 'complete' ? 'Great job! Moving to next stage.' : undefined
      })
    },
    onError: (error) => {
      toast({
        title: 'Action failed',
        description: error.message,
        variant: 'destructive'
      })
    }
  })

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'destructive'
      case 'high': return 'default'
      case 'normal': return 'secondary'
      case 'low': return 'outline'
      default: return 'outline'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'default'
      case 'in_progress': return 'secondary'
      case 'assigned': return 'outline'
      default: return 'outline'
    }
  }

  // Calculate workflow progress
  const getWorkflowProgress = (task: Task) => {
    if (!task.batch?.workflow_template?.stages) return { current: 0, total: 0, percentage: 0 }
    
    const stages = task.batch.workflow_template.stages
    const currentStageIndex = stages.findIndex((s: any) => s.stage === task.stage)
    const total = stages.length
    const current = Math.max(0, currentStageIndex + 1)
    const percentage = total > 0 ? (current / total) * 100 : 0
    
    return { current, total, percentage }
  }

  // Get next stages in workflow
  const getNextStages = (task: Task) => {
    if (!task.batch?.workflow_template?.stages) return []
    
    const stages = task.batch.workflow_template.stages
    const currentStageIndex = stages.findIndex((s: any) => s.stage === task.stage)
    
    if (currentStageIndex === -1) return []
    
    return stages.slice(currentStageIndex + 1, currentStageIndex + 3) // Next 2 stages
  }

  // Group tasks by workflow/batch
  const groupedTasks = tasks.reduce((groups: { [key: string]: Task[] }, task: Task) => {
    const key = task.batch_id || 'individual'
    if (!groups[key]) groups[key] = []
    groups[key].push(task)
    return groups
  }, {})

  return (
    <div className="space-y-6">
      {Object.entries(groupedTasks).map(([groupKey, groupTasks]) => {
        const taskGroup = groupTasks as Task[]
        const firstTask = taskGroup[0]
        const isWorkflowGroup = firstTask.batch?.workflow_template
        
        return (
          <div key={groupKey} className="space-y-4">
            {/* Workflow Header */}
            {isWorkflowGroup && (
              <Card className="border-blue-200 bg-blue-50">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Workflow className="h-5 w-5 text-blue-600" />
                      <div>
                        <CardTitle className="text-lg text-blue-900">
                          {firstTask.batch?.workflow_template?.name}
                        </CardTitle>
                        <p className="text-sm text-blue-700">
                          Batch: {firstTask.batch?.name} • Current Stage: {firstTask.batch?.current_stage}
                        </p>
                      </div>
                    </div>
                                         <div className="text-right">
                       <Badge variant="outline" className="bg-white">
                         {taskGroup.length} tasks
                       </Badge>
                     </div>
                  </div>
                  
                  {/* Workflow Progress */}
                  {(() => {
                    const progress = getWorkflowProgress(firstTask)
                    return (
                      <div className="mt-3">
                        <div className="flex items-center justify-between text-sm text-blue-700 mb-1">
                          <span>Workflow Progress</span>
                          <span>{progress.current} of {progress.total} stages</span>
                        </div>
                        <Progress value={progress.percentage} className="h-2" />
                      </div>
                    )
                  })()}
                </CardHeader>
              </Card>
            )}

                         {/* Tasks in this group */}
             <div className="space-y-3">
               {taskGroup.map((task: Task) => {
                const progress = getWorkflowProgress(task)
                const nextStages = getNextStages(task)
                
                return (
                  <Card key={task.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      {/* Task Header */}
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <h3 className="font-medium">{task.order_item.product_name}</h3>
                            {task.batch?.workflow_template && (
                              <Badge variant="outline" className="text-xs">
                                <Zap className="h-3 w-3 mr-1" />
                                Workflow
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-600">
                            Order: {task.order_item.order.order_number}
                          </p>
                          <div className="flex items-center space-x-2 mt-1">
                            <MapPin className="h-3 w-3 text-gray-400" />
                            <span className="text-sm text-gray-500">
                              {task.stage?.charAt(0).toUpperCase() + task.stage?.slice(1) || task.task_type}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end space-y-1">
                          <Badge variant={getStatusColor(task.status)}>
                            {task.status.replace('_', ' ')}
                          </Badge>
                          <Badge variant={getPriorityColor(task.priority)} className="text-xs">
                            {task.priority}
                          </Badge>
                        </div>
                      </div>

                      {/* Workflow Context */}
                      {task.batch?.workflow_template && (
                        <div className="mb-3 p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="text-sm font-medium text-gray-700">Stage Progress</h4>
                            <span className="text-xs text-gray-500">
                              {progress.current}/{progress.total}
                            </span>
                          </div>
                          
                          {/* Next Stages Preview */}
                          {nextStages.length > 0 && (
                            <div className="flex items-center space-x-2 text-xs text-gray-600">
                              <span>Up next:</span>
                              <div className="flex items-center space-x-1">
                                {nextStages.map((stage: any, index: number) => (
                                  <div key={stage.stage} className="flex items-center">
                                    <span className="bg-white px-2 py-1 rounded border">
                                      {stage.name || stage.stage}
                                    </span>
                                    {index < nextStages.length - 1 && (
                                      <ArrowRight className="h-3 w-3 mx-1" />
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                      
                      {/* Time Information */}
                      <div className="flex justify-between items-center mb-3">
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <div className="flex items-center">
                            <Clock className="w-4 h-4 mr-1" />
                            {task.estimated_hours ? `${task.estimated_hours}h est.` : 'No estimate'}
                          </div>
                          {task.actual_hours && (
                            <div className="flex items-center">
                              <Timer className="w-4 h-4 mr-1" />
                              {task.actual_hours}h actual
                            </div>
                          )}
                          {task.batch_id && (
                            <div className="flex items-center">
                              <Package className="w-4 h-4 mr-1" />
                              Batch
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Action Buttons */}
                      <div className="flex justify-between items-center">
                        <div>
                          {task.priority === 'urgent' && (
                            <div className="flex items-center text-red-600 text-sm">
                              <AlertCircle className="h-4 w-4 mr-1" />
                              Urgent Priority
                            </div>
                          )}
                        </div>
                        
                        <div className="flex space-x-2">
                          {task.status === 'assigned' && (
                            <>
                              <Button 
                                size="sm" 
                                variant="outline"
                                className="border-blue-200 hover:bg-blue-50"
                                onClick={() => {
                                  setSelectedTask(task)
                                  setCheckpointType('pre_work')
                                  setQualityCheckpointModalOpen(true)
                                }}
                              >
                                <Shield className="w-4 h-4 mr-1" />
                                Pre-Work Checks
                              </Button>
                              <Button 
                                size="sm" 
                                className="bg-green-600 hover:bg-green-700"
                                onClick={() => updateTask.mutate({ taskId: task.id, action: 'start' })}
                              >
                                <Play className="w-4 h-4 mr-1" />
                                Start Task
                              </Button>
                            </>
                          )}
                          
                          {task.status === 'in_progress' && (
                            <>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => updateTask.mutate({ taskId: task.id, action: 'pause' })}
                              >
                                <Pause className="w-4 h-4 mr-1" />
                                Pause
                              </Button>
                              {task.task_type === 'qc' || task.stage === 'qc' ? (
                                <Button 
                                  size="sm" 
                                  className="bg-blue-600 hover:bg-blue-700"
                                  onClick={() => {
                                    setSelectedTask(task)
                                    setQcModalOpen(true)
                                  }}
                                >
                                  <Clipboard className="w-4 h-4 mr-1" />
                                  QC Check
                                </Button>
                              ) : (
                                <>
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    className="border-green-200 hover:bg-green-50"
                                    onClick={() => {
                                      setSelectedTask(task)
                                      setCheckpointType('post_work')
                                      setQualityCheckpointModalOpen(true)
                                    }}
                                  >
                                    <Shield className="w-4 h-4 mr-1" />
                                    Quality Check
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    className="bg-green-600 hover:bg-green-700"
                                    onClick={() => updateTask.mutate({ taskId: task.id, action: 'complete' })}
                                  >
                                    <CheckCircle className="w-4 h-4 mr-1" />
                                    Complete
                                  </Button>
                                </>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                      
                      {/* Notes */}
                      {task.notes && (
                        <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm">
                          <strong className="text-yellow-800">Notes:</strong>
                          <span className="text-yellow-700 ml-2">{task.notes}</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>
        )
      })}
      
      {tasks.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No tasks assigned</h3>
            <p className="text-gray-500">Check back later for new tasks or contact your supervisor.</p>
          </CardContent>
        </Card>
      )}
      
      {selectedTask && (
        <>
          <QCModal
            open={qcModalOpen}
            onClose={() => {
              setQcModalOpen(false)
              setSelectedTask(null)
            }}
            taskId={selectedTask.id}
            productName={selectedTask.order_item.product_name}
            onComplete={() => {
              queryClient.invalidateQueries({ queryKey: ['worker-tasks-enhanced', workerId] })
            }}
          />
          
          <QualityCheckpointModal
            open={qualityCheckpointModalOpen}
            onClose={() => {
              setQualityCheckpointModalOpen(false)
              setSelectedTask(null)
            }}
            taskId={selectedTask.id}
            stage={selectedTask.stage}
            checkpointType={checkpointType}
            productName={selectedTask.order_item.product_name}
            onComplete={(canProceed) => {
              if (canProceed) {
                if (checkpointType === 'pre_work' && selectedTask.status === 'assigned') {
                  // Auto-start task after successful pre-work checks
                  updateTask.mutate({ taskId: selectedTask.id, action: 'start' })
                }
                queryClient.invalidateQueries({ queryKey: ['worker-tasks-enhanced', workerId] })
              }
              setQualityCheckpointModalOpen(false)
              setSelectedTask(null)
            }}
          />
        </>
      )}
    </div>
  )
} 