import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Get employee record
    const { data: employee } = await supabase
      .from('employees')
      .select('id, role, active')
      .eq('auth_user_id', user.id)
      .single()
    
    if (!employee?.active) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    const body = await request.json()
    const {
      task_id,
      checkpoint_id,
      component_tracking_id,
      passed,
      failed_checks,
      root_cause,
      corrective_action,
      prevention_suggestion,
      time_to_resolve,
      notes,
      photo_urls,
      measurement_data
    } = body
    
    // Validate required fields
    if (!task_id || !checkpoint_id || passed === undefined) {
      return NextResponse.json({ 
        error: 'Missing required fields: task_id, checkpoint_id, and passed status' 
      }, { status: 400 })
    }
    
    // Create inspection result
    const { data: inspection, error: inspectionError } = await supabase
      .from('inspection_results')
      .insert({
        task_id,
        checkpoint_id,
        component_tracking_id,
        worker_id: employee.id,
        passed,
        failed_checks: failed_checks || [],
        root_cause,
        corrective_action,
        prevention_suggestion,
        time_to_resolve,
        notes,
        photo_urls: photo_urls || [],
        measurement_data: measurement_data || {},
        inspected_at: new Date().toISOString()
      })
      .select()
      .single()
    
    if (inspectionError) throw inspectionError
    
    // Update task with quality score if applicable
    if (passed) {
      const { error: taskError } = await supabase
        .from('work_tasks')
        .update({
          quality_score: 100,
          updated_at: new Date().toISOString()
        })
        .eq('id', task_id)
      
      if (taskError) console.error('Failed to update task quality score:', taskError)
    } else {
      // Increment rework count on task
      const { error: reworkError } = await supabase.rpc('increment', {
        table_name: 'work_tasks',
        column_name: 'rework_count',
        row_id: task_id
      })
      
      if (reworkError) console.error('Failed to increment rework count:', reworkError)
    }
    
    // If component tracking ID provided, update journey
    if (component_tracking_id) {
      const { data: component } = await supabase
        .from('component_tracking')
        .select('journey')
        .eq('id', component_tracking_id)
        .single()
      
      if (component) {
        const journey = component.journey || []
        journey.push({
          stage: checkpoint_id,
          worker: employee.id,
          timestamp: new Date().toISOString(),
          checks_passed: passed ? 'all' : failed_checks,
          issues: !passed ? failed_checks : []
        })
        
        await supabase
          .from('component_tracking')
          .update({
            journey,
            updated_at: new Date().toISOString()
          })
          .eq('id', component_tracking_id)
      }
    }
    
    // Check if we need to create a quality hold
    if (!passed && checkpoint_id) {
      const { data: checkpoint } = await supabase
        .from('quality_checkpoints')
        .select('severity, on_failure')
        .eq('id', checkpoint_id)
        .single()
      
      if (checkpoint?.severity === 'critical' && checkpoint?.on_failure === 'block_progress') {
        // Get batch ID from task
        const { data: task } = await supabase
          .from('work_tasks')
          .select('batch_id')
          .eq('id', task_id)
          .single()
        
        if (task?.batch_id) {
          // Create quality hold
          await supabase
            .from('quality_holds')
            .insert({
              batch_id: task.batch_id,
              component_tracking_id,
              hold_reason: `Failed critical quality checkpoint: ${failed_checks.join(', ')}`,
              severity: 'critical',
              reported_by: employee.id,
              status: 'active'
            })
        }
      }
    }
    
    return NextResponse.json({ 
      success: true,
      inspection,
      can_proceed: passed || body.checkpoint?.on_failure !== 'block_progress'
    }, { status: 201 })
    
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Get inspection history for a task
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
    
    const { searchParams } = new URL(request.url)
    const taskId = searchParams.get('task_id')
    const componentId = searchParams.get('component_id')
    
    if (!taskId && !componentId) {
      return NextResponse.json({ 
        error: 'Either task_id or component_id is required' 
      }, { status: 400 })
    }
    
    let query = supabase
      .from('inspection_results')
      .select(`
        *,
        worker:workers(name),
        checkpoint:quality_checkpoints(stage, checkpoint_type, severity)
      `)
      .order('inspected_at', { ascending: false })
    
    if (taskId) {
      query = query.eq('task_id', taskId)
    }
    
    if (componentId) {
      query = query.eq('component_tracking_id', componentId)
    }
    
    const { data: inspections, error } = await query
    
    if (error) throw error
    
    return NextResponse.json(inspections)
    
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}