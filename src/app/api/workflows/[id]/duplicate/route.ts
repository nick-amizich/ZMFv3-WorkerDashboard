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
    
    // Validate employee status (only managers can duplicate workflows)
    const { data: worker } = await supabase
      .from('workers')
      .select('id, role, is_active')
      .eq('auth_user_id', user.id)
      .single()
    
    if (!worker?.is_active || !['manager', 'supervisor'].includes(worker.role || '')) {
      return NextResponse.json({ error: 'Forbidden: Only managers can duplicate workflows' }, { status: 403 })
    }
    
    const { id } = await params
    const body = await request.json()
    const { new_name, new_description } = body
    
    // Get the original workflow
    const { data: originalWorkflow, error: originalError } = await supabase
      .from('workflow_templates')
      .select('*')
      .eq('id', id)
      .single()
    
    if (originalError || !originalWorkflow) {
      return NextResponse.json({ 
        error: 'Original workflow template not found' 
      }, { status: 404 })
    }
    
    // Generate new name if not provided
    const duplicatedName = new_name || `${originalWorkflow.name} (Copy)`
    const duplicatedDescription = new_description || `Copy of: ${originalWorkflow.description || originalWorkflow.name}`
    
    // Create the duplicated workflow
    const { data: duplicatedWorkflow, error: duplicateError } = await supabase
      .from('workflow_templates')
      .insert({
        name: duplicatedName,
        description: duplicatedDescription,
        trigger_rules: originalWorkflow.trigger_rules,
        stages: originalWorkflow.stages,
        stage_transitions: originalWorkflow.stage_transitions,
        is_active: false, // Start as inactive for safety
        is_default: false, // Copies are never default
        created_by_id: worker.id
      })
      .select(`
        *,
        created_by:workers!workflow_templates_created_by_id_fkey(
          id,
          name
        )
      `)
      .single()
    
    if (duplicateError) {
      console.error('Error duplicating workflow:', duplicateError)
      
      // Check for duplicate name error
      if (duplicateError.code === '23505') {
        return NextResponse.json({ 
          error: 'A workflow with this name already exists. Please choose a different name.' 
        }, { status: 409 })
      }
      
      return NextResponse.json({ error: 'Failed to duplicate workflow' }, { status: 500 })
    }
    
    // Log the workflow duplication
    const { error: logError } = await supabase
      .from('workflow_execution_log')
      .insert({
        workflow_template_id: duplicatedWorkflow.id,
        stage: 'workflow_management',
        action: 'workflow_duplicated',
        action_details: {
          original_workflow_id: originalWorkflow.id,
          original_name: originalWorkflow.name,
          new_name: duplicatedName
        },
        executed_by_id: worker.id,
        execution_type: 'manual'
      })
    
    if (logError) {
      console.error('Error logging workflow duplication:', logError)
      // Don't fail the whole operation, just log it
    }
    
    return NextResponse.json({
      ...duplicatedWorkflow,
      duplication_info: {
        original_id: originalWorkflow.id,
        original_name: originalWorkflow.name,
        duplicated_at: new Date().toISOString()
      }
    })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 