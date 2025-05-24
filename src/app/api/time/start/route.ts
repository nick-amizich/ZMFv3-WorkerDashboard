import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Get worker details
    const { data: worker } = await supabase
      .from('workers')
      .select('id, is_active')
      .eq('auth_user_id', user.id)
      .single()
    
    if (!worker?.is_active) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    const body = await request.json()
    const { task_id, batch_id, stage } = body
    
    // Validate required fields
    if (!stage) {
      return NextResponse.json({ 
        error: 'stage is required' 
      }, { status: 400 })
    }
    
    // Must have either task_id or batch_id, but not both
    if ((!task_id && !batch_id) || (task_id && batch_id)) {
      return NextResponse.json({ 
        error: 'Either task_id or batch_id is required, but not both' 
      }, { status: 400 })
    }
    
    // Verify task or batch exists and worker has access
    if (task_id) {
      const { data: task } = await supabase
        .from('work_tasks')
        .select('assigned_to_id, status')
        .eq('id', task_id)
        .single()
      
      if (!task || task.assigned_to_id !== worker.id) {
        return NextResponse.json({ 
          error: 'Task not found or not assigned to you' 
        }, { status: 404 })
      }
    }
    
    if (batch_id) {
      const { data: batch } = await supabase
        .from('work_batches')
        .select('id, status')
        .eq('id', batch_id)
        .single()
      
      if (!batch) {
        return NextResponse.json({ 
          error: 'Batch not found' 
        }, { status: 404 })
      }
    }
    
    // Check if worker already has an active timer
    const { data: activeTimer } = await supabase
      .from('time_logs')
      .select('id')
      .eq('worker_id', worker.id)
      .is('end_time', null)
      .single()
    
    if (activeTimer) {
      return NextResponse.json({ 
        error: 'You already have an active timer. Stop it first before starting a new one.' 
      }, { status: 400 })
    }
    
    // Create the time log entry
    const { data: timeLog, error: createError } = await supabase
      .from('time_logs')
      .insert({
        worker_id: worker.id,
        task_id,
        batch_id,
        stage,
        start_time: new Date().toISOString()
      })
      .select(`
        *,
        task:work_tasks(
          id,
          task_description,
          order_item:order_items(
            product_name,
            order:orders(order_number, customer_name)
          )
        ),
        batch:work_batches(
          id,
          name,
          workflow_template:workflow_templates(name)
        )
      `)
      .single()
    
    if (createError) {
      console.error('Error creating time log:', createError)
      return NextResponse.json({ error: 'Failed to start timer' }, { status: 500 })
    }
    
    return NextResponse.json(timeLog)
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 