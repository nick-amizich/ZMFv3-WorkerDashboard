import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ batchId: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Get worker details
    const { data: worker } = await supabase
      .from('workers')
      .select('id, role, is_active')
      .eq('auth_user_id', user.id)
      .single()
    
    if (!worker?.is_active) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    const { batchId } = await params
    
    // Verify the batch exists
    const { data: batch } = await supabase
      .from('work_batches')
      .select('id, name')
      .eq('id', batchId)
      .single()
    
    if (!batch) {
      return NextResponse.json({ 
        error: 'Batch not found' 
      }, { status: 404 })
    }
    
    // Get URL parameters
    const url = new URL(request.url)
    const workerId = url.searchParams.get('worker_id')
    const stage = url.searchParams.get('stage')
    const includeActive = url.searchParams.get('include_active') === 'true'
    
    // Build query
    let query = supabase
      .from('time_logs')
      .select(`
        *,
        worker:workers(
          id,
          name
        ),
        task:work_tasks(
          id,
          task_description,
          order_item:order_items(
            product_name,
            order:orders(order_number, customer_name)
          )
        )
      `)
      .eq('batch_id', batchId)
      .order('start_time', { ascending: false })
    
    // Apply filters
    if (workerId) {
      query = query.eq('worker_id', workerId)
    }
    
    if (stage) {
      query = query.eq('stage', stage)
    }
    
    if (!includeActive) {
      query = query.not('end_time', 'is', null)
    }
    
    // Workers can only see their own time logs unless they're managers
    if (worker.role === 'worker') {
      query = query.eq('worker_id', worker.id)
    }
    
    const { data: timeLogs, error: timeLogsError } = await query
    
    if (timeLogsError) {
      console.error('Error fetching batch time logs:', timeLogsError)
      return NextResponse.json({ error: 'Failed to fetch time logs' }, { status: 500 })
    }
    
    // Calculate summary statistics
    const completedLogs = timeLogs?.filter(log => log.end_time) || []
    const totalMinutes = completedLogs.reduce((sum, log) => sum + (log.duration_minutes || 0), 0)
    const activeLogs = timeLogs?.filter(log => !log.end_time) || []
    
    const summary = {
      total_logs: timeLogs?.length || 0,
      completed_logs: completedLogs.length,
      active_logs: activeLogs.length,
      total_minutes: totalMinutes,
      total_hours: Math.round((totalMinutes / 60) * 100) / 100,
      average_minutes_per_log: completedLogs.length > 0 ? Math.round((totalMinutes / completedLogs.length) * 100) / 100 : 0
    }
    
    return NextResponse.json({
      batch: {
        id: batch.id,
        name: batch.name
      },
      time_logs: timeLogs || [],
      summary
    })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 