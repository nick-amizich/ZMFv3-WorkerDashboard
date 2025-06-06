'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { useToast } from '@/hooks/use-toast'
import { 
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle,
  Settings,
  Play,
  Pause,
  RotateCcw,
  TrendingUp,
  Package,
  Users,
  Wrench,
  Zap,
  ArrowRight,
  AlertCircle,
  Timer,
  Plus
} from 'lucide-react'
import { logBusiness, logError } from '@/lib/logger-client'

interface ScheduledJob {
  id: string
  production_request_id: string
  machine_id: string
  operator_id: string | null
  scheduled_start: string
  scheduled_end: string
  actual_start: string | null
  actual_end: string | null
  status: 'scheduled' | 'in_progress' | 'completed' | 'delayed' | 'cancelled'
  priority: number
  setup_time_minutes: number
  run_time_minutes: number
  conflicts: string[]
  dependencies: string[]
  production_request?: {
    customer_name: string
    quantity_ordered: number
    quantity_completed: number | null
    due_date: string
    priority: string
    part?: {
      part_name: string
      part_type: string
    }
  }
  machine?: {
    machine_name: string
    machine_type: string
    status: string
  }
  operator?: {
    name: string
  }
}

interface TimeSlot {
  start: Date
  end: Date
  machineId: string
  jobId?: string
  type: 'available' | 'scheduled' | 'maintenance' | 'unavailable'
}

interface ScheduleConflict {
  job1: ScheduledJob
  job2: ScheduledJob
  type: 'machine' | 'operator' | 'time'
  severity: 'low' | 'medium' | 'high'
  resolution: string
}

