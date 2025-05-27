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
    
    // Get worker profile
    const { data: worker } = await supabase
      .from('workers')
      .select('id, is_active')
      .eq('auth_user_id', user.id)
      .single()
    
    if (!worker?.is_active) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    const body = await request.json()
    const { results, overall_status } = body
    
    // Verify the task belongs to this worker and is a QC task
    const { data: task } = await supabase
      .from('work_tasks')
      .select('id, task_type, assigned_to_id, stage')
      .eq('id', taskId)
      .single()
    
    if (!task || task.assigned_to_id !== worker.id) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }
    
    if (task.stage !== 'qc' && task.stage !== 'quality_check') {
      return NextResponse.json({ error: 'Not a QC task' }, { status: 400 })
    }
    
    // Create QC result
    const { data: qcResult, error: qcError } = await supabase
      .from('qc_results')
      .insert({
        task_id: taskId,
        performed_by: worker.id,
        results,
        overall_status,
        notes: results.notes || null
      })
      .select()
      .single()
    
    if (qcError) {
      console.error('Error creating QC result:', qcError)
      return NextResponse.json({ error: 'Failed to save QC results' }, { status: 500 })
    }
    
    // Update task status to completed
    const { error: updateError } = await supabase
      .from('work_tasks')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', taskId)
    
    if (updateError) {
      console.error('Error updating task:', updateError)
      return NextResponse.json({ error: 'Failed to update task' }, { status: 500 })
    }
    
    // Log removed - work_logs table no longer exists
    
    return NextResponse.json({ 
      success: true, 
      qcResult,
      message: `QC ${overall_status === 'pass' ? 'passed' : 'failed'}`
    })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}