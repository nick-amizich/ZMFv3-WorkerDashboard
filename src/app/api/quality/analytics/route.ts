import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays } from 'date-fns'

interface QualityMetrics {
  firstPassYield: number
  defectRate: number
  reworkRate: number
  avgInspectionTime: number
  totalInspections: number
  passedInspections: number
  failedInspections: number
}

interface StageMetrics extends QualityMetrics {
  stage: string
  topIssues: Array<{
    issue: string
    count: number
  }>
}

interface WorkerMetrics extends QualityMetrics {
  workerId: string
  workerName: string
  trend: 'improving' | 'stable' | 'declining'
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Validate worker status
    const { data: worker } = await supabase
      .from('workers')
      .select('role, is_active')
      .eq('auth_user_id', user.id)
      .single()
    
    if (!worker?.is_active) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    // Get query parameters
    const searchParams = request.nextUrl.searchParams
    const period = searchParams.get('period') || 'week' // week, month, custom
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')
    const groupBy = searchParams.get('group_by') || 'stage' // stage, worker, model
    
    // Calculate date range
    let dateFrom: Date
    let dateTo: Date
    
    if (period === 'custom' && startDate && endDate) {
      dateFrom = new Date(startDate)
      dateTo = new Date(endDate)
    } else if (period === 'month') {
      dateFrom = startOfMonth(new Date())
      dateTo = endOfMonth(new Date())
    } else {
      dateFrom = startOfWeek(new Date())
      dateTo = endOfWeek(new Date())
    }
    
    // Fetch all inspection results for the period
    const { data: inspections, error: inspectionError } = await supabase
      .from('inspection_results')
      .select(`
        *,
        quality_checkpoints (
          stage,
          name,
          severity
        ),
        workers:inspected_by (
          id,
          name
        ),
        work_tasks (
          type,
          stage,
          work_batches (
            order_items (
              product_name,
              variant_name
            )
          )
        )
      `)
      .gte('inspected_at', dateFrom.toISOString())
      .lte('inspected_at', dateTo.toISOString())
    
    if (inspectionError) {
      console.error('Error fetching inspections:', inspectionError)
      return NextResponse.json({ error: 'Failed to fetch quality data' }, { status: 500 })
    }
    
    // Calculate overall metrics
    const overallMetrics: QualityMetrics = calculateMetrics(inspections || [])
    
    // Group metrics based on request
    let groupedMetrics: any[] = []
    
    if (groupBy === 'stage') {
      groupedMetrics = calculateStageMetrics(inspections || [])
    } else if (groupBy === 'worker') {
      groupedMetrics = await calculateWorkerMetrics(supabase, inspections || [])
    } else if (groupBy === 'model') {
      groupedMetrics = calculateModelMetrics(inspections || [])
    }
    
    // Get quality holds for the period
    const { data: holds } = await supabase
      .from('quality_holds')
      .select('*')
      .gte('created_at', dateFrom.toISOString())
      .lte('created_at', dateTo.toISOString())
    
    // Get rework data
    const { data: reworks } = await supabase
      .from('work_tasks')
      .select('*')
      .eq('is_rework', true)
      .gte('created_at', dateFrom.toISOString())
      .lte('created_at', dateTo.toISOString())
    
    // Trend analysis - compare to previous period
    const previousPeriodMetrics = await getPreviousPeriodMetrics(
      supabase, 
      dateFrom, 
      dateTo,
      period
    )
    
    const trends = {
      firstPassYield: calculateTrend(
        overallMetrics.firstPassYield,
        previousPeriodMetrics.firstPassYield
      ),
      defectRate: calculateTrend(
        overallMetrics.defectRate,
        previousPeriodMetrics.defectRate,
        true // Lower is better
      ),
      reworkRate: calculateTrend(
        overallMetrics.reworkRate,
        previousPeriodMetrics.reworkRate,
        true // Lower is better
      )
    }
    
