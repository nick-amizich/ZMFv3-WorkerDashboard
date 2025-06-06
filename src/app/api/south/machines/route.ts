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
    const status = searchParams.get('status')
    const machineType = searchParams.get('machine_type')
    const includeDowntime = searchParams.get('include_downtime') === 'true'

    // Build query
    let query = supabase
      .from('machines')
      .select('*')
      .eq('location', 'south')
      .order('machine_name')

    // Apply filters
    if (status) {
      query = query.eq('status', status)
    }
    if (machineType) {
      query = query.eq('machine_type', machineType)
    }

    const { data: machines, error } = await query

    if (error) {
      logError(error, 'MACHINES_GET', { userId: user.id })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Optionally include downtime data
    let downtimeData = null
    if (includeDowntime && machines) {
      const machineIds = machines.map(m => m.id)
      const { data: downtime } = await supabase
        .from('machine_downtime_log')
        .select('*')
        .in('machine_id', machineIds)
        .order('start_time', { ascending: false })

      downtimeData = downtime
    }

    logBusiness('Machines fetched', 'MACHINES', { 
      userId: user.id,
      count: machines?.length || 0,
      filters: { status, machineType, includeDowntime }
    })

    return NextResponse.json({ 
      machines,
      downtime: downtimeData 
    })
  } catch (error) {
    logError(error as Error, 'MACHINES_GET')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication and manager role
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is a manager
    const { data: worker } = await supabase
      .from('workers')
      .select('role')
      .eq('auth_user_id', user.id)
      .single()

    if (!worker || worker.role !== 'manager') {
      return NextResponse.json({ error: 'Forbidden - Manager access required' }, { status: 403 })
    }

    // Get request body
    const body = await request.json()
    const { 
      machine_name, 
      machine_type, 
      manufacturer,
      model,
      serial_number,
      hourly_rate,
      notes 
    } = body

    // Validate required fields
    if (!machine_name || !machine_type) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Create machine
    const { data: machine, error } = await supabase
      .from('machines')
      .insert({
        machine_name,
        machine_type,
        manufacturer,
        model,
        serial_number,
        status: 'operational',
        location: 'south',
        hourly_rate,
        notes,
        is_active: true
      })
      .select()
      .single()

    if (error) {
      logError(error, 'MACHINES_CREATE', { userId: user.id, machine_name })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    logBusiness('Machine created', 'MACHINES', { 
      userId: user.id,
      machineId: machine.id,
      machine_name,
      machine_type
    })

    return NextResponse.json({ machine }, { status: 201 })
  } catch (error) {
    logError(error as Error, 'MACHINES_CREATE')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication and manager role
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is a manager
    const { data: worker } = await supabase
      .from('workers')
      .select('role')
      .eq('auth_user_id', user.id)
      .single()

    if (!worker || worker.role !== 'manager') {
      return NextResponse.json({ error: 'Forbidden - Manager access required' }, { status: 403 })
    }

    // Get request body
    const body = await request.json()
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json({ error: 'Machine ID required' }, { status: 400 })
    }

    // Update machine
    const { data: machine, error } = await supabase
      .from('machines')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      logError(error, 'MACHINES_UPDATE', { userId: user.id, machineId: id })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    logBusiness('Machine updated', 'MACHINES', { 
      userId: user.id,
      machineId: id,
      updates
    })

    return NextResponse.json({ machine })
  } catch (error) {
    logError(error as Error, 'MACHINES_UPDATE')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Add downtime log endpoint
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
    const { machine_id, action, reason, notes } = body

    if (!machine_id || !action) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (action === 'start_downtime') {
      // Create downtime log entry
      const { data: downtime, error } = await supabase
        .from('machine_downtime_log')
        .insert({
          machine_id,
          start_time: new Date().toISOString(),
          reason: reason || 'Unspecified',
          reported_by: worker.id,
          notes
        })
        .select()
        .single()

      if (error) {
        logError(error, 'MACHINE_DOWNTIME_START', { userId: user.id, machine_id })
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      // Update machine status
      await supabase
        .from('machines')
        .update({ status: 'maintenance' })
        .eq('id', machine_id)

      logBusiness('Machine downtime started', 'MACHINES', { 
        userId: user.id,
        machineId: machine_id,
        downtimeId: downtime.id,
        reason
      })

      return NextResponse.json({ downtime })
    } else if (action === 'end_downtime') {
      // Find active downtime
      const { data: activeDowntime } = await supabase
        .from('machine_downtime_log')
        .select('*')
        .eq('machine_id', machine_id)
        .is('end_time', null)
        .single()

      if (!activeDowntime) {
        return NextResponse.json({ error: 'No active downtime found' }, { status: 404 })
      }

      // Update downtime log
      const { data: downtime, error } = await supabase
        .from('machine_downtime_log')
        .update({
          end_time: new Date().toISOString(),
          notes: notes || activeDowntime.notes
        })
        .eq('id', activeDowntime.id)
        .select()
        .single()

      if (error) {
        logError(error, 'MACHINE_DOWNTIME_END', { userId: user.id, machine_id })
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      // Update machine status
      await supabase
        .from('machines')
        .update({ status: 'operational' })
        .eq('id', machine_id)

      logBusiness('Machine downtime ended', 'MACHINES', { 
        userId: user.id,
        machineId: machine_id,
        downtimeId: downtime.id,
        duration: new Date(downtime.end_time).getTime() - new Date(downtime.start_time).getTime()
      })

      return NextResponse.json({ downtime })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    logError(error as Error, 'MACHINE_DOWNTIME')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}