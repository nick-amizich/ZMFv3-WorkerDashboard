'use client'

import { EnhancedWorkerTaskList } from '@/components/worker/enhanced-task-list'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from '@/components/ui/toaster'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { useEffect, useState } from 'react'
import { 
  ClipboardList, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Workflow, 
  Factory, 
  TrendingUp,
  MapPin,
  ArrowRight,
  Target,
  CheckSquare
} from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

const queryClient = new QueryClient()

interface WorkflowProgress {
  workflowName: string
  currentStage: string
  stageProgress: number
  totalStages: number
  batchName: string
  nextStages: string[]
}

export default function WorkerDashboard() {
  const [worker, setWorker] = useState<any>(null)
  const [stats, setStats] = useState({
    totalTasks: 0,
    inProgress: 0,
    completed: 0,
    urgent: 0,
    batches: 0,
    workflows: 0
  })
  const [workflowProgress, setWorkflowProgress] = useState<WorkflowProgress[]>([])
  const [currentWorkflow, setCurrentWorkflow] = useState<WorkflowProgress | null>(null)

  const fetchWorkflowProgress = async (workerId?: string): Promise<WorkflowProgress[]> => {
    try {
      const id = workerId || worker?.id
      if (!id) return []
      
      const response = await fetch(`/api/tasks/worker/${id}`)
      if (!response.ok) return []
      
      const tasks = await response.json()
      
      // Group by batch and calculate workflow progress
      const batchProgress = new Map<string, WorkflowProgress>()
      
      tasks.forEach((task: any) => {
        if (task.batch_id && task.batch?.workflow_template) {
          const batchId = task.batch_id
          const workflow = task.batch.workflow_template
          const stages = workflow.stages || []
          const currentStageIndex = stages.findIndex((s: any) => s.stage === task.batch.current_stage)
          
          if (!batchProgress.has(batchId)) {
            batchProgress.set(batchId, {
              workflowName: workflow.name,
              currentStage: task.batch.current_stage,
              stageProgress: Math.max(0, currentStageIndex + 1),
              totalStages: stages.length,
              batchName: task.batch.name,
              nextStages: stages.slice(currentStageIndex + 1, currentStageIndex + 3).map((s: any) => s.name || s.stage)
            })
          }
        }
      })
      
      return Array.from(batchProgress.values())
    } catch (error) {
      console.error('Error fetching workflow progress:', error)
      return []
    }
  }

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
          
          // Fetch workflow progress after we have worker data
          const workflowData = await fetchWorkflowProgress(workerData.worker.id)
          setWorkflowProgress(workflowData)
          
          if (statsData) {
            setStats({
              ...statsData,
              batches: workflowData.length,
              workflows: new Set(workflowData.map((w: WorkflowProgress) => w.workflowName)).size
            })
          }
          
          // Set current active workflow (first in progress)
          const activeWorkflow = workflowData.find((w: WorkflowProgress) => w.stageProgress < w.totalStages)
          setCurrentWorkflow(activeWorkflow || null)
        }
      } catch (error) {
        console.error('Error fetching data:', error)
      }
    }
    
    fetchData()
  }, [fetchWorkflowProgress])

  if (!worker) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <QueryClientProvider client={queryClient}>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">Welcome back, {worker.name}!</h2>
          <p className="text-muted-foreground">Here&apos;s your workflow and task overview for today</p>
        </div>

        {/* Enhanced Statistics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
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

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Batches</CardTitle>
              <Factory className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.batches}</div>
              <p className="text-xs text-muted-foreground">Active batches</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Workflows</CardTitle>
              <Workflow className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.workflows}</div>
              <p className="text-xs text-muted-foreground">Different workflows</p>
            </CardContent>
          </Card>
        </div>

        {/* Current Workflow Progress */}
        {currentWorkflow && (
          <Card className="border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-900">
                <Target className="h-5 w-5" />
                Current Focus: {currentWorkflow.workflowName}
              </CardTitle>
              <p className="text-blue-700">
                Batch: {currentWorkflow.batchName} • Stage: {currentWorkflow.currentStage}
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Progress Bar */}
                <div>
                  <div className="flex items-center justify-between text-sm text-blue-700 mb-2">
                    <span>Workflow Progress</span>
                    <span>{currentWorkflow.stageProgress} of {currentWorkflow.totalStages} stages</span>
                  </div>
                  <Progress 
                    value={(currentWorkflow.stageProgress / currentWorkflow.totalStages) * 100} 
                    className="h-3" 
                  />
                </div>

                {/* Next Stages */}
                {currentWorkflow.nextStages.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-blue-800 mb-2">What&apos;s Next:</h4>
                    <div className="flex items-center space-x-2 text-sm">
                      <MapPin className="h-4 w-4 text-blue-600" />
                      <span className="font-medium text-blue-900">{currentWorkflow.currentStage}</span>
                      {currentWorkflow.nextStages.map((stage, index) => (
                        <div key={stage} className="flex items-center space-x-2">
                          <ArrowRight className="h-4 w-4 text-blue-400" />
                          <Badge variant="outline" className="bg-white text-blue-700 border-blue-300">
                            {stage}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* All Workflow Progress Overview */}
        {workflowProgress.length > 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                All Workflow Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {workflowProgress.map((workflow, index) => (
                  <div key={index} className="p-3 rounded-lg border bg-muted/30">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-sm">{workflow.workflowName}</h4>
                      <Badge variant="outline" className="text-xs">
                        {workflow.stageProgress}/{workflow.totalStages}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">{workflow.batchName}</p>
                    <Progress 
                      value={(workflow.stageProgress / workflow.totalStages) * 100} 
                      className="h-2"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Current: {workflow.currentStage}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* QC Checklist Quick Access Card */}
        <Card className="border-green-200 bg-gradient-to-r from-green-50 to-emerald-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-900">
              <CheckSquare className="h-5 w-5" />
              Quality Control Checklist
            </CardTitle>
            <p className="text-green-700">
              Complete quality checks for each production step
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <p className="text-sm text-green-800">
                Use the QC checklist to ensure every headphone meets our quality standards. 
                Track your progress through each production step with our mobile-friendly interface.
              </p>
              <div className="flex items-center gap-4 text-sm text-green-700">
                <div className="flex items-center gap-1">
                  <CheckCircle className="h-4 w-4" />
                  <span>8 Production Steps</span>
                </div>
                <div className="flex items-center gap-1">
                  <ClipboardList className="h-4 w-4" />
                  <span>Detailed Checklists</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  <span>Auto-save Progress</span>
                </div>
              </div>
              <Link href="/worker/qc-checklist">
                <Button className="w-full bg-green-600 hover:bg-green-700 text-white">
                  Open QC Checklist
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Enhanced Task List with Workflow Context */}
        <div>
          <div className="flex items-center space-x-2 mb-4">
            <Workflow className="h-5 w-5 text-blue-600" />
            <h3 className="text-lg font-semibold">Your Tasks & Workflows</h3>
          </div>
          <EnhancedWorkerTaskList workerId={worker.id} />
        </div>
      </div>
      <Toaster />
    </QueryClientProvider>
  )
}