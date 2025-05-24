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
    
    // Validate employee status (only managers can assign workflows)
    const { data: worker } = await supabase
      .from('workers')
      .select('id, role, is_active')
      .eq('auth_user_id', user.id)
      .single()
    
    if (!worker?.is_active || !['manager', 'supervisor'].includes(worker.role || '')) {
      return NextResponse.json({ error: 'Forbidden: Only managers can assign workflows' }, { status: 403 })
    }
    
    const { id: batchId } = await params
    const body = await request.json()
    const { 
      workflow_template_id,
      start_at_stage,
      reset_progress = false,
      notes
    } = body
    
    // Validate required fields
    if (!workflow_template_id) {
      return NextResponse.json({ 
        error: 'workflow_template_id is required' 
      }, { status: 400 })
    }
    
    // Get the batch to verify it exists
    const { data: batch, error: batchError } = await supabase
      .from('work_batches')
      .select('*')
      .eq('id', batchId)
      .single()
    
    if (batchError || !batch) {
      return NextResponse.json({ 
        error: 'Batch not found' 
      }, { status: 404 })
    }
    
    // Get the workflow template to verify it exists and get stages
    const { data: workflow, error: workflowError } = await supabase
      .from('workflow_templates')
      .select('*')
      .eq('id', workflow_template_id)
      .eq('is_active', true)
      .single()
    
    if (workflowError || !workflow) {
      return NextResponse.json({ 
        error: 'Workflow template not found or inactive' 
      }, { status: 404 })
    }
    
    const stages = workflow.stages as any[]
    
    // Determine starting stage
    let targetStage = start_at_stage
    if (!targetStage && stages.length > 0) {
      targetStage = stages[0].stage // Start at first stage
    }
    
    // Validate the starting stage exists in the workflow
    if (targetStage) {
      const stageExists = stages.find(s => s.stage === targetStage)
      if (!stageExists) {
        return NextResponse.json({ 
          error: `Stage '${targetStage}' does not exist in the selected workflow` 
        }, { status: 400 })
      }
    }
    
    // Store previous workflow info for logging
    const previousWorkflowId = batch.workflow_template_id
    const previousStage = batch.current_stage
    
    // Update the batch with new workflow assignment
    const { data: updatedBatch, error: updateError } = await supabase
      .from('work_batches')
      .update({
        workflow_template_id,
        current_stage: targetStage,
        status: targetStage ? 'active' : 'pending',
        updated_at: new Date().toISOString()
      })
      .eq('id', batchId)
      .select(`
        *,
        workflow_template:workflow_templates(
          id,
          name,
          stages
        )
      `)
      .single()
    
    if (updateError) {
      console.error('Error updating batch:', updateError)
      return NextResponse.json({ error: 'Failed to assign workflow to batch' }, { status: 500 })
    }
    
    // If resetting progress, remove existing tasks for this batch
    if (reset_progress) {
      const { error: deleteTasksError } = await supabase
        .from('work_tasks')
        .delete()
        .eq('batch_id', batchId)
      
      if (deleteTasksError) {
        console.error('Error removing existing tasks:', deleteTasksError)
        // Don't fail the whole operation, just log it
      }
    }
    
    // Record the workflow assignment in stage transitions
    const { error: transitionError } = await supabase
      .from('stage_transitions')
      .insert({
        batch_id: batchId,
        workflow_template_id,
        from_stage: previousStage,
        to_stage: targetStage,
        transition_type: 'manual',
        transitioned_by_id: worker.id,
        notes: notes || `Workflow assigned: ${workflow.name}`
      })
    
    if (transitionError) {
      console.error('Error recording workflow assignment:', transitionError)
      // Don't fail the whole operation, just log it
    }
    
    // Log the workflow assignment
    const { error: logError } = await supabase
      .from('workflow_execution_log')
      .insert({
        workflow_template_id,
        batch_id: batchId,
        stage: targetStage || 'workflow_assignment',
        action: 'workflow_assigned',
        action_details: {
          previous_workflow_id: previousWorkflowId,
          previous_stage: previousStage,
          new_workflow_id: workflow_template_id,
          new_stage: targetStage,
          start_at_stage: start_at_stage,
          reset_progress
        },
        executed_by_id: worker.id,
        execution_type: 'manual'
      })
    
    if (logError) {
      console.error('Error logging workflow assignment:', logError)
      // Don't fail the whole operation, just log it
    }
    
    // Optionally create initial tasks for the starting stage
    if (targetStage && body.create_initial_tasks) {
      const currentStageData = stages.find(s => s.stage === targetStage)
      
      if (currentStageData) {
        const taskInserts = batch.order_item_ids.map(orderItemId => ({
          order_item_id: orderItemId,
          batch_id: batchId,
          task_type: targetStage,
          stage: targetStage,
          task_description: `${currentStageData.name}: ${currentStageData.description || ''}`,
          workflow_template_id,
          auto_generated: true,
          manual_assignment: !currentStageData.is_automated,
          estimated_hours: currentStageData.estimated_hours || null,
          status: 'pending',
          priority: 'normal'
        }))
        
        const { error: tasksError } = await supabase
          .from('work_tasks')
          .insert(taskInserts)
        
        if (tasksError) {
          console.error('Error creating initial tasks:', tasksError)
          // Don't fail the whole operation, just log it
        }
      }
    }
    
    return NextResponse.json({
      ...updatedBatch,
      assignment_info: {
        assigned_workflow: workflow.name,
        previous_workflow_id: previousWorkflowId,
        started_at_stage: targetStage,
        reset_progress,
        assigned_by: worker.id,
        assigned_at: new Date().toISOString()
      }
    })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 