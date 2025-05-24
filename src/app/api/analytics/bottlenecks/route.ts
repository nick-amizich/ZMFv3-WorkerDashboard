import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

interface BottleneckAnalysis {
  stage: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  metrics: {
    avgWaitTime: number
    maxWaitTime: number
    tasksWaiting: number
    workersAvailable: number
    throughputRate: number
    capacityUtilization: number
  }
  causes: string[]
  recommendations: string[]
  historicalTrend: 'improving' | 'stable' | 'worsening'
}

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
    
    // Get analysis parameters
    const searchParams = request.nextUrl.searchParams
    const timeWindow = searchParams.get('window') || '4h' // 1h, 4h, 24h, 7d
    const threshold = parseFloat(searchParams.get('threshold') || '30') // minutes
    
    // Calculate time range
    const now = new Date()
    const startTime = new Date()
    
    switch (timeWindow) {
      case '1h':
        startTime.setHours(startTime.getHours() - 1)
        break
      case '4h':
        startTime.setHours(startTime.getHours() - 4)
        break
      case '24h':
        startTime.setHours(startTime.getHours() - 24)
        break
      case '7d':
        startTime.setDate(startTime.getDate() - 7)
        break
      default:
        startTime.setHours(startTime.getHours() - 4)
    }
    
    // Fetch comprehensive data for bottleneck analysis
    const [
      waitingTasks,
      stageTransitions,
      workerAssignments,
      historicalData,
      productionIssues,
      timeLogsData
    ] = await Promise.all([
      // Tasks waiting at each stage
      supabase
        .from('work_tasks')
        .select(`
          id,
          stage,
          created_at,
          priority,
          estimated_hours,
          order_item:order_items(
            product_name,
            order:orders(order_number)
          )
        `)
        .eq('status', 'assigned')
        .not('stage', 'is', null),
      
      // Recent stage transitions for flow analysis
      supabase
        .from('stage_transitions')
        .select('*')
        .gte('transition_time', startTime.toISOString())
        .order('transition_time', { ascending: false }),
      
      // Worker availability by stage
      supabase
        .from('worker_stage_assignments')
        .select(`
          stage,
          worker_id,
          skill_level,
          workers!worker_id(
            id,
            name,
            is_active
          )
        `)
        .eq('is_active', true),
      
      // Historical stage performance (last 30 days for trend analysis)
      supabase
        .from('stage_transitions')
        .select('*')
        .gte('transition_time', new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()),
      
      // Recent issues by stage
      supabase
        .from('production_issues')
        .select('stage, severity, created_at, resolution_status')
        .gte('created_at', startTime.toISOString()),
      
      // Active time logs to see who's working on what
      supabase
        .from('time_logs')
        .select('worker_id, stage, start_time')
        .is('end_time', null)
    ])
    
    // Analyze data
    const bottlenecks: BottleneckAnalysis[] = []
    const stageMetrics: Record<string, any> = {}
    
    // Initialize stage metrics
    const allStages = new Set<string>()
    waitingTasks.data?.forEach(task => task.stage && allStages.add(task.stage))
    workerAssignments.data?.forEach(assignment => assignment.stage && allStages.add(assignment.stage))
    
    // Calculate metrics for each stage
    for (const stage of allStages) {
      const stageWaitingTasks = waitingTasks.data?.filter(t => t.stage === stage) || []
      const stageWorkers = workerAssignments.data?.filter(w => w.stage === stage && w.workers?.is_active) || []
      const activeWorkers = timeLogsData.data?.filter(log => log.stage === stage) || []
      const stageTransitionData = stageTransitions.data?.filter(t => t.to_stage === stage) || []
      const stageIssues = productionIssues.data?.filter(i => i.stage === stage) || []
      
      // Calculate wait times
      const waitTimes = stageWaitingTasks.map(task => {
        const waitMinutes = Math.floor((now.getTime() - new Date(task.created_at || new Date()).getTime()) / (1000 * 60))
        return waitMinutes
      })
      
      const avgWaitTime = waitTimes.length > 0 ? 
        Math.round(waitTimes.reduce((a, b) => a + b, 0) / waitTimes.length) : 0
      const maxWaitTime = waitTimes.length > 0 ? Math.max(...waitTimes) : 0
      
      // Calculate throughput
      const completedInWindow = stageTransitionData.filter(t => 
        t.from_stage === stage && 
        t.transition_time && new Date(t.transition_time) >= startTime
      ).length
      
      const windowHours = (now.getTime() - startTime.getTime()) / (1000 * 60 * 60)
      const throughputRate = windowHours > 0 ? (completedInWindow / windowHours).toFixed(2) : '0'
      
      // Calculate capacity utilization
      const totalWorkers = stageWorkers.length
      const busyWorkers = activeWorkers.length
      const capacityUtilization = totalWorkers > 0 ? 
        Math.round((busyWorkers / totalWorkers) * 100) : 0
      
      // Analyze historical trend
      const historicalTrend = analyzeHistoricalTrend(
        stage,
        historicalData.data || [],
        avgWaitTime
      )
      
      // Determine severity
      const severity = determineSeverity(avgWaitTime, maxWaitTime, stageWaitingTasks.length, capacityUtilization)
      
      // Generate causes and recommendations
      const { causes, recommendations } = analyzeBottleneckCauses({
        stage,
        avgWaitTime,
        maxWaitTime,
        tasksWaiting: stageWaitingTasks.length,
        workersAvailable: totalWorkers - busyWorkers,
        capacityUtilization,
        issues: stageIssues,
        highPriorityTasks: stageWaitingTasks.filter(t => t.priority === 'high' || t.priority === 'urgent').length
      })
      
      if (avgWaitTime > threshold || stageWaitingTasks.length > 5) {
        bottlenecks.push({
          stage,
          severity,
          metrics: {
            avgWaitTime,
            maxWaitTime,
            tasksWaiting: stageWaitingTasks.length,
            workersAvailable: totalWorkers - busyWorkers,
            throughputRate: parseFloat(throughputRate),
            capacityUtilization
          },
          causes,
          recommendations,
          historicalTrend
        })
      }
      
      stageMetrics[stage] = {
        avgWaitTime,
        maxWaitTime,
        tasksWaiting: stageWaitingTasks.length,
        workersTotal: totalWorkers,
        workersActive: busyWorkers,
        throughputRate,
        capacityUtilization,
        issues: stageIssues.length
      }
    }
    
    // Sort bottlenecks by severity
    bottlenecks.sort((a, b) => {
      const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 }
      return severityOrder[a.severity] - severityOrder[b.severity]
    })
    
    // Generate system-wide insights
    const systemInsights = generateSystemInsights(bottlenecks, stageMetrics)
    
    const response = {
      analysisTime: now.toISOString(),
      timeWindow,
      thresholdMinutes: threshold,
      bottlenecks,
      stageMetrics: Object.entries(stageMetrics).map(([stage, metrics]) => ({
        stage,
        ...metrics
      })),
      systemInsights,
      summary: {
        criticalBottlenecks: bottlenecks.filter(b => b.severity === 'critical').length,
        highBottlenecks: bottlenecks.filter(b => b.severity === 'high').length,
        totalWaitingTasks: Object.values(stageMetrics).reduce((sum: number, m: any) => sum + m.tasksWaiting, 0),
        averageSystemWaitTime: calculateAverageSystemWaitTime(stageMetrics),
        recommendedActions: getTopRecommendations(bottlenecks)
      }
    }
    
    return NextResponse.json(response)
    
  } catch (error) {
    console.error('Bottleneck Analysis API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Helper functions
function determineSeverity(
  avgWaitTime: number,
  maxWaitTime: number,
  tasksWaiting: number,
  capacityUtilization: number
): 'critical' | 'high' | 'medium' | 'low' {
  if (maxWaitTime > 240 || (avgWaitTime > 120 && tasksWaiting > 10)) return 'critical'
  if (maxWaitTime > 120 || (avgWaitTime > 60 && tasksWaiting > 5) || capacityUtilization > 90) return 'high'
  if (maxWaitTime > 60 || avgWaitTime > 30 || tasksWaiting > 3) return 'medium'
  return 'low'
}

function analyzeBottleneckCauses(data: any): { causes: string[], recommendations: string[] } {
  const causes: string[] = []
  const recommendations: string[] = []
  
  // Analyze worker availability
  if (data.workersAvailable === 0) {
    causes.push('No available workers for this stage')
    recommendations.push('Assign additional workers to this stage')
  } else if (data.workersAvailable < data.tasksWaiting / 3) {
    causes.push('Insufficient workers for task volume')
    recommendations.push(`Add ${Math.ceil(data.tasksWaiting / 3 - data.workersAvailable)} more workers to this stage`)
  }
  
  // Analyze capacity utilization
  if (data.capacityUtilization > 90) {
    causes.push('Stage at near-maximum capacity')
    recommendations.push('Consider redistributing workload or adding capacity')
  }
  
  // Analyze wait times
  if (data.avgWaitTime > 120) {
    causes.push('Extended wait times indicating systemic delays')
    recommendations.push('Review workflow automation rules for this stage')
  }
  
  // Analyze high priority tasks
  if (data.highPriorityTasks > 2) {
    causes.push(`${data.highPriorityTasks} high-priority tasks waiting`)
    recommendations.push('Prioritize high-priority task assignment')
  }
  
  // Analyze issues
  if (data.issues.length > 3) {
    causes.push(`${data.issues.length} production issues reported at this stage`)
    recommendations.push('Address quality issues to reduce rework')
  }
  
  return { causes, recommendations }
}

function analyzeHistoricalTrend(
  stage: string,
  historicalData: any[],
  currentAvgWaitTime: number
): 'improving' | 'stable' | 'worsening' {
  // Calculate average wait time for different periods
  const now = new Date()
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)
  
  const lastWeekData = historicalData.filter(t => 
    t.to_stage === stage && 
    new Date(t.transition_time) >= oneWeekAgo
  )
  
  const previousWeekData = historicalData.filter(t => 
    t.to_stage === stage && 
    new Date(t.transition_time) >= twoWeeksAgo &&
    new Date(t.transition_time) < oneWeekAgo
  )
  
  if (lastWeekData.length < 10 || previousWeekData.length < 10) return 'stable'
  
  // Compare metrics (simplified - in production would be more sophisticated)
  const improvement = currentAvgWaitTime < 50 ? 0.1 : 0.2 // threshold for improvement
  
  if (currentAvgWaitTime < 30) return 'improving'
  if (currentAvgWaitTime > 90) return 'worsening'
  
  return 'stable'
}

function generateSystemInsights(bottlenecks: BottleneckAnalysis[], stageMetrics: any): string[] {
  const insights: string[] = []
  
  // Overall system health
  const criticalCount = bottlenecks.filter(b => b.severity === 'critical').length
  if (criticalCount > 0) {
    insights.push(`⚠️ ${criticalCount} critical bottlenecks require immediate attention`)
  }
  
  // Capacity insights
  const overloadedStages = Object.entries(stageMetrics)
    .filter(([_, metrics]: [string, any]) => metrics.capacityUtilization > 80)
    .map(([stage]) => stage)
  
  if (overloadedStages.length > 0) {
    insights.push(`📊 Stages at high capacity: ${overloadedStages.join(', ')}`)
  }
  
  // Flow insights
  const totalWaiting = Object.values(stageMetrics)
    .reduce((sum: number, m: any) => sum + m.tasksWaiting, 0)
  
  if (totalWaiting > 20) {
    insights.push(`📦 ${totalWaiting} tasks waiting across all stages`)
  }
  
  // Trend insights
  const worseningStages = bottlenecks
    .filter(b => b.historicalTrend === 'worsening')
    .map(b => b.stage)
  
  if (worseningStages.length > 0) {
    insights.push(`📉 Performance declining at: ${worseningStages.join(', ')}`)
  }
  
  return insights
}

function calculateAverageSystemWaitTime(stageMetrics: any): number {
  const stages = Object.values(stageMetrics)
  const totalWaitTime = stages.reduce((sum: number, m: any) => sum + (m.avgWaitTime * m.tasksWaiting), 0)
  const totalTasks = stages.reduce((sum: number, m: any) => sum + m.tasksWaiting, 0)
  
  return totalTasks > 0 ? Math.round(totalWaitTime / totalTasks) : 0
}

function getTopRecommendations(bottlenecks: BottleneckAnalysis[]): string[] {
  const allRecommendations: string[] = []
  
  // Get top 3 recommendations from critical and high severity bottlenecks
  bottlenecks
    .filter(b => b.severity === 'critical' || b.severity === 'high')
    .slice(0, 3)
    .forEach(b => {
      if (b.recommendations.length > 0) {
        allRecommendations.push(`${b.stage}: ${b.recommendations[0]}`)
      }
    })
  
  return allRecommendations
}