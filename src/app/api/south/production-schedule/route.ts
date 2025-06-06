import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logError, logBusiness } from '@/lib/logger'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')
    const machineId = searchParams.get('machine_id')
    const status = searchParams.get('status')

    // Build query
    let query = supabase
      .from('production_schedule')
      .select(`
        *,
        production_requests!inner (
          id,
          request_number,
          customer_name,
          quantity_ordered,
          quantity_completed,
          due_date,
          priority,
          status,
          parts_catalog!inner (
            part_name,
            part_type,
            species
          )
        ),
        machines!inner (
          machine_name,
          machine_type,
          status
        ),
        workers (
          name,
          email
        )
      `)
      .order('scheduled_start', { ascending: true })

    // Apply filters
    if (startDate) {
      query = query.gte('scheduled_start', startDate)
    }
    if (endDate) {
      query = query.lte('scheduled_end', endDate)
    }
    if (machineId) {
      query = query.eq('machine_id', machineId)
    }
    if (status) {
      query = query.eq('status', status)
    }

    const { data: schedules, error } = await query

    if (error) {
      logError(error, 'PRODUCTION_SCHEDULE_GET', { userId: user.id })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    logBusiness('Production schedule fetched', 'PRODUCTION_SCHEDULE', { 
      userId: user.id,
      count: schedules?.length || 0,
      filters: { startDate, endDate, machineId, status }
    })

    return NextResponse.json({ schedules })
  } catch (error) {
    logError(error as Error, 'PRODUCTION_SCHEDULE_GET')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get worker info
    const { data: worker } = await supabase
      .from('workers')
      .select('id, role')
      .eq('auth_user_id', user.id)
      .single()

    if (!worker) {
      return NextResponse.json({ error: 'Worker not found' }, { status: 404 })
    }

    // Get request body
    const body = await request.json()
    const { 
      production_request_id,
      machine_id,
      operator_id,
      scheduled_start,
      scheduled_end,
      priority,
      setup_time_minutes,
      run_time_minutes,
      notes
    } = body

    // Validate required fields
    if (!production_request_id || !machine_id || !scheduled_start || !scheduled_end) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Validate dates
    if (new Date(scheduled_start) >= new Date(scheduled_end)) {
      return NextResponse.json({ error: 'End time must be after start time' }, { status: 400 })
    }

    // Check for machine conflicts
    const { data: conflicts } = await supabase
      .from('production_schedule')
      .select('id')
      .eq('machine_id', machine_id)
      .neq('status', 'cancelled')
      .or(`and(scheduled_start.lte.${scheduled_end},scheduled_end.gte.${scheduled_start})`)

    if (conflicts && conflicts.length > 0) {
      return NextResponse.json({ error: 'Machine has conflicting schedule' }, { status: 409 })
    }

    // Create schedule entry
    const { data: schedule, error } = await supabase
      .from('production_schedule')
      .insert({
        production_request_id,
        machine_id,
        operator_id: operator_id || null,
        scheduled_start,
        scheduled_end,
        status: 'scheduled',
        priority: priority || 5,
        setup_time_minutes: setup_time_minutes || 0,
        run_time_minutes: run_time_minutes || 0,
        notes
      })
      .select()
      .single()

    if (error) {
      logError(error, 'PRODUCTION_SCHEDULE_CREATE', { userId: user.id })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    logBusiness('Production scheduled', 'PRODUCTION_SCHEDULE', { 
      userId: user.id,
      scheduleId: schedule.id,
      production_request_id,
      machine_id,
      scheduled_start,
      scheduled_end
    })

    return NextResponse.json({ schedule }, { status: 201 })
  } catch (error) {
    logError(error as Error, 'PRODUCTION_SCHEDULE_CREATE')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get request body
    const body = await request.json()
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json({ error: 'Schedule ID required' }, { status: 400 })
    }

    // Validate dates if provided
    if (updates.scheduled_start && updates.scheduled_end) {
      if (new Date(updates.scheduled_start) >= new Date(updates.scheduled_end)) {
        return NextResponse.json({ error: 'End time must be after start time' }, { status: 400 })
      }
    }

    // Update schedule
    const { data: schedule, error } = await supabase
      .from('production_schedule')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      logError(error, 'PRODUCTION_SCHEDULE_UPDATE', { userId: user.id, scheduleId: id })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    logBusiness('Production schedule updated', 'PRODUCTION_SCHEDULE', { 
      userId: user.id,
      scheduleId: id,
      updates
    })

    return NextResponse.json({ schedule })
  } catch (error) {
    logError(error as Error, 'PRODUCTION_SCHEDULE_UPDATE')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Start production (update status and set actual start time)
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get worker info
    const { data: worker } = await supabase
      .from('workers')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    if (!worker) {
      return NextResponse.json({ error: 'Worker not found' }, { status: 404 })
    }

    // Get request body
    const body = await request.json()
    const { schedule_id, action } = body

    if (!schedule_id || !action) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    let updates: any = {}

    switch (action) {
      case 'start':
        updates = {
          status: 'in_progress',
          actual_start: new Date().toISOString(),
          operator_id: worker.id
        }
        break
      case 'complete':
        updates = {
          status: 'completed',
          actual_end: new Date().toISOString()
        }
        break
      case 'delay':
        updates = {
          status: 'delayed'
        }
        break
      case 'cancel':
        updates = {
          status: 'cancelled'
        }
        break
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    // Update schedule
    const { data: schedule, error } = await supabase
      .from('production_schedule')
      .update(updates)
      .eq('id', schedule_id)
      .select()
      .single()

    if (error) {
      logError(error, 'PRODUCTION_SCHEDULE_ACTION', { userId: user.id, schedule_id, action })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    logBusiness(`Production ${action}`, 'PRODUCTION_SCHEDULE', { 
      userId: user.id,
      scheduleId: schedule_id,
      action,
      updates
    })

    return NextResponse.json({ schedule })
  } catch (error) {
    logError(error as Error, 'PRODUCTION_SCHEDULE_ACTION')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}