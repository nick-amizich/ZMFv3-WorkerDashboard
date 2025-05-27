import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await params
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
    
    // Verify the task is assigned to this worker
    const { data: task } = await supabase
      .from('work_tasks')
      .select('assigned_to_id, status')
      .eq('id', taskId)
      .single()
    
    if (!task || task.assigned_to_id !== worker.id) {
      return NextResponse.json({ error: 'Task not found or not assigned to you' }, { status: 404 })
    }
    
    if (task.status !== 'pending') {
      return NextResponse.json({ error: 'Task cannot be started' }, { status: 400 })
    }
    
    // Update task status
    const { data: updatedTask, error: updateError } = await supabase
      .from('work_tasks')
      .update({
        status: 'in_progress',
        assigned_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', taskId)
      .select()
      .single()
    
    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 })
    }
    
    // Log entry removed - work_logs table no longer exists
    
    return NextResponse.json({ task: updatedTask })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}