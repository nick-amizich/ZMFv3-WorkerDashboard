import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Validate employee status
    const { data: worker } = await supabase
      .from('workers')
      .select('role, is_active')
      .eq('auth_user_id', user.id)
      .single()
    
    if (!worker?.is_active) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    const { id } = await params
    
    // Get the workflow template
    const { data: workflow, error: workflowError } = await supabase
      .from('workflow_templates')
      .select(`
        *,
        created_by:workers!workflow_templates_created_by_id_fkey(
          id,
          name
        )
      `)
      .eq('id', id)
      .single()
    
    if (workflowError || !workflow) {
      return NextResponse.json({ 
        error: 'Workflow template not found' 
      }, { status: 404 })
    }
    
    return NextResponse.json(workflow)
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Validate employee status (only managers can update workflows)
    const { data: worker } = await supabase
      .from('workers')
      .select('id, role, is_active')
      .eq('auth_user_id', user.id)
      .single()
    
    if (!worker?.is_active || !['manager', 'supervisor'].includes(worker.role || '')) {
      return NextResponse.json({ error: 'Forbidden: Only managers can update workflows' }, { status: 403 })
    }
    
    const { id } = await params
    const body = await request.json()
    const { 
      name,
      description,
      trigger_rules,
      stages,
      stage_transitions,
      is_active
    } = body
    
    // Validate required fields
    if (!name || !stages || !stage_transitions) {
      return NextResponse.json({ 
        error: 'Missing required fields: name, stages, and stage_transitions are required' 
      }, { status: 400 })
    }
    
    // Validate stages structure
    if (!Array.isArray(stages) || stages.length === 0) {
      return NextResponse.json({ 
        error: 'Stages must be a non-empty array' 
      }, { status: 400 })
    }
    
    // Validate stage_transitions structure
    if (!Array.isArray(stage_transitions)) {
      return NextResponse.json({ 
        error: 'Stage transitions must be an array' 
      }, { status: 400 })
    }
    
    // Check if workflow exists
    const { data: existingWorkflow } = await supabase
      .from('workflow_templates')
      .select('id, name, created_by_id')
      .eq('id', id)
      .single()
    
    if (!existingWorkflow) {
      return NextResponse.json({ 
        error: 'Workflow template not found' 
      }, { status: 404 })
    }
    
    // Update the workflow template
    const { data: updatedWorkflow, error: updateError } = await supabase
      .from('workflow_templates')
      .update({
        name,
        description,
        trigger_rules: trigger_rules || { manual_only: true },
        stages,
        stage_transitions,
        is_active: is_active !== undefined ? is_active : true,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select(`
        *,
        created_by:workers!workflow_templates_created_by_id_fkey(
          id,
          name
        )
      `)
      .single()
    
    if (updateError) {
      console.error('Error updating workflow:', updateError)
      return NextResponse.json({ error: 'Failed to update workflow' }, { status: 500 })
    }
    
    // Log the workflow update
    const { error: logError } = await supabase
      .from('workflow_execution_log')
      .insert({
        workflow_template_id: id,
        stage: 'workflow_management',
        action: 'workflow_updated',
        action_details: {
          updated_fields: Object.keys(body),
          previous_name: existingWorkflow.name || 'Unknown'
        },
        executed_by_id: worker.id,
        execution_type: 'manual'
      })
    
    if (logError) {
      console.error('Error logging workflow update:', logError)
      // Don't fail the whole operation, just log it
    }
    
    return NextResponse.json(updatedWorkflow)
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 