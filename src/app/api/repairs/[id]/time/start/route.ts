import { createClient } from '@/lib/supabase/server'
import { ApiLogger } from '@/lib/api-logger'
import { logBusiness, logError } from '@/lib/logger'
import { NextRequest, NextResponse } from 'next/server'

// POST /api/repairs/[id]/time/start - Start timer
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
    
    // Check if repair exists and get current status
    const { data: repair, error: repairError } = await supabase
      .from('repair_orders')
      .select('repair_number, status')
      .eq('id', params.id)
      .single()
    
    if (repairError || !repair) {
      const response = NextResponse.json({ error: 'Repair not found' }, { status: 404 })
      ApiLogger.logResponse(logContext, response, 'Repair not found')
      return response
    }
    
    // Check if there's already an active timer for this repair and worker
    const { data: activeTimer } = await supabase
      .from('repair_time_logs')
      .select('id')
      .eq('repair_order_id', params.id)
      .eq('worker_id', worker.id)
      .is('end_time', null)
      .single()
    
    if (activeTimer) {
      const response = NextResponse.json({ error: 'Timer already running' }, { status: 400 })
      ApiLogger.logResponse(logContext, response, 'Timer already active')
      return response
    }
    
    // Create new time log entry
    const { data: timeLog, error: timeLogError } = await supabase
      .from('repair_time_logs')
      .insert({
        repair_order_id: params.id,
        worker_id: worker.id,
        start_time: new Date().toISOString()
      })
      .select()
      .single()
    
    if (timeLogError) throw timeLogError
    
    // Update repair status to in_progress if it's not already
    if (repair.status === 'intake' || repair.status === 'diagnosed' || repair.status === 'approved') {
      await supabase
        .from('repair_orders')
        .update({ 
          status: 'in_progress',
          started_date: new Date().toISOString(),
          assigned_to: worker.id
        })
        .eq('id', params.id)
    }
    
    // Also create a general time log entry for compatibility with existing system
    await supabase
      .from('time_logs')
      .insert({
        worker_id: worker.id,
        start_time: new Date().toISOString(),
        activity_type: 'repair',
        activity_details: `Working on repair ${repair.repair_number}`
      })
    
    logBusiness('Repair timer started', 'REPAIR_SYSTEM', {
      repairId: params.id,
      repairNumber: repair.repair_number,
      workerId: worker.id,
      workerName: worker.name
    })
    
    const response = NextResponse.json({ 
      success: true, 
      timeLog,
      message: `Timer started for repair ${repair.repair_number}`
    })
    ApiLogger.logResponse(logContext, response, `Started timer for repair ${repair.repair_number}`)
    return response
    
  } catch (error) {
    logError(error as Error, 'REPAIR_SYSTEM', { action: 'start_timer', repairId: params.id })
    const response = NextResponse.json(
      { error: 'Failed to start timer' },
      { status: 500 }
    )
    ApiLogger.logResponse(logContext, response, 'Failed to start timer')
    return response
  }
}