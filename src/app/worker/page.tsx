'use client'

import { EnhancedWorkerTaskList } from '@/components/worker/enhanced-task-list'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from '@/components/ui/toaster'
import { useEffect, useState } from 'react'
import { ClipboardList, Clock, CheckCircle, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const queryClient = new QueryClient()

export default function WorkerTasksPage() {
  const [worker, setWorker] = useState<any>(null)
  const [stats, setStats] = useState({
    totalTasks: 0,
    inProgress: 0,
    completed: 0,
    urgent: 0
  })

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [workerResponse, statsResponse] = await Promise.all([
          fetch('/api/worker/me'),
          fetch('/api/worker/stats')
        ])
        
        const [workerData, statsData] = await Promise.all([
          workerResponse.json(),
          statsResponse.json()
        ])
        
        if (workerData.worker) {
          setWorker(workerData.worker)
        }
        
        if (statsData) {
          setStats(statsData)
        }
      } catch (error) {
        console.error('Error fetching data:', error)
      }
    }
    
    fetchData()
  }, [])

  if (!worker) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading tasks...</p>
        </div>
      </div>
    )
  }

  return (
    <QueryClientProvider client={queryClient}>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">My Tasks</h2>
          <p className="text-muted-foreground">View and manage your assigned production tasks</p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
              <ClipboardList className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalTasks}</div>
              <p className="text-xs text-muted-foreground">Assigned to you</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">In Progress</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.inProgress}</div>
              <p className="text-xs text-muted-foreground">Currently working</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.completed}</div>
              <p className="text-xs text-muted-foreground">This week</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Urgent</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.urgent}</div>
              <p className="text-xs text-muted-foreground">High priority</p>
            </CardContent>
          </Card>
        </div>

        {/* Task List */}
        <EnhancedWorkerTaskList workerId={worker.id} />
      </div>
      <Toaster />
    </QueryClientProvider>
  )
}