import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

interface PredictiveAlert {
  id: string
  type: string
  severity: string
  title: string
  description: string
  confidence: number
  impact: string
  recommendation: string
  triggerConditions: any
  affectedStages?: string[]
  affectedModels?: string[]
}

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
    
    const alerts: PredictiveAlert[] = []
    
    // Analyze recent quality patterns for predictions
    const { data: patterns } = await supabase
      .from('quality_patterns')
      .select('*')
      .gte('last_seen', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .order('occurrence_count', { ascending: false })
    
    // Analyze recent inspection failures
    const { data: recentFailures } = await supabase
      .from('inspection_results')
      .select(`
        *,
        checkpoint:quality_checkpoints(stage, severity)
      `)
      .eq('passed', false)
      .gte('inspected_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    
    // Pattern-based alerts
    if (patterns && patterns.length > 0) {
      patterns.forEach((pattern) => {
        // Alert for increasing severity trends
        if (pattern.severity_trend === 'increasing' && pattern.occurrence_count > 3) {
          alerts.push({
            id: `pattern-${pattern.id}`,
            type: 'pattern',
            severity: pattern.occurrence_count > 10 ? 'critical' : 'warning',
            title: `Increasing ${pattern.issue_type.replace(/_/g, ' ')} Issues`,
            description: `${pattern.issue_type} issues in ${pattern.stage} stage are trending upward`,
            confidence: Math.min(95, 70 + pattern.occurrence_count * 2),
            impact: `Based on ${pattern.occurrence_count} occurrences this week`,
            recommendation: pattern.prevention_tips?.[0] || 'Review process procedures',
            triggerConditions: {
              metric: 'occurrence_count',
              current: pattern.occurrence_count,
              threshold: 3,
              trend: 'increasing'
            },
            affectedStages: [pattern.stage],
            affectedModels: pattern.affected_models
          })
        }
      })
    }
    
    // Time-based alerts
    const currentHour = new Date().getHours()
    const { data: activeWorkers } = await supabase
      .from('time_logs')
      .select('worker_id, start_time')
      .is('end_time', null)
    
    if (activeWorkers && activeWorkers.length > 0) {
      // Check for workers approaching fatigue threshold
      const longShiftWorkers = activeWorkers.filter(log => {
        const startTime = new Date(log.start_time)
        const hoursWorked = (Date.now() - startTime.getTime()) / (1000 * 60 * 60)
        return hoursWorked > 6
      })
      
      if (longShiftWorkers.length > 2) {
        alerts.push({
          id: 'fatigue-alert',
          type: 'worker',
          severity: 'warning',
          title: 'Multiple Workers Approaching Fatigue Limit',
          description: `${longShiftWorkers.length} workers have been active for over 6 hours`,
          confidence: 85,
          impact: 'Quality typically drops 20% after 6 continuous hours',
          recommendation: 'Schedule mandatory breaks or shift rotations',
          triggerConditions: {
            metric: 'continuous_hours',
            current: 6.5,
            threshold: 6
          },
          affectedStages: ['assembly', 'quality_control']
        })
      }
    }
    
    // Batch-specific alerts
    const { data: activeBatches } = await supabase
      .from('work_batches')
      .select(`
        *,
        tasks:work_tasks(rework_count)
      `)
      .eq('status', 'in_progress')
    
    if (activeBatches) {
      activeBatches.forEach(batch => {
        const totalReworks = batch.tasks?.reduce((sum: number, task: any) => 
          sum + (task.rework_count || 0), 0) || 0
        
        if (totalReworks > 5) {
          alerts.push({
            id: `batch-${batch.id}`,
            type: 'material',
            severity: 'critical',
            title: `High Rework Rate in Batch ${batch.name}`,
            description: `This batch has accumulated ${totalReworks} reworks`,
            confidence: 90,
            impact: 'Potential material or process issue affecting entire batch',
            recommendation: 'Investigate root cause immediately',
            triggerConditions: {
              metric: 'rework_count',
              current: totalReworks,
              threshold: 5
            }
          })
        }
      })
    }
    
    // Environmental simulation (would come from IoT sensors in production)
    const mockEnvironmental = {
      temperature: 72 + Math.random() * 10,
      humidity: 55 + Math.random() * 20
    }
    
    if (mockEnvironmental.humidity > 65) {
      alerts.push({
        id: 'env-humidity',
        type: 'environmental',
        severity: 'warning',
        title: 'High Humidity Warning',
        description: 'Humidity levels may affect finishing quality',
        confidence: 80,
        impact: 'Finishing defects increase 3x above 65% humidity',
        recommendation: 'Increase ventilation or postpone finishing operations',
        triggerConditions: {
          metric: 'humidity',
          current: Math.round(mockEnvironmental.humidity),
          threshold: 65,
          trend: 'stable'
        },
        affectedStages: ['finishing', 'curing']
      })
    }
    
    // Sort alerts by severity
    alerts.sort((a, b) => {
      const severityOrder = { critical: 0, warning: 1, info: 2 }
      return (severityOrder[a.severity as keyof typeof severityOrder] || 3) - 
             (severityOrder[b.severity as keyof typeof severityOrder] || 3)
    })
    
    return NextResponse.json({ 
      alerts,
      environmental: mockEnvironmental,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}