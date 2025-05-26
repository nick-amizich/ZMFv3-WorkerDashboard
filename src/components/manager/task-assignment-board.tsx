'use client'

import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { useCallback, useMemo, useState, memo } from 'react'

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

// Memoized task card component for better performance
const TaskCard = memo(({ 
  task, 
  index, 
  isDragDisabled = false 
}: { 
  task: Task
  index: number
  isDragDisabled?: boolean
}) => {
  const headphoneSpecs = task.order_item.product_data?.headphone_specs
  const isCustomWork = Boolean(headphoneSpecs?.custom_engraving)
  const isAssigned = Boolean(task.assigned_to)
  
  return (
    <Draggable key={task.id} draggableId={task.id} index={index} isDragDisabled={isDragDisabled}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`
            p-4 border rounded-lg shadow-sm cursor-grab active:cursor-grabbing
            transition-shadow duration-150 ease-out
            ${snapshot.isDragging ? 'shadow-lg rotate-1' : 'hover:shadow-md'}
            ${isAssigned 
              ? isCustomWork 
                ? 'bg-yellow-50 border-yellow-200' 
                : 'bg-blue-50 border-blue-200'
              : isCustomWork 
                ? 'border-yellow-300 bg-yellow-50' 
                : 'bg-white border-gray-200'
            }
            ${snapshot.isDragging ? 'z-50' : ''}
          `}
          style={{
            ...provided.draggableProps.style,
            transform: snapshot.isDragging 
              ? `${provided.draggableProps.style?.transform} rotate(2deg)`
              : provided.draggableProps.style?.transform
          }}
        >
          {/* Simplified content for performance */}
          <div className="space-y-2">
            <h4 className="font-semibold text-gray-900 text-sm leading-tight">
              {task.order_item.product_name}
            </h4>
            
            {/* Wood Type - Prominently Displayed */}
            {headphoneSpecs?.wood_type && (
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-amber-100 border border-amber-300"></div>
                <span className="text-sm font-semibold text-amber-800">
                  {headphoneSpecs.wood_type}
                </span>
              </div>
            )}
          </div>
          
          {/* Simplified details */}
          <div className="flex justify-between items-center mt-3">
            <Badge 
              variant="outline" 
              className={`text-xs px-2 py-0.5 ${
                task.task_type === 'sanding' ? 'border-orange-300 text-orange-700' :
                task.task_type === 'assembly' ? 'border-blue-300 text-blue-700' :
                task.task_type === 'qc' ? 'border-green-300 text-green-700' :
                'border-purple-300 text-purple-700'
              }`}
            >
              {task.task_type}
            </Badge>
            
            <span className="text-xs text-gray-500">
              #{task.order_item.order.order_number}
            </span>
          </div>
          
          {/* Custom work indicator */}
          {isCustomWork && (
            <div className="mt-2 text-xs text-yellow-700 font-medium">
              Custom Work
            </div>
          )}
        </div>
      )}
    </Draggable>
  )
})

TaskCard.displayName = 'TaskCard'

// Memoized worker column component
const WorkerColumn = memo(({ 
  worker, 
  tasks, 
  isDragDisabled 
}: { 
  worker: Worker
  tasks: Task[]
  isDragDisabled: boolean
}) => {
  const workerTasks = useMemo(() => 
    tasks.filter(task => task.assigned_to?.name === worker.name),
    [tasks, worker.name]
  )

  return (
    <Droppable droppableId={worker.id}>
      {(provided, snapshot) => (
        <Card className={snapshot.isDraggingOver ? 'ring-2 ring-blue-300' : ''}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
              {worker.name}
            </CardTitle>
            <div className="text-xs text-muted-foreground">
              {workerTasks.length} active task{workerTasks.length !== 1 ? 's' : ''}
            </div>
          </CardHeader>
          <CardContent
            ref={provided.innerRef}
            {...provided.droppableProps}
            className="space-y-2 min-h-96"
          >
            {workerTasks.map((task, index) => (
              <TaskCard
                key={task.id}
                task={task}
                index={index}
                isDragDisabled={isDragDisabled}
              />
            ))}
            {provided.placeholder}
          </CardContent>
        </Card>
      )}
    </Droppable>
  )
})

WorkerColumn.displayName = 'WorkerColumn'

