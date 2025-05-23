'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Clock, Play, Pause, CheckCircle, Clipboard } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { QCModal } from './qc-modal'

interface WorkerTaskListProps {
  workerId: string
}

export function WorkerTaskList({ workerId }: WorkerTaskListProps) {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [qcModalOpen, setQcModalOpen] = useState(false)
  const [selectedTask, setSelectedTask] = useState<any>(null)

  const { data: tasks = [] } = useQuery({
    queryKey: ['worker-tasks', workerId],
    queryFn: async () => {
      const response = await fetch(`/api/tasks/worker/${workerId}`)
      if (!response.ok) throw new Error('Failed to fetch tasks')
      return response.json()
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
      queryClient.invalidateQueries({ queryKey: ['worker-tasks', workerId] })
      toast({
        title: `Task ${action}ed successfully`,
        description: action === 'complete' ? 'Great job!' : undefined
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

  return (
    <div className="space-y-4 p-4">
      <h2 className="text-xl font-semibold">My Tasks ({tasks.length})</h2>
      
      {tasks.map((task: any) => (
        <Card key={task.id} className="touch-manipulation">
          <CardContent className="p-4">
            <div className="flex justify-between items-start mb-3">
              <div className="flex-1">
                <h3 className="font-medium">{task.order_item.product_name}</h3>
                <p className="text-sm text-gray-600">
                  Order: {task.order_item.order.order_number}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  {task.task_type.charAt(0).toUpperCase() + task.task_type.slice(1)}
                </p>
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
            
            <div className="flex justify-between items-center">
              <div className="flex items-center text-sm text-gray-500">
                <Clock className="w-4 h-4 mr-1" />
                {task.estimated_hours ? `${task.estimated_hours}h estimated` : 'No estimate'}
                {task.actual_hours && ` • ${task.actual_hours}h actual`}
              </div>
              
              <div className="flex space-x-2">
                {task.status === 'assigned' && (
                  <Button 
                    size="sm" 
                    className="touch-manipulation min-h-10"
                    onClick={() => updateTask.mutate({ taskId: task.id, action: 'start' })}
                  >
                    <Play className="w-4 h-4 mr-1" />
                    Start
                  </Button>
                )}
                
                {task.status === 'in_progress' && (
                  <>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="touch-manipulation min-h-10"
                      onClick={() => updateTask.mutate({ taskId: task.id, action: 'pause' })}
                    >
                      <Pause className="w-4 h-4 mr-1" />
                      Pause
                    </Button>
                    {task.task_type === 'qc' ? (
                      <Button 
                        size="sm" 
                        className="touch-manipulation min-h-10"
                        onClick={() => {
                          setSelectedTask(task)
                          setQcModalOpen(true)
                        }}
                      >
                        <Clipboard className="w-4 h-4 mr-1" />
                        QC Check
                      </Button>
                    ) : (
                      <Button 
                        size="sm" 
                        className="touch-manipulation min-h-10"
                        onClick={() => updateTask.mutate({ taskId: task.id, action: 'complete' })}
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Complete
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>
            
            {task.notes && (
              <div className="mt-3 p-2 bg-gray-50 rounded text-sm">
                <strong>Notes:</strong> {task.notes}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
      
      {tasks.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">No tasks assigned to you yet.</p>
          </CardContent>
        </Card>
      )}
      
      {selectedTask && (
        <QCModal
          open={qcModalOpen}
          onClose={() => {
            setQcModalOpen(false)
            setSelectedTask(null)
          }}
          taskId={selectedTask.id}
          productName={selectedTask.order_item.product_name}
          onComplete={() => {
            queryClient.invalidateQueries({ queryKey: ['worker-tasks', workerId] })
          }}
        />
      )}
    </div>
  )
}