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
    const { task_id } = body
    
    // Verify task exists and worker has access
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
    
    // Check if worker already has an active timer
    const { data: activeTimer } = await supabase
      .from('work_logs')
      .select('id')
      .eq('worker_id', worker.id)
      .is('end_time', null)
      .single()
    
    if (activeTimer) {
      return NextResponse.json({ 
        error: 'You already have an active timer. Stop it first before starting a new one.' 
      }, { status: 400 })
    }
    
    // Create the work log entry
    const { data: workLog, error: createError } = await supabase
      .from('work_logs')
      .insert({
        worker_id: worker.id,
        task_id,
        start_time: new Date().toISOString()
      })
      .select(`
        *,
        task:work_tasks(
          id,
          custom_notes,
          order_item:order_items(
            product_name,
            order:orders(order_number, customer_name)
          )
        )
      `)
      .single()
    
    if (createError) {
      console.error('Error creating work log:', createError)
      return NextResponse.json({ error: 'Failed to start timer' }, { status: 500 })
    }
    
    return NextResponse.json(workLog)
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 