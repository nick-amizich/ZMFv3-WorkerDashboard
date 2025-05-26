import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const inspectionSchema = z.object({
  task_id: z.string().uuid(),
  checkpoint_id: z.string().uuid(),
  component_tracking_id: z.string().uuid().optional(),
  passed: z.boolean(),
  failed_checks: z.array(z.string()).optional(),
  root_cause: z.string().optional(),
  corrective_action: z.string().optional(),
  prevention_suggestion: z.string().optional(),
  time_to_resolve: z.number().optional(),
  notes: z.string().optional(),
  photo_urls: z.array(z.string()).optional(),
  measurement_data: z.record(z.any()).optional()
})

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { data: worker } = await supabase
      .from('workers')
      .select('role, is_active')
      .eq('auth_user_id', user.id)
      .single()
    
    if (!worker?.is_active) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    const searchParams = request.nextUrl.searchParams
    const taskId = searchParams.get('task_id')
    const componentId = searchParams.get('component_id')
    const passed = searchParams.get('passed')
    const limit = parseInt(searchParams.get('limit') || '50')
    
    let query = supabase
      .from('inspection_results')
      .select(`
        *,
        checkpoint:quality_checkpoints(
          stage,
          checkpoint_type,
          severity,
          checks
        ),
        worker:workers(
          id,
          name
        ),
        task:work_tasks(
          id,
          stage,
          order_item:order_items(
            product_name
          )
        ),
        component:component_tracking(
          cup_pair_id,
          left_cup_serial,
          right_cup_serial,
          grade
        )
      `)
      .order('inspected_at', { ascending: false })
      .limit(limit)
    
    if (taskId) {
      query = query.eq('task_id', taskId)
    }
    
    if (componentId) {
      query = query.eq('component_tracking_id', componentId)
    }
    
    if (passed !== null) {
      query = query.eq('passed', passed === 'true')
    }
    
    const { data: inspections, error: fetchError } = await query
    
    if (fetchError) {
      console.error('Error fetching inspections:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch inspections' }, { status: 500 })
    }
    
    return NextResponse.json({ inspections })
    
  } catch (error) {
    console.error('Inspections API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { data: worker } = await supabase
      .from('workers')
      .select('id, role, is_active')
      .eq('auth_user_id', user.id)
      .single()
    
    if (!worker?.is_active) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    const body = await request.json()
    const validatedData = inspectionSchema.parse(body)
    
    // Create inspection result
    const { data: inspection, error: createError } = await supabase
      .from('inspection_results')
      .insert({
        ...validatedData,
        worker_id: worker.id
      })
      .select()
      .single()
    
    if (createError) {
      console.error('Error creating inspection:', createError)
      return NextResponse.json({ error: 'Failed to create inspection' }, { status: 500 })
    }
    
    // If inspection failed and it's a critical checkpoint, update task status
    if (!validatedData.passed) {
      const { data: checkpoint } = await supabase
        .from('quality_checkpoints')
        .select('severity, on_failure')
        .eq('id', validatedData.checkpoint_id)
        .single()
      
      if (checkpoint?.on_failure === 'block_progress') {
        // Update task to blocked status
        await supabase
          .from('work_tasks')
          .update({ 
            status: 'blocked',
            notes: `Failed quality check: ${validatedData.root_cause || 'See inspection results'}`
          })
          .eq('id', validatedData.task_id)
      }
    }
    
    // Update component journey if component tracking ID provided
    if (validatedData.component_tracking_id) {
      const { data: component } = await supabase
        .from('component_tracking')
        .select('journey')
        .eq('id', validatedData.component_tracking_id)
        .single()
      
      if (component) {
        const journey = Array.isArray(component.journey) ? component.journey : []
        const { data: task } = await supabase
          .from('work_tasks')
          .select('stage')
          .eq('id', validatedData.task_id)
          .single()
        
        journey.push({
          stage: task?.stage || 'inspection',
          worker: worker.id,
          timestamp: new Date().toISOString(),
          duration_minutes: validatedData.time_to_resolve || 0,
          checks_passed: validatedData.passed ? ['quality_inspection'] : [],
          issues: validatedData.failed_checks || [],
          photos: validatedData.photo_urls || []
        })
        
        await supabase
          .from('component_tracking')
          .update({ journey })
          .eq('id', validatedData.component_tracking_id)
      }
    }
    
    return NextResponse.json({ inspection })
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error('Inspection Creation Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}