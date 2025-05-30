import { createClient } from '@/lib/supabase/server'
import { ApiLogger } from '@/lib/api-logger'
import { logBusiness, logError } from '@/lib/logger'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// Schema for creating a repair
const CreateRepairSchema = z.object({
  orderNumber: z.string().optional(),
  customerName: z.string(),
  customerEmail: z.string().email(),
  customerPhone: z.string().optional(),
  model: z.string(),
  serialNumber: z.string().optional(),
  woodType: z.string().optional(),
  repairType: z.enum(['production', 'finishing', 'sonic']),
  priority: z.enum(['standard', 'rush']).default('standard'),
  repairSource: z.enum(['customer', 'internal']),
  orderType: z.enum(['customer_return', 'warranty', 'internal_qc']),
  customerNote: z.string().optional(),
  location: z.string().optional(),
  issues: z.array(z.object({
    category: z.string(),
    specificIssue: z.string(),
    severity: z.enum(['cosmetic', 'functional', 'critical'])
  })).min(1)
})

// GET /api/repairs - List repairs with filters
export async function GET(request: NextRequest) {
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
    
    // Get query parameters
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const assignedToMe = searchParams.get('assignedToMe') === 'true'
    const repairType = searchParams.get('repairType')
    const priority = searchParams.get('priority')
    
    // Build query
    let query = supabase
      .from('repair_orders')
      .select(`
        *,
        assigned_to:workers!repair_orders_assigned_to_fkey(id, name),
        created_by:workers!repair_orders_created_by_fkey(id, name),
        issues:repair_issues(
          id,
          category,
          specific_issue,
          severity
        ),
        actions:repair_actions(
          id,
          action_type,
          action_description,
          time_spent_minutes,
          completed_at
        ),
        time_logs:repair_time_logs(
          id,
          duration_minutes
        )
      `)
      .order('created_at', { ascending: false })
    
    // Apply filters
    if (status) {
      query = query.eq('status', status)
    }
    
    if (assignedToMe) {
      query = query.eq('assigned_to', worker.id)
    }
    
    if (repairType) {
      query = query.eq('repair_type', repairType)
    }
    
    if (priority) {
      query = query.eq('priority', priority)
    }
    
    const { data: repairs, error } = await query
    
    if (error) throw error
    
    // Calculate total time spent for each repair
    const repairsWithTime = repairs?.map(repair => ({
      ...repair,
      totalTimeSpent: repair.time_logs?.reduce((sum: number, log: any) => 
        sum + (log.duration_minutes || 0), 0) || 0
    }))
    
    const response = NextResponse.json({ repairs: repairsWithTime || [] })
    ApiLogger.logResponse(logContext, response, `Retrieved ${repairs?.length || 0} repairs`)
    return response
    
  } catch (error) {
    logError(error as Error, 'REPAIR_SYSTEM', { action: 'list_repairs' })
    const response = NextResponse.json(
      { error: 'Failed to retrieve repairs' },
      { status: 500 }
    )
    ApiLogger.logResponse(logContext, response, 'Failed to retrieve repairs')
    return response
  }
}

// POST /api/repairs - Create new repair
export async function POST(request: NextRequest) {
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
    const validatedData = CreateRepairSchema.parse(body)
    
    // Generate repair number
    const { data: repairNumberResult, error: rpcError } = await supabase
      .rpc('generate_repair_number')
    
    if (rpcError) throw rpcError
    
    const repairNumber = repairNumberResult
    
    // Look up original order if provided
    let originalOrderId = null
    if (validatedData.orderNumber) {
      const { data: order } = await supabase
        .from('orders')
        .select('id')
        .eq('order_number', validatedData.orderNumber)
        .single()
      
      originalOrderId = order?.id
    }
    
    // Create repair order
    const { data: repair, error: repairError } = await supabase
      .from('repair_orders')
      .insert({
        repair_number: repairNumber,
        repair_source: validatedData.repairSource,
        order_type: validatedData.orderType,
        original_order_id: originalOrderId,
        original_order_number: validatedData.orderNumber,
        customer_name: validatedData.customerName,
        customer_email: validatedData.customerEmail,
        customer_phone: validatedData.customerPhone,
        model: validatedData.model,
        serial_number: validatedData.serialNumber,
        wood_type: validatedData.woodType,
        repair_type: validatedData.repairType,
        priority: validatedData.priority,
        customer_note: validatedData.customerNote,
        location: validatedData.location || 'Repair Wall',
        created_by: worker.id
      })
      .select()
      .single()
    
    if (repairError) throw repairError
    
    // Create issues
    if (validatedData.issues.length > 0) {
      const { error: issuesError } = await supabase
        .from('repair_issues')
        .insert(
          validatedData.issues.map(issue => ({
            repair_order_id: repair.id,
            category: issue.category,
            specific_issue: issue.specificIssue,
            severity: issue.severity,
            discovered_by: worker.id
          }))
        )
      
      if (issuesError) throw issuesError
    }
    
    // Log business event
    logBusiness('Repair order created', 'REPAIR_SYSTEM', {
      repairNumber,
      repairId: repair.id,
      createdBy: worker.id,
      customerEmail: validatedData.customerEmail,
      repairType: validatedData.repairType,
      priority: validatedData.priority
    })
    
    const response = NextResponse.json({ 
      success: true, 
      repair: {
        ...repair,
        issues: validatedData.issues
      }
    })
    ApiLogger.logResponse(logContext, response, `Created repair ${repairNumber}`)
    return response
    
  } catch (error) {
    logError(error as Error, 'REPAIR_SYSTEM', { action: 'create_repair' })
    
    if (error instanceof z.ZodError) {
      const response = NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      )
      ApiLogger.logResponse(logContext, response, 'Invalid repair data')
      return response
    }
    
    const response = NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create repair' },
      { status: 500 }
    )
    ApiLogger.logResponse(logContext, response, 'Failed to create repair')
    return response
  }
}