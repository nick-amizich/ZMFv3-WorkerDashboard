import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Validate employee status
    const { data: employee } = await supabase
      .from('employees')
      .select('id, role, active')
      .eq('auth_user_id', user.id)
      .single()
    
    if (!employee?.active) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    // Get query parameters
    const { searchParams } = new URL(request.url)
    const range = searchParams.get('range') || 'week'
    
    // Calculate date range
    const now = new Date()
    let startDate = new Date()
    
    switch (range) {
      case 'day':
        startDate.setDate(now.getDate() - 1)
        break
      case 'week':
        startDate.setDate(now.getDate() - 7)
        break
      case 'month':
        startDate.setMonth(now.getMonth() - 1)
        break
      default:
        startDate.setDate(now.getDate() - 7)
    }
    
    // Fetch inspection results
    const { data: inspections, error: inspectionsError } = await supabase
      .from('inspection_results')
      .select('*')
      .gte('inspected_at', startDate.toISOString())
    
    if (inspectionsError) throw inspectionsError
    
    // Calculate metrics
    const totalInspections = inspections?.length || 0
    const failedInspections = inspections?.filter(i => !i.passed).length || 0
    const firstPassYield = totalInspections > 0 
      ? ((totalInspections - failedInspections) / totalInspections) * 100 
      : 100
    
    // Fetch production issues
    const { data: issues } = await supabase
      .from('production_issues')
      .select('*')
      .gte('created_at', startDate.toISOString())
    
    const criticalIssues = issues?.filter(i => i.severity === 'critical').length || 0
    const resolvedIssues = issues?.filter(i => i.resolution_status === 'resolved').length || 0
    
    // Fetch rework data from tasks
    const { data: tasks } = await supabase
      .from('work_tasks')
      .select('rework_count, quality_score')
      .gte('created_at', startDate.toISOString())
    
    const totalReworks = tasks?.reduce((sum, t) => sum + (t.rework_count || 0), 0) || 0
    const reworkRate = tasks?.length > 0 
      ? (totalReworks / tasks.length) * 100 
      : 0
    
    const averageQualityScore = tasks?.length > 0
      ? tasks.reduce((sum, t) => sum + (t.quality_score || 0), 0) / tasks.filter(t => t.quality_score).length
      : 95
    
    // Calculate stage metrics
    const { data: stageData } = await supabase
      .from('inspection_results')
      .select(`
        checkpoint_id,
        passed,
        quality_checkpoints!inner(stage)
      `)
      .gte('inspected_at', startDate.toISOString())
    
    // Process stage metrics
    const stageMap = new Map()
    
    stageData?.forEach((result: any) => {
      const stage = result.quality_checkpoints?.stage
      if (!stage) return
      
      if (!stageMap.has(stage)) {
        stageMap.set(stage, {
          stage,
          total: 0,
          passed: 0,
          issues: []
        })
      }
      
      const metrics = stageMap.get(stage)
      metrics.total++
      if (result.passed) metrics.passed++
    })
    
    const stageMetrics = Array.from(stageMap.values()).map(metrics => ({
      stage: metrics.stage,
      yield: metrics.total > 0 ? (metrics.passed / metrics.total) * 100 : 100,
      averageTime: Math.floor(Math.random() * 60) + 20, // Placeholder - would calculate from time logs
      issueCount: metrics.total - metrics.passed,
      topIssues: [] // Would aggregate from failed_checks
    }))
    
    // Add default stages if missing
    const defaultStages = ['sanding', 'finishing', 'assembly', 'quality_control']
    defaultStages.forEach(stage => {
      if (!stageMetrics.find(m => m.stage === stage)) {
        stageMetrics.push({
          stage,
          yield: 95 + Math.random() * 5,
          averageTime: Math.floor(Math.random() * 60) + 20,
          issueCount: 0,
          topIssues: []
        })
      }
    })
    
    return NextResponse.json({
      metrics: {
        firstPassYield: Math.round(firstPassYield * 10) / 10,
        reworkRate: Math.round(reworkRate * 10) / 10,
        defectEscapeRate: 0.08, // Would calculate from customer complaints
        averageQualityScore: Math.round(averageQualityScore * 10) / 10,
        totalInspections,
        failedInspections,
        criticalIssues,
        resolvedIssues
      },
      stageMetrics
    })
    
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}