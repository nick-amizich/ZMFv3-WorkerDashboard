'use client'

import { TaskAssignmentBoard } from '@/components/manager/task-assignment-board'
import { CreateTaskModal } from '@/components/manager/create-task-modal'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from '@/components/ui/toaster'

const queryClient = new QueryClient()

export default function TasksPage() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold">Task Assignment</h2>
            <p className="text-muted-foreground">Drag and drop tasks to assign them to workers</p>
          </div>
          <CreateTaskModal />
        </div>
        
        <TaskAssignmentBoard />
        <Toaster />
      </div>
    </QueryClientProvider>
  )
}