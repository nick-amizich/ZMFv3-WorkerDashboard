import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // TODO: Fix component tracking schema issues
  return NextResponse.json({ 
    error: 'Component journey feature temporarily disabled', 
    message: 'This feature requires schema updates' 
  }, { status: 503 })
  
  /*
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { id } = await params
    
    // Get component with all journey details
    const { data: component, error: componentError } = await supabase
      .from('component_tracking')
      .select(`
        *,
        work_tasks!inner (
          id,
          type,
          status,
          started_at,
          completed_at,
          work_batches (
            batch_number,
            order_items (
              order_number,
              variant_name,
              sku
            )
          ),
          workers!assigned_to (
            first_name,
            last_name
          )
        )
      `)
      .eq('id', id)
      .single()
    
    if (componentError) {
      return NextResponse.json({ error: 'Component not found' }, { status: 404 })
    }
    
    // Get all quality checkpoints this component went through
    const { data: inspections } = await supabase
      .from('inspection_results')
      .select(`
        *,
        quality_checkpoints (
          name,
          stage,
          type,
          severity
        ),
        workers:inspected_by (
          first_name,
          last_name
        )
      `)
      .eq('component_tracking_id', id)
      .order('created_at', { ascending: true })
    
    // Get any quality holds
    const { data: holds } = await supabase
      .from('quality_holds')
      .select(`
        *,
        workers:created_by (
          first_name,
          last_name
        ),
        workers:resolved_by (
          first_name,
          last_name
        )
      `)
      .eq('component_tracking_id', id)
      .order('created_at', { ascending: true })
    
    // Get paired component if exists
    let pairedComponent = null
    if (component.cup_pair_id) {
      const { data: paired } = await supabase
        .from('component_tracking')
        .select('id, left_cup_serial, right_cup_serial, grade')
        .eq('cup_pair_id', component.cup_pair_id)
        .neq('id', id)
        .single()
      
      pairedComponent = paired
    }
    
    // Format journey timeline
    const timeline = []
    
    // Add creation event
    timeline.push({
      timestamp: component.created_at,
      type: 'created',
      description: `Component created with serial ${component.serial_number}`,
      data: {
        type: component.type,
        model: component.model
      }
    })
    
    // Add task start/complete events
    if (component.work_tasks) {
      if (component.work_tasks.started_at) {
        timeline.push({
          timestamp: component.work_tasks.started_at,
          type: 'task_started',
          description: `${component.work_tasks.type} started`,
          data: {
            worker: component.work_tasks.workers,
            batch: component.work_tasks.work_batches?.batch_number
          }
        })
      }
      
      if (component.work_tasks.completed_at) {
        timeline.push({
          timestamp: component.work_tasks.completed_at,
          type: 'task_completed',
          description: `${component.work_tasks.type} completed`,
          data: {
            status: component.work_tasks.status
          }
        })
      }
    }
    
    // Add inspection events
    inspections?.forEach(inspection => {
      timeline.push({
        timestamp: inspection.created_at,
        type: 'inspection',
        description: `${inspection.quality_checkpoints?.name} checkpoint`,
        data: {
          passed: inspection.passed,
          stage: inspection.quality_checkpoints?.stage,
          inspector: inspection.workers,
          findings: inspection.findings
        }
      })
    })
    
    // Add hold events
    holds?.forEach(hold => {
      timeline.push({
        timestamp: hold.created_at,
        type: 'hold_created',
        description: `Quality hold: ${hold.reason}`,
        data: {
          severity: hold.severity,
          created_by: hold.workers
        }
      })
      
      if (hold.resolved_at) {
        timeline.push({
          timestamp: hold.resolved_at,
          type: 'hold_resolved',
          description: 'Quality hold resolved',
          data: {
            resolution: hold.resolution,
            resolved_by: hold.resolved_by
          }
        })
      }
    })
    
    // Sort timeline by timestamp
    timeline.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    
    return NextResponse.json({
      component: {
        ...component,
        paired_component: pairedComponent
      },
      timeline,
      inspections,
      holds,
      summary: {
        total_inspections: inspections?.length || 0,
        passed_inspections: inspections?.filter(i => i.passed).length || 0,
        total_holds: holds?.length || 0,
        active_holds: holds?.filter(h => !h.resolved_at).length || 0,
        current_grade: component.grade,
        journey: component.journey || []
      }
    })
  } catch (error) {
    console.error('Component journey error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
  */
}