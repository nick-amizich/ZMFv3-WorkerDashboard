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
    
    // Get query parameters
    const searchParams = request.nextUrl.searchParams
    const period = searchParams.get('period') || '7d' // 7d, 30d, 90d
    const groupBy = searchParams.get('groupBy') || 'day' // day, week, month
    
    // Calculate date range
    const endDate = new Date()
    const startDate = new Date()
    
    switch (period) {
      case '7d':
        startDate.setDate(startDate.getDate() - 7)
        break
      case '30d':
        startDate.setDate(startDate.getDate() - 30)
        break
      case '90d':
        startDate.setDate(startDate.getDate() - 90)
        break
      default:
        startDate.setDate(startDate.getDate() - 7)
    }
    
    // Get production metrics
    const [
      orderMetrics,
      taskMetrics,
      stageMetrics,
      workerMetrics,
      issueMetrics,
      timeMetrics
    ] = await Promise.all([
      // Order completion metrics
      supabase
        .from('orders')
        .select('id, status, created_at, order_items(id, product_name)')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString()),
      
      // Task completion metrics
      supabase
        .from('work_tasks')
        .select('id, status, stage, created_at, completed_at, time_estimate_minutes, time_spent_minutes')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString()),
      
      // Stage transition metrics
      supabase
        .from('stage_transitions')
        .select('id, from_stage, to_stage, transition_type, transition_time')
        .gte('transition_time', startDate.toISOString())
        .lte('transition_time', endDate.toISOString()),
      
      // Worker performance metrics
      supabase
        .from('work_logs')
        .select(`
          id,
          employee_id,
          start_time,
          end_time,
          employee:workers(name)
        `)
        .gte('start_time', startDate.toISOString())
        .lte('start_time', endDate.toISOString())
        .not('end_time', 'is', null),
      
      // Production issues
      supabase
        .from('production_issues')
        .select('id, stage, severity, created_at, resolved_at')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString()),
      
      // Batch metrics
      supabase
        .from('work_batches')
        .select('id, status, current_stage, created_at, updated_at')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
    ])
    
    // Calculate KPIs
    const totalOrders = orderMetrics.data?.length || 0
    const completedOrders = orderMetrics.data?.filter(o => o.status === 'completed').length || 0
    const totalTasks = taskMetrics.data?.length || 0
    const completedTasks = taskMetrics.data?.filter(t => t.status === 'completed').length || 0
    const totalIssues = issueMetrics.data?.length || 0
    const resolvedIssues = issueMetrics.data?.filter(i => i.resolved_at).length || 0
    
    // Calculate efficiency metrics
    const taskEfficiency = taskMetrics.data?.reduce((acc, task) => {
      if (task.time_estimate_minutes && task.time_spent_minutes) {
        return acc + (task.time_estimate_minutes / task.time_spent_minutes)
      }
      return acc
    }, 0) || 0
    
    const avgTaskEfficiency = completedTasks > 0 ? (taskEfficiency / completedTasks * 100).toFixed(1) : 0
    
    // Calculate stage metrics
    const stageMetricsData: Record<string, any> = {}
    
    stageMetrics.data?.forEach(transition => {
      if (!stageMetricsData[transition.to_stage]) {
        stageMetricsData[transition.to_stage] = {
          count: 0,
          autoTransitions: 0,
          manualTransitions: 0
        }
      }
      
      stageMetricsData[transition.to_stage].count++
      if (transition.transition_type === 'auto') {
        stageMetricsData[transition.to_stage].autoTransitions++
      } else {
        stageMetricsData[transition.to_stage].manualTransitions++
      }
    })
    
    // Calculate worker performance
    const workerPerformance: Record<string, any> = {}
    
    workerMetrics.data?.forEach(log => {
      const workerId = log.employee_id
      const workerName = log.employee?.name || 'Unknown'
      
      if (!workerPerformance[workerId]) {
        workerPerformance[workerId] = {
          name: workerName,
          totalMinutes: 0,
          taskCount: 0
        }
      }
      
      // Calculate duration
      const start = new Date(log.start_time)
      const end = new Date(log.end_time)
      const durationMinutes = (end.getTime() - start.getTime()) / (1000 * 60)
      
      workerPerformance[workerId].totalMinutes += durationMinutes
      workerPerformance[workerId].taskCount++
    })
    
    // Format worker performance data
    const topWorkers = Object.entries(workerPerformance)
      .map(([id, data]: [string, any]) => ({
        id,
        name: data.name,
        totalHours: (data.totalMinutes / 60).toFixed(1),
        taskCount: data.taskCount,
        avgMinutesPerTask: data.taskCount > 0 ? (data.totalMinutes / data.taskCount).toFixed(1) : 0
      }))
      .sort((a, b) => b.taskCount - a.taskCount)
      .slice(0, 10)
    
    // Time series data
    const timeSeriesData = generateTimeSeriesData(
      taskMetrics.data || [],
      startDate,
      endDate,
      groupBy
    )
    
    const response = {
      summary: {
        period,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        kpis: {
          totalOrders,
          completedOrders,
          orderCompletionRate: totalOrders > 0 ? ((completedOrders / totalOrders) * 100).toFixed(1) : 0,
          totalTasks,
          completedTasks,
          taskCompletionRate: totalTasks > 0 ? ((completedTasks / totalTasks) * 100).toFixed(1) : 0,
          avgTaskEfficiency,
          totalIssues,
          resolvedIssues,
          issueResolutionRate: totalIssues > 0 ? ((resolvedIssues / totalIssues) * 100).toFixed(1) : 0
        }
      },
      stageMetrics: Object.entries(stageMetricsData).map(([stage, data]: [string, any]) => ({
        stage,
        totalTransitions: data.count,
        automationRate: data.count > 0 ? ((data.autoTransitions / data.count) * 100).toFixed(1) : 0,
        autoTransitions: data.autoTransitions,
        manualTransitions: data.manualTransitions
      })),
      topWorkers,
      timeSeriesData,
      issuesByStage: groupIssuesByStage(issueMetrics.data || []),
      batchMetrics: {
        total: timeMetrics.data?.length || 0,
        byStatus: groupBatchesByStatus(timeMetrics.data || [])
      }
    }
    
    return NextResponse.json(response)
    
  } catch (error) {
    console.error('Analytics API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Helper functions
function generateTimeSeriesData(tasks: any[], startDate: Date, endDate: Date, groupBy: string) {
  const data: Record<string, any> = {}
  
  // Initialize date buckets
  const current = new Date(startDate)
  while (current <= endDate) {
    const key = formatDateKey(current, groupBy)
    data[key] = {
      date: key,
      created: 0,
      completed: 0,
      inProgress: 0
    }
    
    // Increment date based on groupBy
    switch (groupBy) {
      case 'day':
        current.setDate(current.getDate() + 1)
        break
      case 'week':
        current.setDate(current.getDate() + 7)
        break
      case 'month':
        current.setMonth(current.getMonth() + 1)
        break
    }
  }
  
  // Populate data
  tasks.forEach(task => {
    const createdKey = formatDateKey(new Date(task.created_at), groupBy)
    if (data[createdKey]) {
      data[createdKey].created++
      
      if (task.status === 'completed' && task.completed_at) {
        const completedKey = formatDateKey(new Date(task.completed_at), groupBy)
        if (data[completedKey]) {
          data[completedKey].completed++
        }
      } else if (task.status === 'in_progress') {
        data[createdKey].inProgress++
      }
    }
  })
  
  return Object.values(data)
}

function formatDateKey(date: Date, groupBy: string): string {
  switch (groupBy) {
    case 'day':
      return date.toISOString().split('T')[0]
    case 'week':
      const weekStart = new Date(date)
      weekStart.setDate(date.getDate() - date.getDay())
      return `Week of ${weekStart.toISOString().split('T')[0]}`
    case 'month':
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    default:
      return date.toISOString().split('T')[0]
  }
}

function groupIssuesByStage(issues: any[]) {
  const grouped: Record<string, any> = {}
  
  issues.forEach(issue => {
    if (!grouped[issue.stage]) {
      grouped[issue.stage] = {
        total: 0,
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
        resolved: 0
      }
    }
    
    grouped[issue.stage].total++
    grouped[issue.stage][issue.severity]++
    if (issue.resolved_at) {
      grouped[issue.stage].resolved++
    }
  })
  
  return Object.entries(grouped).map(([stage, data]) => ({
    stage,
    ...data
  }))
}

function groupBatchesByStatus(batches: any[]) {
  const grouped: Record<string, number> = {
    pending: 0,
    active: 0,
    completed: 0,
    on_hold: 0
  }
  
  batches.forEach(batch => {
    if (grouped[batch.status] !== undefined) {
      grouped[batch.status]++
    }
  })
  
  return grouped
}