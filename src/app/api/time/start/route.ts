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
        error: 'Stage is required' 
      }, { status: 400 })
    }
    
    // Must have either task_id or batch_id
    if (!task_id && !batch_id) {
      return NextResponse.json({ 
        error: 'Either task_id or batch_id is required' 
      }, { status: 400 })
    }
    
    if (task_id && batch_id) {
      return NextResponse.json({ 
        error: 'Cannot specify both task_id and batch_id' 
      }, { status: 400 })
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
        error: 'Worker already has an active timer. Please stop the current timer first.' 
      }, { status: 400 })
    }
    
    // If task_id is provided, verify the task exists and is assigned to this worker
    if (task_id) {
      const { data: task } = await supabase
        .from('work_tasks')
        .select('id, assigned_to_id')
        .eq('id', task_id)
        .single()
      
      if (!task) {
        return NextResponse.json({ 
          error: 'Task not found' 
        }, { status: 404 })
      }
      
      if (task.assigned_to_id !== worker.id) {
        return NextResponse.json({ 
          error: 'Task is not assigned to you' 
        }, { status: 403 })
      }
    }
    
    // If batch_id is provided, verify the batch exists
    if (batch_id) {
      const { data: batch } = await supabase
        .from('work_batches')
        .select('id')
        .eq('id', batch_id)
        .single()
      
      if (!batch) {
        return NextResponse.json({ 
          error: 'Batch not found' 
        }, { status: 404 })
      }
    }
    
    // Start the timer
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
            order:orders(order_number)
          )
        ),
        batch:work_batches(
          id,
          name
        )
      `)
      .single()
    
    if (createError) {
      console.error('Error starting timer:', createError)
      return NextResponse.json({ error: 'Failed to start timer' }, { status: 500 })
    }
    
    return NextResponse.json(timeLog)
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 