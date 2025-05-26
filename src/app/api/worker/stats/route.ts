import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Get worker profile
    const { data: worker } = await supabase
      .from('workers')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()
    
    if (!worker) {
      return NextResponse.json({ error: 'Worker not found' }, { status: 404 })
    }
    
    // Get task statistics
    const [totalResult, inProgressResult, completedResult, urgentResult] = await Promise.all([
      // Total tasks assigned
      supabase
        .from('work_tasks')
        .select('id', { count: 'exact', head: true })
        .eq('assigned_to_id', worker.id)
        .neq('status', 'failed_qc'),
      
      // In progress tasks
      supabase
        .from('work_tasks')
        .select('id', { count: 'exact', head: true })
        .eq('assigned_to_id', worker.id)
        .eq('status', 'in_progress'),
      
      // Completed this week
      supabase
        .from('work_tasks')
        .select('id', { count: 'exact', head: true })
        .eq('assigned_to_id', worker.id)
        .eq('status', 'completed')
        .gte('completed_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
      
      // Urgent tasks
      supabase
        .from('work_tasks')
        .select('id', { count: 'exact', head: true })
        .eq('assigned_to_id', worker.id)
        .eq('priority', 3)
        .neq('status', 'completed')
        .neq('status', 'failed_qc')
    ])
    
    return NextResponse.json({
      totalTasks: totalResult.count || 0,
      inProgress: inProgressResult.count || 0,
      completed: completedResult.count || 0,
      urgent: urgentResult.count || 0
    })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}