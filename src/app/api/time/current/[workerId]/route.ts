import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ workerId: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Get current worker details
    const { data: currentWorker } = await supabase
      .from('workers')
      .select('id, role, is_active')
      .eq('auth_user_id', user.id)
      .single()
    
    if (!currentWorker?.is_active) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    const { workerId } = await params
    
    // Workers can only see their own timer, managers can see any timer
    if (currentWorker.role === 'worker' && currentWorker.id !== workerId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    // Get the active timer for the worker
    const { data: activeTimer, error: timerError } = await supabase
      .from('time_logs')
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
      .eq('worker_id', workerId)
      .is('end_time', null)
      .single()
    
    if (timerError && timerError.code !== 'PGRST116') { // Not found error is OK
      console.error('Error fetching active timer:', timerError)
      return NextResponse.json({ error: 'Failed to fetch timer' }, { status: 500 })
    }
    
    return NextResponse.json(activeTimer || null)
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 