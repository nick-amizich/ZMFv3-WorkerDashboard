import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ workerId: string }> }
) {
  const { workerId } = await params;
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Verify the user can access these tasks
    const { data: currentWorker } = await supabase
      .from('workers')
      .select('id, role, is_active')
      .eq('auth_user_id', user.id)
      .single()
    
    if (!currentWorker?.is_active) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    // Workers can only see their own tasks, managers can see all
    if (currentWorker.role === 'worker' && currentWorker.id !== workerId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    // Fetch tasks for the worker
    const { data: tasks, error: tasksError } = await supabase
      .from('work_tasks')
      .select(`
        *,
        order_item:order_items(
          product_name,
          order:orders(
            order_number,
            customer_name
          )
        )
      `)
      .eq('assigned_to_id', workerId)
      .neq('status', 'completed')
      .order('priority', { ascending: false })
      .order('created_at', { ascending: true })
    
    if (tasksError) {
      console.error('Error fetching tasks:', tasksError)
      return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 })
    }
    
    return NextResponse.json(tasks || [])
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}