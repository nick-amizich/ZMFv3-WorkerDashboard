'use client'

import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'

interface Task {
  id: string
  task_type: string
  priority: 'low' | 'normal' | 'high' | 'urgent'
  order_item: {
    product_name: string
    order: {
      order_number: string
      customer_name: string
    }
  }
  assigned_to?: {
    name: string
  }
}

interface Worker {
  id: string
  name: string
  role: string
  skills: string[]
}

export function TaskAssignmentBoard() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  
  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: async () => {
      const response = await fetch('/api/tasks')
      if (!response.ok) throw new Error('Failed to fetch tasks')
      return response.json()
    },
    refetchInterval: 30000 // Auto-refresh every 30 seconds
  })

  const { data: workers = [] } = useQuery({
    queryKey: ['workers'],
    queryFn: async () => {
      const response = await fetch('/api/workers')
      if (!response.ok) throw new Error('Failed to fetch workers')
      return response.json()
    }
  })

  const assignTask = useMutation({
    mutationFn: async ({ taskId, workerId }: { taskId: string; workerId: string | null }) => {
      const response = await fetch('/api/tasks/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId, workerId })
      })
      if (!response.ok) throw new Error('Failed to assign task')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      toast({ title: 'Task assigned successfully' })
    },
    onError: (error) => {
      toast({ 
        title: 'Assignment failed', 
        description: error.message,
        variant: 'destructive'
      })
    }
  })

  const handleDragEnd = (result: any) => {
    if (!result.destination) return
    
    const taskId = result.draggableId
    const workerId = result.destination.droppableId === 'unassigned' 
      ? null 
      : result.destination.droppableId
    
    assignTask.mutate({ taskId, workerId })
  }

  const pendingTasks = tasks.filter((task: Task) => !task.assigned_to)
  
  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Unassigned Tasks Column */}
        <Droppable droppableId="unassigned">
          {(provided) => (
            <Card>
              <CardHeader>
                <CardTitle>Pending Orders ({pendingTasks.length})</CardTitle>
              </CardHeader>
              <CardContent 
                ref={provided.innerRef} 
                {...provided.droppableProps}
                className="space-y-2 min-h-96"
              >
                {pendingTasks.map((task: Task, index: number) => (
                  <Draggable key={task.id} draggableId={task.id} index={index}>
                    {(provided) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        className="p-3 bg-white border rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-grab"
                      >
                        <div className="font-medium text-sm">
                          {task.order_item.product_name}
                        </div>
                        <div className="text-xs text-gray-500">
                          Order: {task.order_item.order.order_number}
                        </div>
                        <div className="flex justify-between items-center mt-2">
                          <Badge variant="outline">{task.task_type}</Badge>
                          <Badge 
                            variant={
                              task.priority === 'urgent' ? 'destructive' :
                              task.priority === 'high' ? 'default' : 'secondary'
                            }
                          >
                            {task.priority}
                          </Badge>
                        </div>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </CardContent>
            </Card>
          )}
        </Droppable>

        {/* Worker Columns */}
        {workers.filter((w: Worker) => w.role === 'worker').slice(0, 3).map((worker: Worker) => {
          const workerTasks = tasks.filter((task: Task) => 
            task.assigned_to?.name === worker.name
          )
          
          return (
            <Droppable key={worker.id} droppableId={worker.id}>
              {(provided) => (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">
                      {worker.name} ({workerTasks.length})
                    </CardTitle>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {worker.skills.map((skill) => (
                        <Badge key={skill} variant="outline" className="text-xs">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </CardHeader>
                  <CardContent
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className="space-y-2 min-h-96"
                  >
                    {workerTasks.map((task: Task, index: number) => (
                      <div key={task.id} className="p-2 bg-blue-50 border border-blue-200 rounded">
                        <div className="font-medium text-xs">
                          {task.order_item.product_name}
                        </div>
                        <Badge variant="outline" className="text-xs mt-1">
                          {task.task_type}
                        </Badge>
                      </div>
                    ))}
                    {provided.placeholder}
                  </CardContent>
                </Card>
              )}
            </Droppable>
          )
        })}
      </div>
    </DragDropContext>
  )
}