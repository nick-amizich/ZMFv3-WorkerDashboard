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
    const { 
      auto_assign = false, 
      assignment_rule = 'least_busy',
      specific_worker_id,
      stage,
      priority = 'normal'
    } = body
    
    // Get batch with workflow info
    const { data: batch, error: batchError } = await supabase
      .from('work_batches')
      .select(`
        *,
        workflow_template:workflow_templates(id, name, stages)
      `)
      .eq('id', id)
      .single()
    
    if (batchError || !batch) {
      return NextResponse.json({ error: 'Batch not found' }, { status: 404 })
    }
    
    if (!batch.workflow_template) {
      return NextResponse.json({ 
        error: 'Batch does not have a workflow assigned' 
      }, { status: 400 })
    }
    
    // Determine which stage to generate tasks for
    const targetStage = stage || batch.current_stage
    if (!targetStage) {
      return NextResponse.json({ 
        error: 'No stage specified and batch has no current stage' 
      }, { status: 400 })
    }
    
    // Get stage definition from workflow
    const stages = (batch.workflow_template.stages as any[]) || []
    const stageDefinition = stages.find(s => s.stage === targetStage)
    
    if (!stageDefinition) {
      return NextResponse.json({ 
        error: `Stage '${targetStage}' not found in workflow` 
      }, { status: 400 })
    }
    
    // Get worker for assignment if specified
    let assignedWorkerId = null
    if (auto_assign) {
      if (specific_worker_id) {
        assignedWorkerId = specific_worker_id
      } else {
        // Apply assignment rule logic
        const { data: availableWorkers, error: workersError } = await supabase
          .from('worker_stage_assignments')
          .select(`
            worker_id,
            worker:workers(id, name, is_active)
          `)
          .eq('stage', targetStage)
          .eq('is_active', true)
        
        if (workersError) {
          console.error('Error fetching available workers:', workersError)
        } else if (availableWorkers && availableWorkers.length > 0) {
          // Simple assignment logic - use first available worker
          // In a real implementation, this would implement proper load balancing
          assignedWorkerId = availableWorkers[0].worker_id
        }
      }
    }
    
    // Create tasks for each order item in the batch
    const taskInserts = batch.order_item_ids.map((orderItemId: string) => ({
      order_item_id: orderItemId,
      batch_id: id,
      task_type: targetStage,
      stage: targetStage,
      task_description: `${stageDefinition.name}: ${stageDefinition.description || ''}`,
      workflow_template_id: batch.workflow_template_id,
      auto_generated: true,
      manual_assignment: !stageDefinition.is_automated,
      estimated_hours: stageDefinition.estimated_hours || null,
      assigned_to_id: assignedWorkerId,
      assigned_by_id: assignedWorkerId ? worker.id : null,
      status: 'pending',
      priority: priority
    }))
    
    // Insert tasks
    const { data: createdTasks, error: tasksError } = await supabase
      .from('work_tasks')
      .insert(taskInserts)
      .select(`
        *,
        order_item:order_items(product_name),
        assigned_to:workers(id, name)
      `)
    
    if (tasksError) {
      console.error('Error creating tasks:', tasksError)
      return NextResponse.json({ error: 'Failed to create tasks' }, { status: 500 })
    }
    
    // Log the task generation
    const { error: logError } = await (supabase as any)
      .from('workflow_execution_log')
      .insert({
        workflow_template_id: batch.workflow_template_id,
        batch_id: id,
        stage: targetStage,
        action: 'tasks_generated',
        action_details: {
          tasks_count: taskInserts.length,
          auto_assign,
          assignment_rule,
          assigned_worker_id: assignedWorkerId
        },
        executed_by_id: worker.id,
        execution_type: 'manual'
      })
    
    if (logError) {
      console.error('Error logging task generation:', logError)
      // Don't fail the operation for logging errors
    }
    
    return NextResponse.json({
      message: `Successfully generated ${createdTasks?.length || 0} tasks for stage '${targetStage}'`,
      tasks: createdTasks || [],
      stage: targetStage,
      batch_id: id,
      assignment_info: {
        auto_assigned: auto_assign && !!assignedWorkerId,
        assignment_rule: auto_assign ? assignment_rule : null,
        assigned_worker_id: assignedWorkerId
      }
    })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 