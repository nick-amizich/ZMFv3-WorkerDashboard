import { createClient } from '@/lib/supabase/server'
import { ApiLogger } from '@/lib/api-logger'
import { logBusiness, logError } from '@/lib/logger'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const CreateActionSchema = z.object({
  actionType: z.string(),
  actionDescription: z.string(),
  timeSpentMinutes: z.number().optional(),
  parts: z.array(z.object({
    partName: z.string(),
    partNumber: z.string().optional(),
    quantity: z.number().default(1),
    unitCost: z.number().optional()
  })).optional()
})

// GET /api/repairs/[id]/actions - List repair actions
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
    
    const { data: actions, error } = await supabase
      .from('repair_actions')
      .select(`
        *,
        performed_by:workers!repair_actions_performed_by_fkey(id, name),
        parts_used:repair_parts_used(*)
      `)
      .eq('repair_order_id', params.id)
      .order('completed_at', { ascending: false })
    
    if (error) throw error
    
    const response = NextResponse.json({ actions: actions || [] })
    ApiLogger.logResponse(logContext, response, `Retrieved ${actions?.length || 0} actions`)
    return response
    
  } catch (error) {
    logError(error as Error, 'REPAIR_SYSTEM', { action: 'list_actions', repairId: params.id })
    const response = NextResponse.json(
      { error: 'Failed to retrieve actions' },
      { status: 500 }
    )
    ApiLogger.logResponse(logContext, response, 'Failed to retrieve actions')
    return response
  }
}

// POST /api/repairs/[id]/actions - Add repair action
export async function POST(
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
      .select('id, name, is_active, approval_status')
      .eq('auth_user_id', user.id)
      .single()
    
    if (!worker?.is_active || worker.approval_status !== 'approved') {
      const response = NextResponse.json({ error: 'Worker not active' }, { status: 403 })
      ApiLogger.logResponse(logContext, response, 'Inactive worker')
      return response
    }
    
    const body = await request.json()
    const validatedData = CreateActionSchema.parse(body)
    
    // Check if repair exists
    const { data: repair, error: repairError } = await supabase
      .from('repair_orders')
      .select('repair_number')
      .eq('id', params.id)
      .single()
    
    if (repairError || !repair) {
      const response = NextResponse.json({ error: 'Repair not found' }, { status: 404 })
      ApiLogger.logResponse(logContext, response, 'Repair not found')
      return response
    }
    
    // Create action
    const { data: action, error: actionError } = await supabase
      .from('repair_actions')
      .insert({
        repair_order_id: params.id,
        action_type: validatedData.actionType,
        action_description: validatedData.actionDescription,
        performed_by: worker.id,
        time_spent_minutes: validatedData.timeSpentMinutes
      })
      .select()
      .single()
    
    if (actionError) throw actionError
    
    // Add parts used if provided
    if (validatedData.parts && validatedData.parts.length > 0) {
      const { error: partsError } = await supabase
        .from('repair_parts_used')
        .insert(
          validatedData.parts.map(part => ({
            repair_action_id: action.id,
            part_name: part.partName,
            part_number: part.partNumber,
            quantity: part.quantity,
            unit_cost: part.unitCost
          }))
        )
      
      if (partsError) throw partsError
    }
    
    // If this is a completion action, update repair status
    if (validatedData.actionType === 'completed' || validatedData.actionDescription.toLowerCase().includes('complet')) {
      await supabase
        .from('repair_orders')
        .update({ 
          status: 'testing',
          completed_date: new Date().toISOString()
        })
        .eq('id', params.id)
    }
    
    // Add to knowledge base if it's a solution
    if (validatedData.actionType === 'repair' || validatedData.actionType === 'fix') {
      const { data: repairDetails } = await supabase
        .from('repair_orders')
        .select(`
          model,
          issues:repair_issues(category, specific_issue)
        `)
        .eq('id', params.id)
        .single()
      
      if (repairDetails && repairDetails.issues.length > 0) {
        await supabase
          .from('repair_knowledge_base')
          .insert({
            repair_order_id: params.id,
            model: repairDetails.model,
            issue_category: repairDetails.issues[0].category,
            issue_description: repairDetails.issues[0].specific_issue,
            solution_description: validatedData.actionDescription,
            technician_id: worker.id,
            technician_name: worker.name,
            time_to_repair_minutes: validatedData.timeSpentMinutes,
            parts_used: validatedData.parts || []
          })
      }
    }
    
    logBusiness('Repair action added', 'REPAIR_SYSTEM', {
      repairId: params.id,
      repairNumber: repair.repair_number,
      actionType: validatedData.actionType,
      performedBy: worker.name,
      partsCount: validatedData.parts?.length || 0
    })
    
    const response = NextResponse.json({ 
      success: true, 
      action: {
        ...action,
        parts_used: validatedData.parts || []
      }
    })
    ApiLogger.logResponse(logContext, response, `Added action to repair ${repair.repair_number}`)
    return response
    
  } catch (error) {
    logError(error as Error, 'REPAIR_SYSTEM', { action: 'create_action', repairId: params.id })
    
    if (error instanceof z.ZodError) {
      const response = NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      )
      ApiLogger.logResponse(logContext, response, 'Invalid action data')
      return response
    }
    
    const response = NextResponse.json(
      { error: 'Failed to create action' },
      { status: 500 }
    )
    ApiLogger.logResponse(logContext, response, 'Failed to create action')
    return response
  }
}