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
    
    // Validate employee status and role
    const { data: worker } = await supabase
      .from('workers')
      .select('id, role, is_active')
      .eq('auth_user_id', user.id)
      .single()
    
    if (!worker?.is_active) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    // Only managers can transition batches
    if (!['manager', 'supervisor'].includes(worker.role || '')) {
      return NextResponse.json({ error: 'Forbidden: Only managers can transition batches' }, { status: 403 })
    }
    
    const { id: batchId } = await params
    const body = await request.json()
    const { 
      to_stage,
      notes,
      transition_type = 'manual',
      create_tasks = false,
      auto_assign = false
    } = body
    
    // Validate required fields
    if (!to_stage) {
      return NextResponse.json({ 
        error: 'to_stage is required' 
      }, { status: 400 })
    }
    
    // Get the batch with its current workflow
    const { data: batch, error: batchError } = await supabase
      .from('work_batches')
      .select(`
        *,
        workflow_template:workflow_templates(
          id,
          name,
          stages,
          stage_transitions
        )
      `)
      .eq('id', batchId)
      .single()
    
    if (batchError || !batch) {
      return NextResponse.json({ 
        error: 'Batch not found' 
      }, { status: 404 })
    }
    
    // Validate the transition is allowed
    if (batch.workflow_template) {
      const stages = batch.workflow_template.stages as any[]
      
      // Check if the to_stage exists in the workflow
      const targetStage = stages.find(s => s.stage === to_stage)
      if (!targetStage && to_stage !== 'pending') {
        return NextResponse.json({ 
          error: `Stage '${to_stage}' is not defined in the workflow` 
        }, { status: 400 })
      }
      
      // If we have a current stage, check if it's the same
      if (batch.current_stage) {
        // Skip validation if moving to the same stage
        if (batch.current_stage === to_stage) {
          return NextResponse.json({ 
            error: `Batch is already in the '${to_stage}' stage` 
          }, { status: 400 })
        }
      }
      
      // Allow all transitions for manager override (forward and backward)
      // This enables fixing mistakes and rework scenarios
    }
    
    // Update the batch
    const { data: updatedBatch, error: updateError } = await supabase
      .from('work_batches')
      .update({
        current_stage: to_stage,
        status: 'active',
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
      return NextResponse.json({ error: 'Failed to update batch' }, { status: 500 })
    }
    
    // Record the transition
    const { error: transitionError } = await supabase
      .from('stage_transitions')
      .insert({
        batch_id: batchId,
        workflow_template_id: batch.workflow_template_id,
        from_stage: batch.current_stage,
        to_stage,
        transition_type,
        transitioned_by_id: worker.id,
        notes
      })
    
    if (transitionError) {
      console.error('Error recording transition:', transitionError)
      // Don't fail the whole operation, just log it
    }
    
    // Create tasks if requested
    if (create_tasks && batch.workflow_template) {
      const stages = batch.workflow_template.stages as any[]
      const currentStageData = stages.find(s => s.stage === to_stage)
      
      if (currentStageData) {
        // Create a task for each order item in the batch
        const taskInserts = batch.order_item_ids.map(orderItemId => ({
          order_item_id: orderItemId,
          batch_id: batchId,
          task_type: to_stage,
          stage: to_stage,
          task_description: `${currentStageData.name}: ${currentStageData.description || ''}`,
          workflow_template_id: batch.workflow_template_id,
          auto_generated: true,
          manual_assignment: !auto_assign,
          estimated_hours: currentStageData.estimated_hours || null,
          status: 'pending',
          priority: 'normal'
        }))
        
        const { error: tasksError } = await supabase
          .from('work_tasks')
          .insert(taskInserts)
        
        if (tasksError) {
          console.error('Error creating tasks:', tasksError)
          // Don't fail the whole operation, just log it
        }
      }
    }
    
    // Log the workflow execution
    const { error: logError } = await supabase
      .from('workflow_execution_log')
      .insert({
        workflow_template_id: batch.workflow_template_id,
        batch_id: batchId,
        stage: to_stage,
        action: 'stage_transition',
        action_details: {
          from_stage: batch.current_stage,
          to_stage,
          transition_type,
          create_tasks,
          auto_assign
        },
        executed_by_id: worker.id,
        execution_type: 'manual'
      })
    
    if (logError) {
      console.error('Error logging workflow execution:', logError)
      // Don't fail the whole operation, just log it
    }
    
    return NextResponse.json(updatedBatch)
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 