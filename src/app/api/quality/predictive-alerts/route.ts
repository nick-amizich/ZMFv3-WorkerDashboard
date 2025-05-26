import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // ALWAYS validate worker status
    const { data: worker } = await supabase
      .from('workers')
      .select('role, is_active')
      .eq('auth_user_id', user.id)
      .single()
    
    if (!worker?.is_active) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    // Get quality patterns with high occurrence counts
    const { data: patterns } = await supabase
      .from('quality_patterns')
      .select('*')
      .gt('occurrence_count', 10) // Alert on patterns seen more than 10 times
      .order('occurrence_count', { ascending: false })
      .limit(10)
    
    // Get stages with high defect rates
    const { data: stageAnalysis } = await supabase
      .from('inspection_results')
      .select(`
        quality_checkpoints!inner (
          stage,
          name
        ),
        passed
      `)
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
    
    // Process stage data
    const stageStats = stageAnalysis?.reduce((acc: any, inspection: any) => {
      const stage = inspection.quality_checkpoints.stage
      if (!acc[stage]) {
        acc[stage] = { total: 0, failed: 0 }
      }
      acc[stage].total++
      if (!inspection.passed) {
        acc[stage].failed++
      }
      return acc
    }, {})
    
    const stageAlerts = Object.entries(stageStats || {})
      .map(([stage, stats]: [string, any]) => ({
        stage,
        failure_rate: stats.failed / stats.total,
        total_inspections: stats.total
      }))
      .filter(alert => alert.failure_rate > 0.1) // Alert on >10% failure rate
      .sort((a, b) => b.failure_rate - a.failure_rate)
    
    // Get workers with recent failures
    const { data: workerAnalysis } = await supabase
      .from('inspection_results')
      .select(`
        inspected_by,
        passed,
        workers!inspected_by (
          name,
          id
        )
      `)
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
    
    // Process worker data
    const workerStats = workerAnalysis?.reduce((acc: any, inspection: any) => {
      const workerId = inspection.inspected_by
      if (!workerId || !inspection.workers) return acc
      
      if (!acc[workerId]) {
        acc[workerId] = { 
          total: 0, 
          failed: 0, 
          name: inspection.workers.name 
        }
      }
      acc[workerId].total++
      if (!inspection.passed) {
        acc[workerId].failed++
      }
      return acc
    }, {})
    
    const workerAlerts = Object.entries(workerStats || {})
      .map(([workerId, stats]: [string, any]) => ({
        workerId,
        name: stats.name,
        failure_rate: stats.failed / stats.total,
        total_inspections: stats.total
      }))
      .filter(alert => alert.failure_rate > 0.15 && alert.total_inspections > 5) // Alert on >15% failure rate with enough samples
      .sort((a, b) => b.failure_rate - a.failure_rate)
    
    // Get components at risk (multiple reworks)
    const { data: atRiskComponents } = await supabase
      .from('component_tracking')
      .select(`
        *,
        work_tasks!inner (
          status,
          type
        )
      `)
      .contains('journey', [{ rework: true }])
    
    // Get active quality holds
    const { data: activeHolds } = await supabase
      .from('quality_holds')
      .select('*')
      .is('resolved_at', null)
    
    // Predictive alerts based on patterns
    const alerts = []
    
    // Pattern-based alerts
    patterns?.forEach(pattern => {
      const severity = pattern.occurrence_count! > 50 ? 'critical' : 
                      pattern.occurrence_count! > 20 ? 'warning' : 'info'
      
      alerts.push({
        type: 'pattern',
        severity,
        title: `Recurring issue: ${pattern.issue_type}`,
        description: `Seen ${pattern.occurrence_count} times in ${pattern.stage} stage`,
        affected_count: pattern.occurrence_count,
        recommendations: pattern.prevention_tips || pattern.effective_solutions || []
      })
    })
    
    // Stage-based alerts
    stageAlerts.forEach(alert => {
      alerts.push({
        type: 'stage',
        severity: alert.failure_rate > 0.2 ? 'critical' : 'warning',
        title: `Quality issues at ${alert.stage} stage`,
        description: `${(alert.failure_rate * 100).toFixed(1)}% inspection failure rate`,
        affected_count: alert.total_inspections,
        recommendations: [
          'Review checkpoint criteria',
          'Provide additional training',
          'Inspect equipment calibration'
        ]
      })
    })
    
    // Worker performance alerts
    workerAlerts.forEach(alert => {
      alerts.push({
        type: 'worker',
        severity: alert.failure_rate > 0.25 ? 'warning' : 'info',
        title: `Worker quality concerns`,
        description: `${alert.name} has ${(alert.failure_rate * 100).toFixed(1)}% failure rate`,
        affected_count: alert.total_inspections,
        recommendations: [
          'Schedule performance review',
          'Provide targeted training',
          'Check workload distribution'
        ]
      })
    })
    
    // Component risk alerts
    const reworkCounts = atRiskComponents?.reduce((acc: any, comp: any) => {
      const reworks = comp.journey?.filter((j: any) => j.rework).length || 0
      if (reworks >= 2) {
        acc.push({
          component_id: comp.id,
          serial: comp.serial_number,
          rework_count: reworks,
          model: comp.model
        })
      }
      return acc
    }, [])
    
    if (reworkCounts?.length > 0) {
      alerts.push({
        type: 'component_risk',
        severity: 'warning',
        title: `${reworkCounts.length} components with multiple reworks`,
        description: 'These components may require special attention',
        affected_count: reworkCounts.length,
        components: reworkCounts,
        recommendations: [
          'Consider quality hold for inspection',
          'Review component specifications',
          'Analyze root cause of reworks'
        ]
      })
    }
    
    // Active holds alert
    if (activeHolds && activeHolds.length > 0) {
      const criticalHolds = activeHolds.filter(h => h.severity === 'critical').length
      alerts.push({
        type: 'holds',
        severity: criticalHolds > 0 ? 'critical' : 'warning',
        title: `${activeHolds.length} active quality holds`,
        description: `${criticalHolds} critical, ${activeHolds.length - criticalHolds} other`,
        affected_count: activeHolds.length,
        recommendations: [
          'Review and resolve holds promptly',
          'Investigate root causes',
          'Update quality procedures if needed'
        ]
      })
    }
    
    return NextResponse.json({
      alerts: alerts.sort((a, b) => {
        const severityOrder = { critical: 0, warning: 1, info: 2 }
        return severityOrder[a.severity as keyof typeof severityOrder] - 
               severityOrder[b.severity as keyof typeof severityOrder]
      }),
      summary: {
        critical: alerts.filter(a => a.severity === 'critical').length,
        warning: alerts.filter(a => a.severity === 'warning').length,
        info: alerts.filter(a => a.severity === 'info').length,
        total: alerts.length
      }
    })
  } catch (error) {
    console.error('Predictive alerts error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Store a new pattern or update existing
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // ALWAYS validate worker status and role
    const { data: worker } = await supabase
      .from('workers')
      .select('id, role, is_active')
      .eq('auth_user_id', user.id)
      .single()
    
    if (!worker?.is_active || !['manager', 'supervisor'].includes(worker.role || '')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    const body = await request.json()
    const { issue_type, stage, affected_models, prevention_tips, effective_solutions } = body
    
    // Check if pattern already exists
    const { data: existing } = await supabase
      .from('quality_patterns')
      .select('*')
      .eq('issue_type', issue_type)
      .eq('stage', stage)
      .single()
    
    if (existing) {
      // Update existing pattern
      const { data, error } = await supabase
        .from('quality_patterns')
        .update({
          occurrence_count: (existing.occurrence_count || 0) + 1,
          affected_models: Array.from(new Set([...(existing.affected_models || []), ...(affected_models || [])])),
          prevention_tips: Array.from(new Set([...(existing.prevention_tips || []), ...(prevention_tips || [])])),
          effective_solutions: Array.from(new Set([...(existing.effective_solutions || []), ...(effective_solutions || [])])),
          last_seen: new Date().toISOString()
        })
        .eq('id', existing.id)
        .select()
        .single()
      
      if (error) throw error
      return NextResponse.json({ pattern: data })
    } else {
      // Create new pattern
      const { data, error } = await supabase
        .from('quality_patterns')
        .insert({
          issue_type,
          stage,
          occurrence_count: 1,
          affected_models: affected_models || [],
          prevention_tips: prevention_tips || [],
          effective_solutions: effective_solutions || [],
          last_seen: new Date().toISOString()
        })
        .select()
        .single()
      
      if (error) throw error
      return NextResponse.json({ pattern: data })
    }
  } catch (error) {
    console.error('Create pattern error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}