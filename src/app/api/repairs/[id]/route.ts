import { createClient } from '@/lib/supabase/server'
import { ApiLogger } from '@/lib/api-logger'
import { logBusiness, logError } from '@/lib/logger'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// Schema for updating a repair
const UpdateRepairSchema = z.object({
  status: z.enum(['intake', 'diagnosed', 'approved', 'in_progress', 'testing', 'completed', 'shipped']).optional(),
  priority: z.enum(['standard', 'rush']).optional(),
  assigned_to: z.string().uuid().optional(),
  location: z.string().optional(),
  internal_notes: z.string().optional(),
  estimated_cost: z.number().optional(),
  customer_approved: z.boolean().optional()
})

// GET /api/repairs/[id] - Get repair details
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const logContext = ApiLogger.logRequest(request)
  
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      const response = NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      ApiLogger.logResponse(logContext, response, 'Unauthorized attempt')
      return response
    }
    
    const { data: worker } = await supabase
      .from('workers')
      .select('id, role, is_active, approval_status')
      .eq('auth_user_id', user.id)
      .single()
    
    if (!worker?.is_active || worker.approval_status !== 'approved') {
      const response = NextResponse.json({ error: 'Worker not active' }, { status: 403 })
      ApiLogger.logResponse(logContext, response, 'Inactive worker')
      return response
    }
    
    // Get repair with all related data
    const { data: repair, error } = await supabase
      .from('repair_orders')
      .select(`
        *,
        assigned_to:workers!repair_orders_assigned_to_fkey(id, name),
        created_by:workers!repair_orders_created_by_fkey(id, name),
        issues:repair_issues(
          id,
          category,
          specific_issue,
          severity,
          discovered_by,
          discovered_at
        ),
        actions:repair_actions(
          id,
          action_type,
          action_description,
          performed_by:workers!repair_actions_performed_by_fkey(id, name),
          time_spent_minutes,
          completed_at,
          parts_used:repair_parts_used(
            id,
            part_name,
            part_number,
            quantity,
            unit_cost
          )
        ),
        time_logs:repair_time_logs(
          id,
          worker_id,
          worker:workers!repair_time_logs_worker_id_fkey(id, name),
          start_time,
          end_time,
          duration_minutes,
          work_description
        ),
        photos:repair_photos(
          id,
          photo_type,
          storage_path,
          caption,
          uploaded_by,
          uploaded_at
        )
      `)
      .eq('id', params.id)
      .single()
    
    if (error) {
      if (error.code === 'PGRST116') {
        const response = NextResponse.json({ error: 'Repair not found' }, { status: 404 })
        ApiLogger.logResponse(logContext, response, 'Repair not found')
        return response
      }
      throw error
    }
    
    // Calculate total time spent
    const totalTimeSpent = repair.time_logs?.reduce((sum: number, log: any) => 
      sum + (log.duration_minutes || 0), 0) || 0
    
    const response = NextResponse.json({ 
      repair: {
        ...repair,
        totalTimeSpent
      }
    })
    ApiLogger.logResponse(logContext, response, `Retrieved repair ${repair.repair_number}`)
    return response
    
  } catch (error) {
    logError(error as Error, 'REPAIR_SYSTEM', { action: 'get_repair', repairId: params.id })
    const response = NextResponse.json(
      { error: 'Failed to retrieve repair' },
      { status: 500 }
    )
    ApiLogger.logResponse(logContext, response, 'Failed to retrieve repair')
    return response
  }
}

// PATCH /api/repairs/[id] - Update repair
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const logContext = ApiLogger.logRequest(request)
  
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      const response = NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      ApiLogger.logResponse(logContext, response, 'Unauthorized attempt')
      return response
    }
    
    const { data: worker } = await supabase
      .from('workers')
      .select('id, role, is_active, approval_status')
      .eq('auth_user_id', user.id)
      .single()
    
    if (!worker?.is_active || worker.approval_status !== 'approved') {
      const response = NextResponse.json({ error: 'Worker not active' }, { status: 403 })
      ApiLogger.logResponse(logContext, response, 'Inactive worker')
      return response
    }
    
    const body = await request.json()
    const validatedData = UpdateRepairSchema.parse(body)
    
    // Build update object
    const updateData: any = { ...validatedData }
    
    // Set date fields based on status changes
    if (validatedData.status) {
      switch (validatedData.status) {
        case 'diagnosed':
          updateData.diagnosed_date = new Date().toISOString()
          break
        case 'approved':
          updateData.approved_date = new Date().toISOString()
          break
        case 'in_progress':
          updateData.started_date = new Date().toISOString()
          break
        case 'completed':
          updateData.completed_date = new Date().toISOString()
          break
        case 'shipped':
          updateData.shipped_date = new Date().toISOString()
          break
      }
    }
    
    // Update repair
    const { data: repair, error } = await supabase
      .from('repair_orders')
      .update(updateData)
      .eq('id', params.id)
      .select()
      .single()
    
    if (error) throw error
    
    // Log business event
    logBusiness('Repair order updated', 'REPAIR_SYSTEM', {
      repairId: params.id,
      repairNumber: repair.repair_number,
      updatedBy: worker.id,
      updates: validatedData
    })
    
    const response = NextResponse.json({ success: true, repair })
    ApiLogger.logResponse(logContext, response, `Updated repair ${repair.repair_number}`)
    return response
    
  } catch (error) {
    logError(error as Error, 'REPAIR_SYSTEM', { action: 'update_repair', repairId: params.id })
    
    if (error instanceof z.ZodError) {
      const response = NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      )
      ApiLogger.logResponse(logContext, response, 'Invalid update data')
      return response
    }
    
    const response = NextResponse.json(
      { error: 'Failed to update repair' },
      { status: 500 }
    )
    ApiLogger.logResponse(logContext, response, 'Failed to update repair')
    return response
  }
}

// DELETE /api/repairs/[id] - Delete repair (soft delete by setting status)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const logContext = ApiLogger.logRequest(request)
  
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      const response = NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      ApiLogger.logResponse(logContext, response, 'Unauthorized attempt')
      return response
    }
    
    const { data: worker } = await supabase
      .from('workers')
      .select('id, role, is_active, approval_status')
      .eq('auth_user_id', user.id)
      .single()
    
    if (!worker?.is_active || worker.approval_status !== 'approved' || worker.role !== 'manager') {
      const response = NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      ApiLogger.logResponse(logContext, response, 'Non-manager attempted delete')
      return response
    }
    
    // We don't actually delete repairs, just mark them as cancelled
    const { data: repair, error } = await supabase
      .from('repair_orders')
      .update({ 
        status: 'cancelled',
        internal_notes: 'Cancelled by manager'
      })
      .eq('id', params.id)
      .select()
      .single()
    
    if (error) throw error
    
    logBusiness('Repair order cancelled', 'REPAIR_SYSTEM', {
      repairId: params.id,
      repairNumber: repair.repair_number,
      cancelledBy: worker.id
    })
    
    const response = NextResponse.json({ success: true })
    ApiLogger.logResponse(logContext, response, `Cancelled repair ${repair.repair_number}`)
    return response
    
  } catch (error) {
    logError(error as Error, 'REPAIR_SYSTEM', { action: 'delete_repair', repairId: params.id })
    const response = NextResponse.json(
      { error: 'Failed to cancel repair' },
      { status: 500 }
    )
    ApiLogger.logResponse(logContext, response, 'Failed to cancel repair')
    return response
  }
}