export function TaskAssignmentBoard() {
  const [isDragging, setIsDragging] = useState(false)
  const queryClient = useQueryClient()
  const { toast } = useToast()
  
  // Disable auto-refresh during drag operations for smoother performance
  const { data: tasksResponse } = useQuery({
    queryKey: ['tasks'],
    queryFn: async () => {
      const response = await fetch('/api/tasks')
      if (!response.ok) throw new Error('Failed to fetch tasks')
      return response.json()
    },
    refetchInterval: isDragging ? false : 30000,
    staleTime: 10000 // Cache for 10 seconds to reduce unnecessary requests
  })

  const { data: workers = [] } = useQuery({
    queryKey: ['workers'],
    queryFn: async () => {
      const response = await fetch('/api/workers')
      if (!response.ok) throw new Error('Failed to fetch workers')
      return response.json()
    },
    staleTime: 60000 // Workers change less frequently
  })

  const tasks = useMemo(() => tasksResponse?.tasks || [], [tasksResponse])
  
  const pendingTasks = useMemo(() => 
    tasks.filter((task: Task) => !task.assigned_to),
    [tasks]
  )

  const activeWorkers = useMemo(() => 
    workers.filter((w: Worker) => w.role === 'worker').slice(0, 3),
    [workers]
  )

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
    // Optimistic updates for instant UI response
    onMutate: async ({ taskId, workerId }) => {
      // Cancel any outgoing refetches so they don't overwrite our optimistic update
      await queryClient.cancelQueries({ queryKey: ['tasks'] })

      // Snapshot the previous value
      const previousTasks = queryClient.getQueryData(['tasks'])

      // Optimistically update the task assignment
      queryClient.setQueryData(['tasks'], (old: any) => {
        if (!old?.tasks) return old

        const updatedTasks = old.tasks.map((task: Task) => {
          if (task.id === taskId) {
            if (workerId) {
              // Find worker name for assignment
              const worker = workers.find((w: Worker) => w.id === workerId)
              return {
                ...task,
                assigned_to: worker ? { name: worker.name, role: worker.role } : null
              }
            } else {
              // Unassign task
              return {
                ...task,
                assigned_to: undefined
              }
            }
          }
          return task
        })

        return { ...old, tasks: updatedTasks }
      })

      // Return a context object with the snapshotted value
      return { previousTasks }
    },
    onError: (err, variables, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousTasks) {
        queryClient.setQueryData(['tasks'], context.previousTasks)
      }
      toast({ 
        title: 'Assignment failed', 
        description: err.message,
        variant: 'destructive'
      })
      setIsDragging(false)
    },
    onSuccess: () => {
      toast({ title: 'Task assigned successfully' })
      setIsDragging(false)
    },
    // Always refetch after error or success to ensure we have the latest data
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    }
  })

  const handleDragStart = useCallback(() => {
    setIsDragging(true)
  }, [])

  const handleDragEnd = useCallback((result: DropResult) => {
    if (!result.destination) {
      setIsDragging(false)
      return
    }
    
    const taskId = result.draggableId
    const workerId = result.destination.droppableId === 'unassigned' 
      ? null 
      : result.destination.droppableId
    
    assignTask.mutate({ taskId, workerId })
  }, [assignTask])

  return (
    <DragDropContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Unassigned Tasks Column */}
        <Droppable droppableId="unassigned">
          {(provided, snapshot) => (
            <Card className={snapshot.isDraggingOver ? 'ring-2 ring-gray-300' : ''}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-gray-400"></div>
                  Pending Builds ({pendingTasks.length})
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  Drag tasks to assign to workers
                </p>
              </CardHeader>
              <CardContent 
                ref={provided.innerRef} 
                {...provided.droppableProps}
                className="space-y-2 min-h-96"
              >
                {pendingTasks.map((task: Task, index: number) => (
                  <TaskCard 
                    key={task.id}
                    task={task} 
                    index={index}
                    isDragDisabled={assignTask.isPending}
                  />
                ))}
                {provided.placeholder}
              </CardContent>
            </Card>
          )}
        </Droppable>

        {/* Worker Columns */}
        {activeWorkers.map((worker: Worker) => (
          <WorkerColumn 
            key={worker.id}
            worker={worker}
            tasks={tasks}
            isDragDisabled={assignTask.isPending}
          />
        ))}
      </div>
    </DragDropContext>
  )
}