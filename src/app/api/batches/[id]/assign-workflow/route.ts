import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // ALWAYS validate employee status
    const { data: worker } = await supabase
      .from('workers')
      .select('id, role, is_active')
      .eq('auth_user_id', user.id)
      .single()
    
    if (!worker?.is_active || !['manager', 'supervisor'].includes(worker.role || '')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    const { id } = await params
    const body = await request.json()
    const { workflow_template_id, start_at_stage } = body
    
    // Validate required fields
    if (!workflow_template_id) {
      return NextResponse.json({ 
        error: 'workflow_template_id is required' 
      }, { status: 400 })
    }
    
    // Check if batch exists
    const { data: batch, error: batchError } = await supabase
      .from('work_batches')
      .select('*')
      .eq('id', id)
      .single()
    
    if (batchError || !batch) {
      return NextResponse.json({ error: 'Batch not found' }, { status: 404 })
    }
    
    // Validate workflow exists
    const { data: workflow, error: workflowError } = await supabase
      .from('workflow_templates')
      .select('*')
      .eq('id', workflow_template_id)
      .single()
    
    if (workflowError || !workflow) {
      return NextResponse.json({ error: 'Workflow template not found' }, { status: 404 })
    }
    
    // Update batch with new workflow
    const stages = (workflow.stages as any[]) || []
    const firstStage = stages.length > 0 ? stages[0]?.stage : null
    
    const { data: updatedBatch, error: updateError } = await supabase
      .from('work_batches')
      .update({
        workflow_template_id,
        current_stage: start_at_stage || firstStage,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select(`
        *,
        workflow_template:workflow_templates(id, name, description)
      `)
      .single()
    
    if (updateError) {
      console.error('Error updating batch:', updateError)
      return NextResponse.json({ error: 'Failed to assign workflow to batch' }, { status: 500 })
    }
    
    return NextResponse.json({ 
      message: 'Workflow assigned to batch successfully',
      batch: updatedBatch
    })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 