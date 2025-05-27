import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { ApiLogger, DatabaseLogger, BusinessLogger } from '@/lib/api-logger'
import { logError as logErrorUtil, logBusiness } from '@/lib/logger'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const logContext = ApiLogger.logRequest(request)
  
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // ALWAYS validate worker status
    const { data: worker } = await supabase
      .from('workers')
      .select('id, role, is_active')
      .eq('auth_user_id', user.id)
      .single()
    
    if (!worker?.is_active || !['manager', 'supervisor'].includes(worker.role || '')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id: batchId } = await params
    const body = await request.json()
    const { to_stage, newStage, transition_type, notes } = body

    // Support both 'to_stage' and 'newStage' for compatibility
    const targetStage = to_stage || newStage

    if (!targetStage) {
      return NextResponse.json({ error: 'Target stage is required' }, { status: 400 })
    }

    // Handle special cases for production flow stages
    let finalTargetStage = targetStage
    if (targetStage === 'pending') {
      finalTargetStage = null  // Pending means no current stage
    } else if (targetStage === 'completed') {
      finalTargetStage = 'completed'
      // Also update batch status to completed
    }

    logBusiness('Batch transition initiated', 'BATCH_TRANSITION', {
      batchId,
      targetStage,
      initiatedBy: worker.id
    })

    // Get current batch data - using correct table name 'work_batches'
    const { data: batch, error: batchError } = await supabase
      .from('work_batches')
      .select(`
        *,
        workflow_template:workflow_templates!work_batches_workflow_template_id_fkey(id, name, stages)
      `)
      .eq('id', batchId)
      .single()
    
    if (batchError) {
      logErrorUtil(new Error(`Failed to fetch batch: ${batchError.message}`), 'BATCH_TRANSITION', {
        batchId,
        error: batchError
      })
      return NextResponse.json({ error: 'Batch not found' }, { status: 404 })
    }

    const workflow = batch.workflow_template
    if (!workflow || !workflow.stages) {
      logErrorUtil(new Error('Batch has no workflow or workflow has no stages'), 'BATCH_TRANSITION', {
        batchId,
        workflowId: batch.workflow_template_id
      })
      return NextResponse.json({ error: 'Invalid workflow configuration' }, { status: 400 })
    }

    // Validate new stage exists in workflow - cast stages to proper type
    const stages = workflow.stages as Array<{ stage: string; tasks?: Array<any> }>
    const validStages = stages.map((s: any) => s.stage)
    
    // Allow special stages like 'pending' and 'completed' even if not in workflow
    const specialStages = ['pending', 'completed']
    const isValidStage = validStages.includes(targetStage) || specialStages.includes(targetStage)
    
    if (!isValidStage) {
      logErrorUtil(new Error(`Invalid stage: ${targetStage}`), 'BATCH_TRANSITION', {
        batchId,
        targetStage,
        validStages: [...validStages, ...specialStages]
      })
      return NextResponse.json({ 
        error: 'Invalid stage for this workflow',
        validStages: [...validStages, ...specialStages]
      }, { status: 400 })
    }

    const currentStage = batch.current_stage

    // Update batch stage and status if needed - using correct table name 'work_batches'
    const updateData: any = { 
      current_stage: finalTargetStage,
      updated_at: new Date().toISOString()
    }
    
    // Update status to completed if moving to completed stage
    if (targetStage === 'completed') {
      updateData.status = 'completed'
    } else if (batch.status === 'pending' && finalTargetStage) {
      // Activate batch if it's moving from pending to an actual stage
      updateData.status = 'active'
    }

    const { error: updateError } = await supabase
      .from('work_batches')
      .update(updateData)
      .eq('id', batchId)
    
    if (updateError) {
      logErrorUtil(new Error(`Failed to update batch stage: ${updateError.message}`), 'BATCH_TRANSITION', {
        batchId,
        updateError
      })
      return NextResponse.json({ error: 'Failed to update batch' }, { status: 500 })
    }

    // Record the transition in stage_transitions table
    const { error: transitionError } = await supabase
      .from('stage_transitions')
      .insert([{
        batch_id: batchId,
        from_stage: currentStage,
        to_stage: targetStage,
        transitioned_by_id: worker.id,
        transition_time: new Date().toISOString(),
        workflow_template_id: batch.workflow_template_id
      }])

    if (transitionError) {
      logErrorUtil(new Error(`Failed to record transition: ${transitionError.message}`), 'BATCH_TRANSITION', {
        batchId,
        transitionError
      })
      // Continue execution even if transition recording fails
    }

    // Get workflow stage configuration to determine if we need to create tasks
    // Only create tasks for actual workflow stages, not special stages like 'pending' or 'completed'
    const stageConfig = finalTargetStage ? stages.find((s: any) => s.stage === finalTargetStage) : null
    
    if (stageConfig?.tasks && stageConfig.tasks.length > 0) {
      logBusiness('Creating tasks for new stage', 'TASK_CREATION', {
        batchId,
        stage: finalTargetStage,
        taskCount: stageConfig.tasks.length
      })

      // Create tasks for this stage - using correct table name 'work_tasks'
      const tasksToCreate = stageConfig.tasks.map((task: any) => ({
        id: `${batchId}-${task.type}-${Date.now()}`,
        batch_id: batchId,
        task_type: task.type,
        stage: finalTargetStage,
        task_description: task.title || `${task.type} for batch`,
        priority: task.priority || 'normal',
        estimated_hours: (task.estimated_time_minutes || 60) / 60,
        status: 'pending',
        assigned_by_id: worker.id,
        workflow_template_id: batch.workflow_template_id
      }))

      const { error: tasksError } = await supabase
        .from('work_tasks')
        .insert(tasksToCreate)

      if (tasksError) {
        logErrorUtil(new Error(`Failed to create tasks: ${tasksError.message}`), 'TASK_CREATION', {
          batchId,
          tasksError
        })
        return NextResponse.json({ error: 'Failed to create tasks for stage' }, { status: 500 })
      }
    }

    // Log workflow execution for analytics
    const { error: workflowLogError } = await supabase
      .from('workflow_execution_log')
      .insert([{
        workflow_template_id: batch.workflow_template_id,
        batch_id: batchId,
        stage: finalTargetStage,
        action: 'stage_transition',
        action_details: {
          from_stage: currentStage,
          to_stage: targetStage,
          final_stage: finalTargetStage,
          transition_type: transition_type || 'manual'
        },
        executed_by_id: worker.id,
        execution_type: 'manual'
      }])

    if (workflowLogError) {
      logErrorUtil(new Error(`Failed to log workflow execution: ${workflowLogError.message}`), 'WORKFLOW_LOG', {
        batchId,
        workflowLogError
      })
    }

    // Log successful business operation
    BusinessLogger.logBatchTransition(batchId, currentStage || 'unknown', finalTargetStage || 'pending', worker.id)

    const response = NextResponse.json({ 
      success: true, 
      batchId,
      previousStage: currentStage,
      newStage: finalTargetStage,
      requestedStage: targetStage
    })

    ApiLogger.logResponse(logContext, response, worker.id, {
      batchId,
      stageTransition: `${currentStage} -> ${finalTargetStage} (requested: ${targetStage})`
    })

    return response

  } catch (error) {
    logErrorUtil(error as Error, 'BATCH_TRANSITION', {
      batchId: 'unknown'
    })
    
    const response = NextResponse.json({ 
      error: 'Internal server error',
      requestId: logContext.requestId 
    }, { status: 500 })

    ApiLogger.logResponse(logContext, response)
    return response
  }
} 