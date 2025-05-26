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
      .select('id, role, is_active, approval_status')
      .eq('auth_user_id', user.id)
      .single()
    
    if (!worker?.is_active || worker?.approval_status !== 'approved') {
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
    
    // Get tasks for this batch
    const { data: tasks } = await supabase
      .from('work_tasks')
      .select('id')
      .eq('batch_id', batchId)
    
    const taskIds = tasks?.map(t => t.id) || []
    
    if (taskIds.length === 0) {
      return NextResponse.json({
        batch: {
          id: batch.id,
          name: batch.name
        },
        time_logs: [],
        summary: {
          total_logs: 0,
          completed_logs: 0,
          active_logs: 0,
          total_minutes: 0,
          total_hours: 0,
          average_minutes_per_log: 0
        }
      })
    }
    
    // Get URL parameters
    const url = new URL(request.url)
    const workerId = url.searchParams.get('worker_id')
    const includeActive = url.searchParams.get('include_active') === 'true'
    
    // Build query for time logs related to batch tasks
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
          notes,
          order_item:order_items(
            product_name,
            order:orders(order_number, customer_name)
          )
        )
      `)
      .in('task_id', taskIds)
      .order('start_time', { ascending: false })
    
    // Apply filters
    if (workerId) {
      query = query.eq('worker_id', workerId)
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
    const completedLogs = timeLogs?.filter((log: any) => log.end_time) || []
    const totalMinutes = completedLogs.reduce((sum: number, log: any) => {
      if (log.start_time && log.end_time) {
        const start = new Date(log.start_time)
        const end = new Date(log.end_time)
        const minutes = (end.getTime() - start.getTime()) / (1000 * 60)
        return sum + minutes
      }
      return sum
    }, 0)
    const activeLogs = timeLogs?.filter((log: any) => !log.end_time) || []
    
    const summary = {
      total_logs: timeLogs?.length || 0,
      completed_logs: completedLogs.length,
      active_logs: activeLogs.length,
      total_minutes: Math.round(totalMinutes * 100) / 100,
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