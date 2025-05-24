import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // ALWAYS validate employee status
    const { data: worker } = await supabase
      .from('workers')
      .select('role, is_active')
      .eq('auth_user_id', user.id)
      .single()
    
    if (!worker?.is_active || !['manager', 'supervisor'].includes(worker.role || '')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    // Get current time and time windows
    const now = new Date()
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    
    // Fetch real-time data
    const [
      activeWorkers,
      activeTasks,
      recentTransitions,
      currentBottlenecks,
      liveMetrics,
      recentIssues
    ] = await Promise.all([
      // Active workers (with current tasks)
      supabase
        .from('time_logs')
        .select(`
          id,
          worker_id,
          stage,
          start_time,
          task_id,
          batch_id,
          worker:workers(id, name, role)
        `)
        .is('end_time', null),
      
      // Active tasks by stage
      supabase
        .from('work_tasks')
        .select('id, stage, status, priority, assigned_to_id, created_at, started_at')
        .in('status', ['assigned', 'in_progress']),
      
      // Recent stage transitions (last hour)
      supabase
        .from('stage_transitions')
        .select(`
          id,
          from_stage,
          to_stage,
          transition_type,
          transition_time,
          batch_id,
          order_item_id
        `)
        .gte('transition_time', oneHourAgo.toISOString())
        .order('transition_time', { ascending: false })
        .limit(50),
      
      // Current bottlenecks (stages with high wait times)
      supabase
        .from('work_tasks')
        .select('stage, created_at, started_at')
        .eq('status', 'assigned')
        .not('stage', 'is', null),
      
      // Today's metrics
      supabase
        .from('work_tasks')
        .select('id, status, created_at, started_at, completed_at')
        .gte('created_at', todayStart.toISOString()),
      
      // Recent issues (last 2 hours)
      supabase
        .from('production_issues')
        .select(`
          id,
          stage,
          severity,
          title,
          created_at,
          resolution_status,
          reported_by:workers!production_issues_reported_by_id_fkey(name)
        `)
        .gte('created_at', new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false })
        .limit(10)
    ])
    
    // Calculate real-time metrics
    const activeWorkersData = activeWorkers.data || []
    const activeTasksData = activeTasks.data || []
    const recentTransitionsData = recentTransitions.data || []
    const bottleneckData = currentBottlenecks.data || []
    const todayMetrics = liveMetrics.data || []
    const recentIssuesData = recentIssues.data || []
    
    // Group active tasks by stage
    const tasksByStage: Record<string, any> = {}
    activeTasksData.forEach(task => {
      const stage = task.stage || 'unassigned'
      if (!tasksByStage[stage]) {
        tasksByStage[stage] = {
          count: 0,
          assigned: 0,
          inProgress: 0,
          highPriority: 0
        }
      }
      
      tasksByStage[stage].count++
      if (task.status === 'assigned') tasksByStage[stage].assigned++
      if (task.status === 'in_progress') tasksByStage[stage].inProgress++
      if (task.priority === 'high' || task.priority === 'urgent') tasksByStage[stage].highPriority++
    })
    
    // Calculate bottlenecks
    const bottlenecksByStage: Record<string, any> = {}
    bottleneckData.forEach(task => {
      if (!task.stage) return
      
      if (!bottlenecksByStage[task.stage]) {
        bottlenecksByStage[task.stage] = {
          waitingTasks: 0,
          totalWaitMinutes: 0,
          maxWaitMinutes: 0
        }
      }
      
      const waitMinutes = Math.floor((now.getTime() - new Date(task.created_at || new Date()).getTime()) / (1000 * 60))
      bottlenecksByStage[task.stage].waitingTasks++
      bottlenecksByStage[task.stage].totalWaitMinutes += waitMinutes
      bottlenecksByStage[task.stage].maxWaitMinutes = Math.max(
        bottlenecksByStage[task.stage].maxWaitMinutes,
        waitMinutes
      )
    })
    
    // Format bottleneck data
    const bottlenecks = Object.entries(bottlenecksByStage)
      .map(([stage, data]: [string, any]) => ({
        stage,
        waitingTasks: data.waitingTasks,
        avgWaitMinutes: Math.round(data.totalWaitMinutes / data.waitingTasks),
        maxWaitMinutes: data.maxWaitMinutes,
        severity: data.maxWaitMinutes > 120 ? 'critical' : 
                  data.maxWaitMinutes > 60 ? 'high' : 
                  data.maxWaitMinutes > 30 ? 'medium' : 'low'
      }))
      .sort((a, b) => b.maxWaitMinutes - a.maxWaitMinutes)
    
    // Calculate transition rates
    const transitionRates: Record<string, number> = {}
    recentTransitionsData.forEach(transition => {
      const key = `${transition.from_stage || 'start'} → ${transition.to_stage}`
      transitionRates[key] = (transitionRates[key] || 0) + 1
    })
    
    // Today's performance
    const todayCompleted = todayMetrics.filter(t => t.status === 'completed').length
    const todayCreated = todayMetrics.length
    const todayInProgress = todayMetrics.filter(t => t.status === 'in_progress').length
    const todayAssigned = todayMetrics.filter(t => t.status === 'assigned').length
    
    // Calculate throughput (tasks completed per hour today)
    const hoursElapsedToday = (now.getTime() - todayStart.getTime()) / (1000 * 60 * 60)
    const throughputPerHour = hoursElapsedToday > 0 ? (todayCompleted / hoursElapsedToday).toFixed(1) : 0
    
    // Format active workers with current task info
    const activeWorkersFormatted = activeWorkersData.map(log => ({
      workerId: log.worker_id,
      workerName: log.worker?.name || 'Unknown',
      currentStage: log.stage,
      minutesActive: Math.floor((now.getTime() - new Date(log.start_time).getTime()) / (1000 * 60)),
      taskId: log.task_id,
      batchId: log.batch_id
    }))
    
    const response = {
      timestamp: now.toISOString(),
      liveMetrics: {
        activeWorkers: activeWorkersFormatted.length,
        activeTasks: activeTasksData.length,
        todayCreated,
        todayCompleted,
        todayInProgress,
        todayAssigned,
        throughputPerHour,
        recentTransitions: recentTransitionsData.length
      },
      activeWorkers: activeWorkersFormatted,
      tasksByStage: Object.entries(tasksByStage).map(([stage, data]) => ({
        stage,
        ...data
      })),
      bottlenecks,
      transitionRates: Object.entries(transitionRates)
        .map(([transition, count]) => ({
          transition,
          count,
          rate: `${count} in last hour`
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
      recentIssues: recentIssuesData.map(issue => ({
        id: issue.id,
        stage: issue.stage,
        severity: issue.severity,
        title: issue.title,
        reportedBy: issue.reported_by?.name || 'Unknown',
        minutesAgo: Math.floor((now.getTime() - new Date(issue.created_at || now.toISOString()).getTime()) / (1000 * 60)),
        status: issue.resolution_status
      })),
      systemHealth: {
        workersUtilization: activeWorkersData.length > 0 ? 'healthy' : 'warning',
        taskBacklog: activeTasksData.length > 100 ? 'warning' : 'healthy',
        bottleneckSeverity: bottlenecks.some(b => b.severity === 'critical') ? 'critical' :
                           bottlenecks.some(b => b.severity === 'high') ? 'warning' : 'healthy',
        issueRate: recentIssuesData.filter(i => i.resolution_status === 'open').length > 5 ? 'warning' : 'healthy'
      }
    }
    
    return NextResponse.json(response)
    
  } catch (error) {
    console.error('Real-time Analytics API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}