import { createClient } from '@/lib/supabase/server'
import { ApiLogger } from '@/lib/api-logger'
import { logBusiness, logError } from '@/lib/logger'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const StopTimerSchema = z.object({
  workDescription: z.string().optional(),
  continueWorking: z.boolean().default(false),
  returnLocation: z.string().optional()
})

// POST /api/repairs/[id]/time/stop - Stop timer
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
    const { workDescription, continueWorking, returnLocation } = StopTimerSchema.parse(body)
    
    // Find active timer for this repair and worker
    const { data: activeTimer, error: timerError } = await supabase
      .from('repair_time_logs')
      .select('id, start_time')
      .eq('repair_order_id', params.id)
      .eq('worker_id', worker.id)
      .is('end_time', null)
      .single()
    
    if (timerError || !activeTimer) {
      const response = NextResponse.json({ error: 'No active timer found' }, { status: 404 })
      ApiLogger.logResponse(logContext, response, 'No active timer')
      return response
    }
    
    // Calculate duration
    const startTime = new Date(activeTimer.start_time)
    const endTime = new Date()
    const durationMinutes = Math.floor((endTime.getTime() - startTime.getTime()) / 1000 / 60)
    
    // Update time log with end time and duration
    const { error: updateError } = await supabase
      .from('repair_time_logs')
      .update({
        end_time: endTime.toISOString(),
        duration_minutes: durationMinutes,
        work_description: workDescription
      })
      .eq('id', activeTimer.id)
    
    if (updateError) throw updateError
    
    // Get repair details
    const { data: repair } = await supabase
      .from('repair_orders')
      .select('repair_number')
      .eq('id', params.id)
      .single()
    
    // Also stop the general time log
    const { data: generalTimeLogs } = await supabase
      .from('time_logs')
      .select('id')
      .eq('worker_id', worker.id)
      .is('end_time', null)
      .eq('activity_type', 'repair')
    
    if (generalTimeLogs && generalTimeLogs.length > 0) {
      await supabase
        .from('time_logs')
        .update({
          end_time: endTime.toISOString(),
          duration_minutes: durationMinutes
        })
        .eq('id', generalTimeLogs[0].id)
    }
    
    // Update repair location if returning to queue
    if (!continueWorking && returnLocation) {
      await supabase
        .from('repair_orders')
        .update({ location: returnLocation })
        .eq('id', params.id)
    }
    
    logBusiness('Repair timer stopped', 'REPAIR_SYSTEM', {
      repairId: params.id,
      repairNumber: repair?.repair_number,
      workerId: worker.id,
      workerName: worker.name,
      durationMinutes,
      continueWorking,
      returnLocation
    })
    
    const response = NextResponse.json({ 
      success: true,
      durationMinutes,
      message: `Timer stopped. Worked for ${durationMinutes} minutes.`
    })
    ApiLogger.logResponse(logContext, response, `Stopped timer for repair ${repair?.repair_number}`)
    return response
    
  } catch (error) {
    logError(error as Error, 'REPAIR_SYSTEM', { action: 'stop_timer', repairId: params.id })
    const response = NextResponse.json(
      { error: 'Failed to stop timer' },
      { status: 500 }
    )
    ApiLogger.logResponse(logContext, response, 'Failed to stop timer')
    return response
  }
}