export function ProductionScheduler() {
  const [scheduledJobs, setScheduledJobs] = useState<ScheduledJob[]>([])
  const [productionRequests, setProductionRequests] = useState<any[]>([])
  const [machines, setMachines] = useState<any[]>([])
  const [operators, setOperators] = useState<any[]>([])
  const [conflicts, setConflicts] = useState<ScheduleConflict[]>([])
  const [loading, setLoading] = useState(true)
  const [isScheduleDialogOpen, setIsScheduleDialogOpen] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState<any>(null)
  const [viewMode, setViewMode] = useState<'timeline' | 'list' | 'conflicts'>('timeline')
  const [dateRange, setDateRange] = useState({
    start: new Date(),
    end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  })
  const { toast } = useToast()
  const supabase = createClient()

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      // Load all necessary data from APIs
      const [requestsRes, machinesRes, scheduleRes] = await Promise.all([
        fetch('/api/south/production-requests?status=pending&status=in_production'),
        fetch('/api/south/machines?status=operational'),
        fetch(`/api/south/production-schedule?start_date=${dateRange.start.toISOString()}&end_date=${dateRange.end.toISOString()}`)
      ])

      if (!requestsRes.ok) throw new Error('Failed to fetch requests')
      if (!machinesRes.ok) throw new Error('Failed to fetch machines')
      if (!scheduleRes.ok) throw new Error('Failed to fetch schedule')

      const { requests } = await requestsRes.json()
      const { machines: machinesData } = await machinesRes.json()
      const { schedules } = await scheduleRes.json()

      // For operators, we'll still use Supabase directly
      const operatorsRes = await supabase
        .from('workers')
        .select('*')
        .eq('is_active', true)
        .order('name')
      
      if (operatorsRes.error) throw operatorsRes.error

      // Use existing schedule or generate if none exist
      let jobs: ScheduledJob[] = schedules && schedules.length > 0 
        ? schedules
        : generateScheduledJobs(
            requests || [],
            machinesData || [],
            operatorsRes.data || []
          )

      // Detect conflicts
      const detectedConflicts = detectScheduleConflicts(jobs)

      setProductionRequests(requests || [])
      setMachines(machinesData || [])
      setOperators(operatorsRes.data || [])
      setScheduledJobs(jobs)
      setConflicts(detectedConflicts)

      logBusiness('Schedule data loaded', 'PRODUCTION_SCHEDULER', {
        totalJobs: jobs.length,
        conflictCount: detectedConflicts.length
      })
    } catch (error) {
      logError(error as Error, 'PRODUCTION_SCHEDULER', { action: 'load_data' })
      toast({
        title: 'Error',
        description: 'Failed to load schedule data',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  function generateScheduledJobs(
    requests: any[],
    machines: any[],
    operators: any[]
  ): ScheduledJob[] {
    const jobs: ScheduledJob[] = []
    const machineSchedules = new Map<string, Date>()

    // Initialize machine schedules to current time
    machines.forEach(m => machineSchedules.set(m.id, new Date()))

    // Sort requests by priority and due date
    const sortedRequests = [...requests].sort((a, b) => {
      const priorityOrder = { rush: 0, high: 1, normal: 2, low: 3 }
      const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] || 3
      const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] || 3
      
      if (aPriority !== bPriority) return aPriority - bPriority
      return new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
    })

    sortedRequests.forEach(request => {
      // Find best machine based on availability and capability
      const suitableMachines = machines.filter(m => 
        canMachineProducePart(m, request.part)
      )

      if (suitableMachines.length === 0) return

      // Find machine with earliest availability
      let bestMachine = suitableMachines[0]
      let earliestTime = machineSchedules.get(bestMachine.id)!

      suitableMachines.forEach(machine => {
        const availableTime = machineSchedules.get(machine.id)!
        if (availableTime < earliestTime) {
          bestMachine = machine
          earliestTime = availableTime
        }
      })

      // Calculate timing
      const setupTime = estimateSetupTime(request.part)
      const runTime = estimateRunTime(request.part, request.quantity_ordered)
      const totalTime = setupTime + runTime

      const scheduledStart = new Date(earliestTime)
      const scheduledEnd = new Date(scheduledStart.getTime() + totalTime * 60 * 1000)

      // Check if we can meet the due date
      const dueDate = new Date(request.due_date)
      const status = scheduledEnd > dueDate ? 'delayed' : 'scheduled'

      // Create scheduled job
      const job: ScheduledJob = {
        id: `job-${request.id}`,
        production_request_id: request.id,
        machine_id: bestMachine.id,
        operator_id: operators[Math.floor(Math.random() * operators.length)]?.auth_user_id || null,
        scheduled_start: scheduledStart.toISOString(),
        scheduled_end: scheduledEnd.toISOString(),
        actual_start: null,
        actual_end: null,
        status,
        priority: request.priority === 'rush' ? 1 : request.priority === 'high' ? 2 : 3,
        setup_time_minutes: setupTime,
        run_time_minutes: runTime,
        conflicts: [],
        dependencies: [],
        production_request: {
          customer_name: request.customer_name,
          quantity_ordered: request.quantity_ordered,
          quantity_completed: request.quantity_completed,
          due_date: request.due_date,
          priority: request.priority,
          part: request.part
        },
        machine: {
          machine_name: bestMachine.machine_name,
          machine_type: bestMachine.machine_type,
          status: bestMachine.status
        }
      }

      jobs.push(job)

      // Update machine availability
      machineSchedules.set(bestMachine.id, scheduledEnd)
    })

    return jobs
  }

  function canMachineProducePart(machine: any, part: any): boolean {
    // Handle null/undefined part
    if (!part) return true
    
    // Simplified logic - in reality would check machine capabilities
    if (part.part_type === 'cup' && machine.machine_type.includes('Mill')) return true
    if (part.part_type === 'baffle' && machine.machine_type.includes('Lathe')) return true
    return true // For demo purposes
  }

  function estimateSetupTime(part: any): number {
    // Handle null/undefined part
    if (!part || !part.part_type) return 20
    
    // Simplified estimation
    return part.part_type === 'cup' ? 30 : 20
  }

  function estimateRunTime(part: any, quantity: number): number {
    // Handle null/undefined part
    if (!part || !part.part_type) {
      const defaultTimePerUnit = 10
      return defaultTimePerUnit * quantity
    }
    
    // Simplified estimation
    const timePerUnit = part.part_type === 'cup' ? 15 : 10
    return timePerUnit * quantity
  }

  function detectScheduleConflicts(jobs: ScheduledJob[]): ScheduleConflict[] {
    const conflicts: ScheduleConflict[] = []

    // Check for machine conflicts
    for (let i = 0; i < jobs.length; i++) {
      for (let j = i + 1; j < jobs.length; j++) {
        const job1 = jobs[i]
        const job2 = jobs[j]

        // Same machine conflict
        if (job1.machine_id === job2.machine_id) {
          const start1 = new Date(job1.scheduled_start)
          const end1 = new Date(job1.scheduled_end)
          const start2 = new Date(job2.scheduled_start)
          const end2 = new Date(job2.scheduled_end)

          if ((start1 >= start2 && start1 < end2) || (start2 >= start1 && start2 < end1)) {
            conflicts.push({
              job1,
              job2,
              type: 'machine',
              severity: 'high',
              resolution: 'Reschedule one job to a different machine or time slot'
            })
          }
        }

        // Same operator conflict
        if (job1.operator_id && job1.operator_id === job2.operator_id) {
          const start1 = new Date(job1.scheduled_start)
          const end1 = new Date(job1.scheduled_end)
          const start2 = new Date(job2.scheduled_start)
          const end2 = new Date(job2.scheduled_end)

          if ((start1 >= start2 && start1 < end2) || (start2 >= start1 && start2 < end1)) {
            conflicts.push({
              job1,
              job2,
              type: 'operator',
              severity: 'medium',
              resolution: 'Assign a different operator to one of the jobs'
            })
          }
        }
      }
    }

    return conflicts
  }

  async function createScheduledJob(requestId: string, machineId: string, scheduledStart: Date, operatorId?: string) {
    try {
      const request = productionRequests.find(r => r.id === requestId)
      if (!request) throw new Error('Request not found')

      const setupTime = estimateSetupTime(request.part)
      const runTime = estimateRunTime(request.part, request.quantity_ordered)
      const scheduledEnd = new Date(scheduledStart.getTime() + (setupTime + runTime) * 60 * 1000)

      const response = await fetch('/api/south/production-schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          production_request_id: requestId,
          machine_id: machineId,
          operator_id: operatorId || null,
          scheduled_start: scheduledStart.toISOString(),
          scheduled_end: scheduledEnd.toISOString(),
          setup_time_minutes: setupTime,
          run_time_minutes: runTime,
          priority: request.priority === 'rush' ? 1 : request.priority === 'high' ? 3 : 5
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create schedule')
      }

      const { schedule } = await response.json()

      toast({
        title: 'Job scheduled',
        description: 'Production job has been scheduled successfully',
      })

      loadData() // Reload to get updated schedule
    } catch (error) {
      logError(error as Error, 'PRODUCTION_SCHEDULER', { action: 'create_schedule' })
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to schedule job',
        variant: 'destructive',
      })
    }
  }

  async function rescheduleJob(jobId: string, newStart: string, newMachineId?: string) {
    try {
      const job = scheduledJobs.find(j => j.id === jobId)
      if (!job) return

      const totalMinutes = job.setup_time_minutes + job.run_time_minutes
      const newEnd = new Date(new Date(newStart).getTime() + totalMinutes * 60 * 1000)

      const response = await fetch('/api/south/production-schedule', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: jobId,
          scheduled_start: newStart,
          scheduled_end: newEnd.toISOString(),
          machine_id: newMachineId || job.machine_id
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to reschedule')
      }

      logBusiness('Job rescheduled', 'PRODUCTION_SCHEDULER', { 
        jobId, 
        newStart, 
        newMachineId 
      })

      toast({
        title: 'Job rescheduled',
        description: 'The production job has been rescheduled successfully',
      })

      loadData() // Reload to get updated schedule
    } catch (error) {
      logError(error as Error, 'PRODUCTION_SCHEDULER', { action: 'reschedule_job' })
      toast({
        title: 'Error',
        description: 'Failed to reschedule job',
        variant: 'destructive',
      })
    }
  }

  async function updateJobStatus(jobId: string, action: 'start' | 'complete' | 'delay' | 'cancel') {
    try {
      const response = await fetch('/api/south/production-schedule', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schedule_id: jobId,
          action
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update status')
      }

      const { schedule } = await response.json()

      toast({
        title: 'Status updated',
        description: `Job ${action === 'start' ? 'started' : action === 'complete' ? 'completed' : action}`,
      })

      loadData() // Reload to get updated schedule
    } catch (error) {
      logError(error as Error, 'PRODUCTION_SCHEDULER', { action: 'update_job_status' })
      toast({
        title: 'Error',
        description: 'Failed to update job status',
        variant: 'destructive',
      })
    }
  }

  async function optimizeSchedule() {
    try {
      // Simple optimization algorithm
      // 1. Group similar parts together to minimize setup time
      // 2. Prioritize urgent orders
      // 3. Balance machine load

      const optimizedJobs = [...scheduledJobs]
      
      // Sort by part type and priority
      optimizedJobs.sort((a, b) => {
        if (a.production_request?.part?.part_type !== b.production_request?.part?.part_type) {
          return a.production_request?.part?.part_type.localeCompare(b.production_request?.part?.part_type || '') || 0
        }
        return a.priority - b.priority
      })

      // Reassign to machines for load balancing
      const machineLoads = new Map<string, number>()
      machines.forEach(m => machineLoads.set(m.id, 0))

      optimizedJobs.forEach(job => {
        // Find least loaded suitable machine
        const suitableMachines = machines.filter(m => 
          canMachineProducePart(m, job.production_request?.part)
        )

        let leastLoadedMachine = suitableMachines[0]
        let minLoad = machineLoads.get(leastLoadedMachine.id) || 0

        suitableMachines.forEach(machine => {
          const load = machineLoads.get(machine.id) || 0
          if (load < minLoad) {
            leastLoadedMachine = machine
            minLoad = load
          }
        })

        // Update job machine assignment
        job.machine_id = leastLoadedMachine.id
        job.machine = {
          machine_name: leastLoadedMachine.machine_name,
          machine_type: leastLoadedMachine.machine_type,
          status: leastLoadedMachine.status
        }

        // Update machine load
        const jobDuration = job.setup_time_minutes + job.run_time_minutes
        machineLoads.set(leastLoadedMachine.id, minLoad + jobDuration)
      })

      // Recalculate timings
      const newSchedule = generateScheduledJobs(
        productionRequests,
        machines,
        operators
      )

      setScheduledJobs(newSchedule)
      setConflicts(detectScheduleConflicts(newSchedule))

      logBusiness('Schedule optimized', 'PRODUCTION_SCHEDULER', {
        totalJobs: newSchedule.length,
        conflictsResolved: conflicts.length - detectScheduleConflicts(newSchedule).length
      })

      toast({
        title: 'Schedule optimized',
        description: 'Production schedule has been optimized for efficiency',
      })
    } catch (error) {
      logError(error as Error, 'PRODUCTION_SCHEDULER', { action: 'optimize_schedule' })
      toast({
        title: 'Error',
        description: 'Failed to optimize schedule',
        variant: 'destructive',
      })
    }
  }

  // Calculate metrics
  const metrics = useMemo(() => {
    const totalJobs = scheduledJobs.length
    const delayedJobs = scheduledJobs.filter(j => j.status === 'delayed').length
    const machineUtilization = new Map<string, number>()
    
    machines.forEach(m => machineUtilization.set(m.id, 0))
    
    scheduledJobs.forEach(job => {
      const duration = job.setup_time_minutes + job.run_time_minutes
      const current = machineUtilization.get(job.machine_id) || 0
      machineUtilization.set(job.machine_id, current + duration)
    })

    const avgUtilization = machines.length > 0
      ? Array.from(machineUtilization.values()).reduce((sum, val) => sum + val, 0) / 
        (machines.length * 8 * 60) * 100
      : 0

    return {
      totalJobs,
      delayedJobs,
      onTimeRate: totalJobs > 0 ? ((totalJobs - delayedJobs) / totalJobs) * 100 : 100,
      avgUtilization,
      conflictCount: conflicts.length
    }
  }, [scheduledJobs, machines, conflicts])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading schedule data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Scheduled Jobs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalJobs}</div>
            <p className="text-xs text-muted-foreground mt-1">
              This week
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">On-Time Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${
              metrics.onTimeRate >= 90 ? 'text-green-600' :
              metrics.onTimeRate >= 75 ? 'text-yellow-600' :
              'text-red-600'
            }`}>
              {metrics.onTimeRate.toFixed(0)}%
            </div>
            <Progress value={metrics.onTimeRate} className="mt-2" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Machine Utilization</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.avgUtilization.toFixed(0)}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              Average across all machines
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Delayed Jobs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{metrics.delayedJobs}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Need attention
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Conflicts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${
              metrics.conflictCount === 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {metrics.conflictCount}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              To resolve
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Actions Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Select value={viewMode} onValueChange={(v: any) => setViewMode(v)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="timeline">Timeline View</SelectItem>
                  <SelectItem value="list">List View</SelectItem>
                  <SelectItem value="conflicts">Conflicts</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>
                  {dateRange.start.toLocaleDateString()} - {dateRange.end.toLocaleDateString()}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={optimizeSchedule}>
                <Zap className="h-4 w-4 mr-2" />
                Optimize Schedule
              </Button>
              <Dialog open={isScheduleDialogOpen} onOpenChange={setIsScheduleDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Schedule Job
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Schedule Production Job</DialogTitle>
                    <DialogDescription>
                      Schedule a new production job and assign it to available machines and operators
                    </DialogDescription>
                  </DialogHeader>
                  <ScheduleJobForm
                    requests={productionRequests.filter(r => 
                      !scheduledJobs.some(j => j.production_request_id === r.id)
                    )}
                    machines={machines}
                    operators={operators}
                    onSchedule={(data) => {
                      // Handle scheduling
                      setIsScheduleDialogOpen(false)
                      loadData()
                    }}
                    onCancel={() => setIsScheduleDialogOpen(false)}
                  />
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <Tabs value={viewMode} onValueChange={(v: any) => setViewMode(v)}>
        <TabsContent value="timeline" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Production Timeline</CardTitle>
              <CardDescription>
                Visual schedule of all production jobs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {machines.map(machine => {
                  const machineJobs = scheduledJobs
                    .filter(j => j.machine_id === machine.id)
                    .sort((a, b) => 
                      new Date(a.scheduled_start).getTime() - new Date(b.scheduled_start).getTime()
                    )

                  return (
                    <div key={machine.id} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium flex items-center gap-2">
                          <Wrench className="h-4 w-4" />
                          {machine.machine_name}
                        </h4>
                        <span className="text-sm text-muted-foreground">
                          {machineJobs.length} jobs scheduled
                        </span>
                      </div>
                      <div className="relative h-20 bg-muted rounded-lg overflow-hidden">
                        {machineJobs.map((job, index) => {
                          const start = new Date(job.scheduled_start)
                          const end = new Date(job.scheduled_end)
                          const totalHours = (dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60)
                          const startPercent = ((start.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60)) / totalHours * 100
                          const widthPercent = ((end.getTime() - start.getTime()) / (1000 * 60 * 60)) / totalHours * 100

                          return (
                            <div
                              key={job.id}
                              className={`absolute h-16 top-2 rounded cursor-pointer transition-all hover:z-10 hover:shadow-lg ${
                                job.status === 'delayed' ? 'bg-red-500' :
                                job.status === 'in_progress' ? 'bg-blue-500' :
                                job.status === 'completed' ? 'bg-green-500' :
                                'bg-purple-500'
                              }`}
                              style={{
                                left: `${startPercent}%`,
                                width: `${widthPercent}%`,
                                minWidth: '40px'
                              }}
                              title={`${job.production_request?.part?.part_name} - ${job.production_request?.customer_name}`}
                            >
                              <div className="p-1 text-white text-xs truncate">
                                {job.production_request?.part?.part_name}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
              <div className="flex items-center gap-6 mt-6 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-purple-500 rounded" />
                  <span>Scheduled</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-blue-500 rounded" />
                  <span>In Progress</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-green-500 rounded" />
                  <span>Completed</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-red-500 rounded" />
                  <span>Delayed</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="list" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Scheduled Jobs</CardTitle>
              <CardDescription>
                Detailed list of all production jobs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {scheduledJobs.map(job => (
                  <div key={job.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <h4 className="font-medium">
                          {job.production_request?.part?.part_name}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          Customer: {job.production_request?.customer_name}
                        </p>
                        <div className="flex items-center gap-4 text-sm">
                          <span className="flex items-center gap-1">
                            <Package className="h-3 w-3" />
                            {job.production_request?.quantity_ordered} units
                          </span>
                          <span className="flex items-center gap-1">
                            <Wrench className="h-3 w-3" />
                            {job.machine?.machine_name}
                          </span>
                          {job.operator && (
                            <span className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {job.operator.name}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right space-y-1">
                        <Badge variant={
                          job.status === 'delayed' ? 'destructive' :
                          job.status === 'completed' ? 'default' :
                          'secondary'
                        }>
                          {job.status}
                        </Badge>
                        <p className="text-xs text-muted-foreground">
                          Due: {new Date(job.production_request?.due_date || '').toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(job.scheduled_start).toLocaleString()}
                        </span>
                        <ArrowRight className="h-3 w-3" />
                        <span>
                          {new Date(job.scheduled_end).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {job.status === 'scheduled' && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => updateJobStatus(job.id, 'start')}
                          >
                            <Play className="h-3 w-3 mr-1" />
                            Start
                          </Button>
                        )}
                        {job.status === 'in_progress' && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => updateJobStatus(job.id, 'complete')}
                          >
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Complete
                          </Button>
                        )}
                        <Button size="sm" variant="ghost">
                          <Settings className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="conflicts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Schedule Conflicts</CardTitle>
              <CardDescription>
                Conflicts that need resolution
              </CardDescription>
            </CardHeader>
            <CardContent>
              {conflicts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-600" />
                  <p>No scheduling conflicts detected</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {conflicts.map((conflict, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <AlertTriangle className={`h-4 w-4 ${
                              conflict.severity === 'high' ? 'text-red-600' :
                              conflict.severity === 'medium' ? 'text-orange-600' :
                              'text-yellow-600'
                            }`} />
                            <h4 className="font-medium capitalize">
                              {conflict.type} Conflict
                            </h4>
                          </div>
                          <div className="space-y-1 text-sm text-muted-foreground">
                            <p>
                              Job 1: {conflict.job1.production_request?.part?.part_name} - 
                              {' '}{conflict.job1.production_request?.customer_name}
                            </p>
                            <p>
                              Job 2: {conflict.job2.production_request?.part?.part_name} - 
                              {' '}{conflict.job2.production_request?.customer_name}
                            </p>
                          </div>
                          <p className="text-sm">{conflict.resolution}</p>
                        </div>
                        <div className="space-y-2">
                          <Badge variant={
                            conflict.severity === 'high' ? 'destructive' :
                            conflict.severity === 'medium' ? 'secondary' :
                            'outline'
                          }>
                            {conflict.severity} severity
                          </Badge>
                          <Button size="sm" variant="outline">
                            Resolve
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function ScheduleJobForm({
  requests,
  machines,
  operators,
  onSchedule,
  onCancel
}: {
  requests: any[]
  machines: any[]
  operators: any[]
  onSchedule: (data: any) => void
  onCancel: () => void
}) {
  const [selectedRequest, setSelectedRequest] = useState('')
  const [selectedMachine, setSelectedMachine] = useState('')
  const [selectedOperator, setSelectedOperator] = useState('')
  const [scheduledDate, setScheduledDate] = useState('')
  const [scheduledTime, setScheduledTime] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const datetime = `${scheduledDate}T${scheduledTime}`
    onSchedule({
      production_request_id: selectedRequest,
      machine_id: selectedMachine,
      operator_id: selectedOperator,
      scheduled_start: datetime
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label>Production Request</Label>
        <Select value={selectedRequest} onValueChange={setSelectedRequest}>
          <SelectTrigger>
            <SelectValue placeholder="Select a request" />
          </SelectTrigger>
          <SelectContent>
            {requests.map(request => (
              <SelectItem key={request.id} value={request.id}>
                {request.part?.part_name} - {request.customer_name} ({request.quantity_ordered} units)
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Machine</Label>
          <Select value={selectedMachine} onValueChange={setSelectedMachine}>
            <SelectTrigger>
              <SelectValue placeholder="Select machine" />
            </SelectTrigger>
            <SelectContent>
              {machines.map(machine => (
                <SelectItem key={machine.id} value={machine.id}>
                  {machine.machine_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Operator</Label>
          <Select value={selectedOperator} onValueChange={setSelectedOperator}>
            <SelectTrigger>
              <SelectValue placeholder="Select operator" />
            </SelectTrigger>
            <SelectContent>
              {operators.map(operator => (
                <SelectItem key={operator.auth_user_id} value={operator.auth_user_id}>
                  {operator.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Date</Label>
          <Input
            type="date"
            value={scheduledDate}
            onChange={(e) => setScheduledDate(e.target.value)}
            min={new Date().toISOString().split('T')[0]}
            required
          />
        </div>
        <div>
          <Label>Time</Label>
          <Input
            type="time"
            value={scheduledTime}
            onChange={(e) => setScheduledTime(e.target.value)}
            required
          />
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          Schedule Job
        </Button>
      </div>
    </form>
  )
}