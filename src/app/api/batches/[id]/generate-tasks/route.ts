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
    
    // Validate employee status (only managers can generate tasks)
    const { data: worker } = await supabase
      .from('workers')
      .select('id, name, role, is_active')
      .eq('auth_user_id', user.id)
      .single()
    
    if (!worker?.is_active || !['manager', 'supervisor'].includes(worker.role || '')) {
      return NextResponse.json({ error: 'Forbidden: Only managers can generate tasks' }, { status: 403 })
    }
    
    const { id: batchId } = await params
    const body = await request.json()
    const { 
      auto_assign = false,
      assignment_rule = 'least_busy',
      specific_worker_id,
      override_existing = false,
      stage_override,
      priority = 'normal'
    } = body
    
    // Get the batch with its workflow
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
    
    if (!batch.workflow_template) {
      return NextResponse.json({ 
        error: 'Batch has no workflow assigned. Please assign a workflow first.' 
      }, { status: 400 })
    }
    
    // Determine the target stage
    const targetStage = stage_override || batch.current_stage
    if (!targetStage) {
      return NextResponse.json({ 
        error: 'No current stage found. Please transition the batch to a stage first.' 
      }, { status: 400 })
    }
    
    // Get stage definition from workflow
    const stages = batch.workflow_template.stages as any[]
    const stageData = stages.find(s => s.stage === targetStage)
    
    if (!stageData) {
      return NextResponse.json({ 
        error: `Stage '${targetStage}' not found in workflow` 
      }, { status: 400 })
    }
    
    // Check if tasks already exist for this stage and batch
    const { data: existingTasks } = await supabase
      .from('work_tasks')
      .select('id, status')
      .eq('batch_id', batchId)
      .eq('stage', targetStage)
    
    if (existingTasks && existingTasks.length > 0 && !override_existing) {
      return NextResponse.json({ 
        error: `Tasks already exist for stage '${targetStage}'. Use override_existing=true to replace them.`,
        existing_tasks: existingTasks.length
      }, { status: 409 })
    }
    
    // If overriding, delete existing tasks
    if (override_existing && existingTasks && existingTasks.length > 0) {
      const { error: deleteError } = await supabase
        .from('work_tasks')
        .delete()
        .eq('batch_id', batchId)
        .eq('stage', targetStage)
      
      if (deleteError) {
        console.error('Error deleting existing tasks:', deleteError)
        return NextResponse.json({ error: 'Failed to delete existing tasks' }, { status: 500 })
      }
    }
    
    // Get workers for assignment if auto_assign is true
    let assignedWorker = null
    if (auto_assign) {
      if (specific_worker_id) {
        // Verify the specific worker exists and is active
        const { data: specificWorker } = await supabase
          .from('workers')
          .select('id, name, is_active, skills')
          .eq('id', specific_worker_id)
          .eq('is_active', true)
          .single()
        
        if (!specificWorker) {
          return NextResponse.json({ 
            error: 'Specified worker not found or inactive' 
          }, { status: 400 })
        }
        
        assignedWorker = specificWorker
      } else {
        // Find workers based on assignment rule
        assignedWorker = await findWorkerByRule(supabase, assignment_rule, targetStage, stageData.required_skills)
      }
    }
    
    // Create tasks for each order item in the batch
    const taskInserts = batch.order_item_ids.map(orderItemId => ({
      order_item_id: orderItemId,
      batch_id: batchId,
      task_type: targetStage,
      stage: targetStage,
      task_description: `${stageData.name || targetStage}: ${stageData.description || 'Complete this stage'}`,
      workflow_template_id: batch.workflow_template_id,
      assigned_to_id: assignedWorker?.id || null,
      assigned_by_id: auto_assign && assignedWorker ? worker.id : null,
      auto_generated: true,
      manual_assignment: !auto_assign,
      estimated_hours: stageData.estimated_hours || null,
      status: auto_assign && assignedWorker ? 'assigned' : 'pending',
      priority,
      notes: `Generated for ${batch.name} - ${stageData.name || targetStage}`
    }))
    
    const { data: createdTasks, error: tasksError } = await supabase
      .from('work_tasks')
      .insert(taskInserts)
      .select(`
        *,
        order_item:order_items(
          id,
          product_name,
          order:orders(order_number, customer_name)
        ),
        assigned_to:workers(
          id,
          name
        )
      `)
    
    if (tasksError) {
      console.error('Error creating tasks:', tasksError)
      return NextResponse.json({ error: 'Failed to create tasks' }, { status: 500 })
    }
    
    // Log the task generation
    const { error: logError } = await supabase
      .from('workflow_execution_log')
      .insert({
        workflow_template_id: batch.workflow_template_id,
        batch_id: batchId,
        stage: targetStage,
        action: 'tasks_generated',
        action_details: {
          tasks_created: createdTasks?.length || 0,
          auto_assign,
          assignment_rule,
          assigned_worker_id: assignedWorker?.id,
          override_existing,
          stage_override
        },
        executed_by_id: worker.id,
        execution_type: 'manual'
      })
    
    if (logError) {
      console.error('Error logging task generation:', logError)
      // Don't fail the whole operation, just log it
    }
    
    const response = {
      batch_id: batchId,
      stage: targetStage,
      tasks_created: createdTasks?.length || 0,
      tasks: createdTasks || [],
      assignment_info: auto_assign ? {
        auto_assigned: true,
        assignment_rule,
        assigned_worker: assignedWorker ? {
          id: assignedWorker.id,
          name: assignedWorker.name
        } : null
      } : {
        auto_assigned: false,
        manual_assignment_required: true
      },
      generated_at: new Date().toISOString(),
      generated_by: {
        id: worker.id,
        name: worker.name || 'Manager'
      }
    }
    
    return NextResponse.json(response)
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function findWorkerByRule(supabase: any, rule: string, stage: string, requiredSkills: string[] = []) {
  try {
    // Get workers who can work on this stage
    let query = supabase
      .from('workers')
      .select('id, name, skills')
      .eq('is_active', true)
    
    // Filter by skills if specified
    if (requiredSkills.length > 0) {
      // In a real implementation, you'd want to check if worker skills overlap with required skills
      // For now, we'll get all active workers and filter in JavaScript
    }
    
    const { data: workers } = await query.limit(20)
    
    if (!workers || workers.length === 0) {
      return null
    }
    
    // Filter workers by required skills
    const skilledWorkers = workers.filter((w: any) => {
      if (!requiredSkills.length) return true
      if (!w.skills) return false
      return requiredSkills.some((skill: string) => w.skills.includes(skill) || w.skills.includes('all_stages'))
    })
    
    const availableWorkers = skilledWorkers.length > 0 ? skilledWorkers : workers
    
    switch (rule) {
      case 'round_robin':
        // Simple round robin - could be enhanced with persistent state
        return availableWorkers[Math.floor(Math.random() * availableWorkers.length)]
      
      case 'least_busy':
        // Get worker with fewest active tasks
        const { data: taskCounts } = await supabase
          .from('work_tasks')
          .select('assigned_to_id, count')
          .in('assigned_to_id', availableWorkers.map((w: any) => w.id))
          .in('status', ['assigned', 'in_progress'])
        
        const workerTaskCounts = availableWorkers.map((worker: any) => ({
          ...worker,
          taskCount: taskCounts?.find((tc: any) => tc.assigned_to_id === worker.id)?.count || 0
        }))
        
        return workerTaskCounts.sort((a: any, b: any) => a.taskCount - b.taskCount)[0]
      
      case 'specific_worker':
        // This case is handled in the main function
        return availableWorkers[0]
      
      default:
        return availableWorkers[0]
    }
  } catch (error) {
    console.error('Error finding worker:', error)
    return null
  }
} 