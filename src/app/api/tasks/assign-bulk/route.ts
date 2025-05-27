import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { ApiLogger } from '@/lib/api-logger'
import { logBusiness, logError } from '@/lib/logger'

interface BulkTaskAssignment {
  order_item_id: string
  assigned_to_id: string
  task_type: string
  task_description?: string
  priority?: 'low' | 'normal' | 'high' | 'urgent'
  status?: 'pending' | 'assigned' | 'in_progress' | 'completed' | 'blocked'
  estimated_hours?: number
}

export async function POST(request: NextRequest) {
  const logContext = ApiLogger.logRequest(request)
  
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
    
    // Only managers can assign tasks in bulk
    if (!['manager', 'supervisor'].includes(worker.role || '')) {
      return NextResponse.json({ error: 'Forbidden: Only managers can assign tasks in bulk' }, { status: 403 })
    }
    
    const body = await request.json()
    const { tasks } = body as { tasks: BulkTaskAssignment[] }
    
    // Validate required fields
    if (!tasks || !Array.isArray(tasks) || tasks.length === 0) {
      return NextResponse.json({ 
        error: 'Missing required field: tasks array is required' 
      }, { status: 400 })
    }
    
    // Validate each task
    for (const task of tasks) {
      if (!task.order_item_id || !task.assigned_to_id || !task.task_type) {
        return NextResponse.json({ 
          error: 'Each task must have order_item_id, assigned_to_id, and task_type' 
        }, { status: 400 })
      }
    }
    
    logBusiness('Bulk task assignment initiated', 'TASK_ASSIGNMENT', {
      taskCount: tasks.length,
      assignedBy: worker.id,
      taskTypes: [...new Set(tasks.map(t => t.task_type))]
    })
    
    // Verify all order items exist
    const orderItemIds = tasks.map(task => task.order_item_id)
    const { data: orderItems, error: orderItemsError } = await supabase
      .from('order_items')
      .select('id, product_name')
      .in('id', orderItemIds)
    
    if (orderItemsError) {
      logError(new Error(`Error verifying order items: ${orderItemsError.message}`), 'TASK_ASSIGNMENT', {
        orderItemIds,
        error: orderItemsError
      })
      return NextResponse.json({ error: 'Failed to verify order items' }, { status: 500 })
    }
    
    if (!orderItems || orderItems.length !== orderItemIds.length) {
      return NextResponse.json({ 
        error: 'Some order items do not exist' 
      }, { status: 400 })
    }
    
    // Verify all workers exist and are active
    const workerIds = [...new Set(tasks.map(task => task.assigned_to_id))]
    const { data: workers, error: workersError } = await supabase
      .from('workers')
      .select('id, name, is_active')
      .in('id', workerIds)
    
    if (workersError) {
      logError(new Error(`Error verifying workers: ${workersError.message}`), 'TASK_ASSIGNMENT', {
        workerIds,
        error: workersError
      })
      return NextResponse.json({ error: 'Failed to verify workers' }, { status: 500 })
    }
    
    if (!workers || workers.length !== workerIds.length) {
      return NextResponse.json({ 
        error: 'Some workers do not exist' 
      }, { status: 400 })
    }
    
    const inactiveWorkers = workers.filter(w => !w.is_active)
    if (inactiveWorkers.length > 0) {
      return NextResponse.json({ 
        error: `Some workers are inactive: ${inactiveWorkers.map(w => w.name).join(', ')}` 
      }, { status: 400 })
    }
    
    // Create tasks in bulk
    const tasksToCreate = tasks.map(task => ({
      order_item_id: task.order_item_id,
      assigned_to_id: task.assigned_to_id,
      assigned_by_id: worker.id,
      task_type: task.task_type,
      task_description: task.task_description || `${task.task_type} task for order item`,
      priority: task.priority || 'normal',
      status: task.status || 'assigned',
      estimated_hours: task.estimated_hours || 2.0, // Default 2 hours for sanding
      manual_assignment: true, // Mark as manually assigned
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }))
    
    const { data: createdTasks, error: createError } = await supabase
      .from('work_tasks')
      .insert(tasksToCreate)
      .select(`
        *,
        assigned_to:workers!work_tasks_assigned_to_id_fkey(id, name),
        order_item:order_items(id, product_name, orders!inner(order_number, customer_name))
      `)
    
    if (createError) {
      logError(new Error(`Error creating tasks: ${createError.message}`), 'TASK_ASSIGNMENT', {
        taskCount: tasks.length,
        createError
      })
      return NextResponse.json({ error: 'Failed to create tasks' }, { status: 500 })
    }
    
    // Log individual task assignments for each worker
    const workerTaskCounts = workers.reduce((acc, worker) => {
      const workerTasks = tasks.filter(task => task.assigned_to_id === worker.id)
      if (workerTasks.length > 0) {
        acc[worker.id] = {
          name: worker.name,
          count: workerTasks.length
        }
        
        logBusiness(`Tasks assigned to ${worker.name}`, 'TASK_ASSIGNMENT', {
          workerId: worker.id,
          workerName: worker.name,
          taskCount: workerTasks.length,
          taskType: workerTasks[0]?.task_type,
          assignedBy: worker.id
        })
      }
      return acc
    }, {} as Record<string, { name: string; count: number }>)
    
    logBusiness('Bulk task assignment completed', 'TASK_ASSIGNMENT', {
      totalTasks: createdTasks?.length || 0,
      workerCount: Object.keys(workerTaskCounts).length,
      assignedBy: worker.id
    })
    
    const response = NextResponse.json({
      success: true,
      tasks_created: createdTasks?.length || 0,
      tasks: createdTasks,
      assignments: workerTaskCounts
    })
    
    ApiLogger.logResponse(logContext, response, worker.id, {
      tasksCreated: createdTasks?.length || 0,
      workerCount: Object.keys(workerTaskCounts).length
    })
    
    return response
  } catch (error) {
    logError(error as Error, 'TASK_ASSIGNMENT', {
      requestId: logContext.requestId
    })
    
    const response = NextResponse.json({ 
      error: 'Internal server error',
      requestId: logContext.requestId 
    }, { status: 500 })
    
    ApiLogger.logResponse(logContext, response)
    return response
  }
} 