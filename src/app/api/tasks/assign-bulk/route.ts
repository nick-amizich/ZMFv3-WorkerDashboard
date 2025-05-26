import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { ApiLogger } from '@/lib/api-logger'
import { logBusiness, logError } from '@/lib/logger'

const bulkAssignSchema = z.object({
  workerId: z.string().uuid().nullable(),
  filters: z.object({
    taskType: z.string().optional(),
    productName: z.string().optional(),
    woodType: z.string().optional(),
    material: z.string().optional(),
    taskIds: z.array(z.string().uuid()).optional() // For explicit task selection
  }),
  assignmentMode: z.enum(['all', 'selected']).default('all')
})

export async function POST(request: NextRequest) {
  const logContext = ApiLogger.logRequest(request)
  
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user) {
      const errorResponse = NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      ApiLogger.logResponse(logContext, errorResponse, 'Auth failed in bulk task assignment')
      return errorResponse
    }
    
    // Validate manager role
    const { data: manager } = await supabase
      .from('workers')
      .select('id, role, is_active, approval_status')
      .eq('auth_user_id', user.id)
      .single()
    
    if (!manager?.is_active || !['manager', 'supervisor'].includes(manager.role || '')) {
      logError(new Error('Unauthorized bulk task assignment attempt'), 'TASK_ASSIGNMENT', {
        userId: user.id,
        managerRole: manager?.role,
        isActive: manager?.is_active
      })
      const errorResponse = NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      ApiLogger.logResponse(logContext, errorResponse, 'Permission denied for bulk assignment')
      return errorResponse
    }
    
    // Validate request body
    const body = await request.json()
    const { workerId, filters, assignmentMode } = bulkAssignSchema.parse(body)
    
    let tasksQuery = supabase
      .from('work_tasks')
      .select(`
        id,
        task_type,
        status,
        order_item:order_items!inner(
          id,
          product_name,
          product_data
        )
      `)
      .eq('status', 'pending')
      .is('assigned_to_id', null)
    
    // Apply filters based on assignment mode
    if (assignmentMode === 'selected' && filters.taskIds?.length) {
      tasksQuery = tasksQuery.in('id', filters.taskIds)
    } else {
      // Apply filter criteria for 'all' mode
      if (filters.taskType) {
        tasksQuery = tasksQuery.eq('task_type', filters.taskType)
      }
      
      if (filters.productName) {
        tasksQuery = tasksQuery.ilike('order_item.product_name', `%${filters.productName}%`)
      }
    }
    
    const { data: tasks, error: queryError } = await tasksQuery
    
    if (queryError) {
      logError(queryError, 'DATABASE', { filters, assignmentMode })
      const errorResponse = NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 400 })
      ApiLogger.logResponse(logContext, errorResponse, 'Database query failed')
      return errorResponse
    }
    
    // Further filter by wood type or material if specified (requires JSON filtering)
    let filteredTasks = tasks || []
    if (filters.woodType || filters.material) {
      filteredTasks = filteredTasks.filter(task => {
        const orderItem = task.order_item as any
        const specs = orderItem?.product_data?.headphone_specs
        
        if (filters.woodType && specs?.wood_type !== filters.woodType) {
          return false
        }
        if (filters.material && specs?.material !== filters.material) {
          return false
        }
        return true
      })
    }
    
    if (filteredTasks.length === 0) {
      const response = NextResponse.json({ 
        message: 'No tasks found matching the specified criteria',
        tasksAssigned: 0 
      })
      ApiLogger.logResponse(logContext, response, 'No matching tasks found')
      return response
    }
    
    // Bulk update all matching tasks
    const taskIds = filteredTasks.map(task => task.id)
    const updateData: any = {
      assigned_by_id: manager.id,
      status: workerId ? 'assigned' : 'pending',
      updated_at: new Date().toISOString()
    }
    
    if (workerId) {
      updateData.assigned_to_id = workerId
    } else {
      updateData.assigned_to_id = null
    }
    
    const { data: updatedTasks, error: updateError } = await supabase
      .from('work_tasks')
      .update(updateData)
      .in('id', taskIds)
      .select()
    
    if (updateError) {
      logError(updateError, 'DATABASE', { taskIds: taskIds.length, workerId, filters })
      const errorResponse = NextResponse.json({ error: updateError.message }, { status: 400 })
      ApiLogger.logResponse(logContext, errorResponse, 'Bulk update failed')
      return errorResponse
    }
    
    // Log business event
    logBusiness(
      workerId ? `Bulk assigned ${taskIds.length} tasks` : `Bulk unassigned ${taskIds.length} tasks`,
      'TASK_ASSIGNMENT',
      {
        managerId: manager.id,
        workerId,
        taskCount: taskIds.length,
        filters,
        assignmentMode
      }
    )
    
    const response = NextResponse.json({ 
      tasksAssigned: taskIds.length,
      tasks: updatedTasks 
    })
    ApiLogger.logResponse(logContext, response, `Successfully assigned ${taskIds.length} tasks`)
    return response
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      logError(new Error('Invalid bulk assignment request'), 'API_ERROR', { validationErrors: error.errors })
      const errorResponse = NextResponse.json({ error: 'Invalid request data', details: error.errors }, { status: 400 })
      ApiLogger.logResponse(logContext, errorResponse, 'Validation failed')
      return errorResponse
    }
    
    logError(error as Error, 'API_ERROR', { context: 'bulk task assignment' })
    const errorResponse = NextResponse.json({ error: 'Server error' }, { status: 500 })
    ApiLogger.logResponse(logContext, errorResponse, 'Server error in bulk assignment')
    return errorResponse
  }
} 