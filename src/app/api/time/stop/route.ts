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
      .select('id, active')
      .eq('auth_user_id', user.id)
      .single()
    
    if (!worker?.is_active) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    const body = await request.json()
    const { work_log_id, notes } = body
    
    // If work_log_id is provided, use it directly
    let workLogId = work_log_id
    
    // If no work_log_id provided, find the worker's active timer
    if (!workLogId) {
      const { data: activeTimer } = await supabase
        .from('work_logs')
        .select('id')
        .eq('employee_id', worker.id)
        .is('end_time', null)
        .single()
      
      if (!activeTimer) {
        return NextResponse.json({ 
          error: 'No active timer found' 
        }, { status: 404 })
      }
      
      workLogId = activeTimer.id
    }
    
    // Verify the work log exists and belongs to this worker
    const { data: workLog } = await supabase
      .from('work_logs')
      .select('employee_id, end_time')
      .eq('id', workLogId)
      .single()
    
    if (!workLog || workLog.employee_id !== worker.id) {
      return NextResponse.json({ 
        error: 'Work log not found or not owned by you' 
      }, { status: 404 })
    }
    
    if (workLog.end_time) {
      return NextResponse.json({ 
        error: 'Timer already stopped' 
      }, { status: 400 })
    }
    
    // Stop the timer
    const endTime = new Date().toISOString()
    const { data: updatedWorkLog, error: updateError } = await supabase
      .from('work_logs')
      .update({
        end_time: endTime
      })
      .eq('id', workLogId)
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
    
    if (updateError) {
      console.error('Error stopping timer:', updateError)
      return NextResponse.json({ error: 'Failed to stop timer' }, { status: 500 })
    }
    
    return NextResponse.json(updatedWorkLog)
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 