    return NextResponse.json({
      period: {
        from: dateFrom.toISOString(),
        to: dateTo.toISOString()
      },
      overall: overallMetrics,
      [groupBy]: groupedMetrics,
      holds: {
        total: holds?.length || 0,
        critical: holds?.filter(h => h.severity === 'critical').length || 0,
        resolved: holds?.filter(h => h.resolved_at).length || 0
      },
      reworks: {
        total: reworks?.length || 0,
        byStage: groupReworksByStage(reworks || [])
      },
      trends,
      topIssues: getTopIssues(inspections || [])
    })
  } catch (error) {
    console.error('Quality analytics error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function calculateMetrics(inspections: any[]): QualityMetrics {
  const total = inspections.length
  const passed = inspections.filter(i => i.passed).length
  const failed = total - passed
  
  const totalTime = inspections.reduce((sum, i) => {
    if (i.inspected_at && i.created_at) {
      const duration = new Date(i.inspected_at).getTime() - new Date(i.created_at).getTime()
      return sum + (duration / 1000 / 60) // Convert to minutes
    }
    return sum
  }, 0)
  
  return {
    firstPassYield: total > 0 ? (passed / total) * 100 : 100,
    defectRate: total > 0 ? (failed / total) * 100 : 0,
    reworkRate: 0, // Will be calculated separately
    avgInspectionTime: total > 0 ? totalTime / total : 0,
    totalInspections: total,
    passedInspections: passed,
    failedInspections: failed
  }
}

function calculateStageMetrics(inspections: any[]): StageMetrics[] {
  const stageGroups = inspections.reduce((acc: any, inspection) => {
    const stage = inspection.quality_checkpoints?.stage || 'unknown'
    if (!acc[stage]) {
      acc[stage] = []
    }
    acc[stage].push(inspection)
    return acc
  }, {})
  
  return Object.entries(stageGroups).map(([stage, stageInspections]: [string, any]) => {
    const metrics = calculateMetrics(stageInspections)
    
    // Get top issues for this stage
    const issueCount = stageInspections.reduce((acc: any, inspection: any) => {
      if (!inspection.passed && inspection.findings) {
        Object.entries(inspection.findings).forEach(([key, value]) => {
          if (value) {
            acc[key] = (acc[key] || 0) + 1
          }
        })
      }
      return acc
    }, {})
    
    const topIssues = Object.entries(issueCount)
      .map(([issue, count]) => ({ issue, count: count as number }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)
    
    return {
      stage,
      ...metrics,
      topIssues
    }
  })
}

async function calculateWorkerMetrics(
  supabase: any,
  inspections: any[]
): Promise<WorkerMetrics[]> {
  const workerGroups = inspections.reduce((acc: any, inspection) => {
    const workerId = inspection.inspected_by
    if (workerId && inspection.workers) {
      if (!acc[workerId]) {
        acc[workerId] = {
          name: inspection.workers.name,
          inspections: []
        }
      }
      acc[workerId].inspections.push(inspection)
    }
    return acc
  }, {})
  
  const workerMetrics: WorkerMetrics[] = []
  
  for (const [workerId, data] of Object.entries(workerGroups)) {
    const metrics = calculateMetrics((data as any).inspections)
    
    // Calculate trend by comparing last 7 days to previous 7 days
    const sevenDaysAgo = subDays(new Date(), 7)
    const fourteenDaysAgo = subDays(new Date(), 14)
    
    const recentInspections = (data as any).inspections.filter(
      (i: any) => new Date(i.inspected_at) > sevenDaysAgo
    )
    const previousInspections = (data as any).inspections.filter(
      (i: any) => new Date(i.inspected_at) > fourteenDaysAgo && 
                  new Date(i.inspected_at) <= sevenDaysAgo
    )
    
    const recentYield = calculateMetrics(recentInspections).firstPassYield
    const previousYield = calculateMetrics(previousInspections).firstPassYield
    
    let trend: 'improving' | 'stable' | 'declining' = 'stable'
    if (recentYield > previousYield + 5) trend = 'improving'
    else if (recentYield < previousYield - 5) trend = 'declining'
    
    workerMetrics.push({
      workerId,
      workerName: (data as any).name,
      ...metrics,
      trend
    })
  }
  
  return workerMetrics.sort((a, b) => b.firstPassYield - a.firstPassYield)
}

function calculateModelMetrics(inspections: any[]): any[] {
  const modelGroups = inspections.reduce((acc: any, inspection) => {
    const model = inspection.work_tasks?.work_batches?.order_items?.product_name || 'unknown'
    if (!acc[model]) {
      acc[model] = []
    }
    acc[model].push(inspection)
    return acc
  }, {})
  
  return Object.entries(modelGroups).map(([model, modelInspections]: [string, any]) => {
    const metrics = calculateMetrics(modelInspections)
    return {
      model,
      ...metrics
    }
  })
}

async function getPreviousPeriodMetrics(
  supabase: any,
  dateFrom: Date,
  dateTo: Date,
  period: string
): Promise<QualityMetrics> {
  const duration = dateTo.getTime() - dateFrom.getTime()
  const previousFrom = new Date(dateFrom.getTime() - duration)
  const previousTo = new Date(dateTo.getTime() - duration)
  
  const { data: previousInspections } = await supabase
    .from('inspection_results')
    .select('*')
    .gte('inspected_at', previousFrom.toISOString())
    .lte('inspected_at', previousTo.toISOString())
  
  return calculateMetrics(previousInspections || [])
}

function calculateTrend(current: number, previous: number, lowerIsBetter = false): string {
  const diff = current - previous
  const threshold = 5 // 5% change threshold
  
  if (Math.abs(diff) < threshold) return 'stable'
  
  if (lowerIsBetter) {
    return diff < 0 ? 'improving' : 'declining'
  } else {
    return diff > 0 ? 'improving' : 'declining'
  }
}

function getTopIssues(inspections: any[]): any[] {
  const issueCount = inspections.reduce((acc: any, inspection) => {
    if (!inspection.passed && inspection.findings) {
      Object.entries(inspection.findings).forEach(([key, value]) => {
        if (value) {
          const stage = inspection.quality_checkpoints?.stage || 'unknown'
          const issueKey = `${key} (${stage})`
          acc[issueKey] = (acc[issueKey] || 0) + 1
        }
      })
    }
    return acc
  }, {})
  
  return Object.entries(issueCount)
    .map(([issue, count]) => ({ issue, count: count as number }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
}

function groupReworksByStage(reworks: any[]): any {
  return reworks.reduce((acc: any, task) => {
    const stage = task.stage || 'unknown'
    acc[stage] = (acc[stage] || 0) + 1
    return acc
  }, {})
}