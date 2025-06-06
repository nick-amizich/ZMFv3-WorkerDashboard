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
    const fromLocation = searchParams.get('from_location')
    const toLocation = searchParams.get('to_location')
    const transferType = searchParams.get('transfer_type')

    // Build query
    let query = supabase
      .from('facility_transfers')
      .select(`
        *,
        from_location_info:locations!facility_transfers_from_location_fkey (
          name,
          code: name
        ),
        to_location_info:locations!facility_transfers_to_location_fkey (
          name,
          code: name
        ),
        batch:work_batches (
          batch_name: batch_number,
          headphone_model: specifications
        ),
        creator:workers!facility_transfers_created_by_fkey (
          name
        )
      `)
      .order('created_at', { ascending: false })

    // Apply filters
    if (status) {
      query = query.eq('status', status)
    }
    if (fromLocation) {
      query = query.eq('from_location', fromLocation)
    }
    if (toLocation) {
      query = query.eq('to_location', toLocation)
    }
    if (transferType) {
      query = query.eq('transfer_type', transferType)
    }

    const { data: transfers, error } = await query

    if (error) {
      logError(error, 'FACILITY_TRANSFERS_GET', { userId: user.id })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    logBusiness('Facility transfers fetched', 'FACILITY_TRANSFERS', { 
      userId: user.id,
      count: transfers?.length || 0,
      filters: { status, fromLocation, toLocation, transferType }
    })

    return NextResponse.json({ transfers })
  } catch (error) {
    logError(error as Error, 'FACILITY_TRANSFERS_GET')
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
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    if (!worker) {
      return NextResponse.json({ error: 'Worker not found' }, { status: 404 })
    }

    // Get request body
    const body = await request.json()
    const { 
      batch_id,
      from_location,
      to_location,
      transfer_type,
      quantity,
      notes
    } = body

    // Validate required fields
    if (!from_location || !to_location || !transfer_type || !quantity) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Validate locations are different
    if (from_location === to_location) {
      return NextResponse.json({ error: 'From and to locations must be different' }, { status: 400 })
    }

    // Generate tracking number
    const trackingNumber = `TRF-${Date.now().toString(36).toUpperCase()}`

    // Create transfer
    const { data: transfer, error } = await supabase
      .from('facility_transfers')
      .insert({
        batch_id: batch_id || null,
        from_location,
        to_location,
        transfer_type,
        quantity,
        status: 'pending',
        tracking_number: trackingNumber,
        notes,
        created_by: worker.id
      })
      .select(`
        *,
        from_location_info:locations!facility_transfers_from_location_fkey (
          name,
          code: name
        ),
        to_location_info:locations!facility_transfers_to_location_fkey (
          name,
          code: name
        ),
        batch:work_batches (
          batch_name: batch_number,
          headphone_model: specifications
        ),
        creator:workers!facility_transfers_created_by_fkey (
          name
        )
      `)
      .single()

    if (error) {
      logError(error, 'FACILITY_TRANSFERS_CREATE', { userId: user.id })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    logBusiness('Facility transfer created', 'FACILITY_TRANSFERS', { 
      userId: user.id,
      transferId: transfer.id,
      tracking_number: trackingNumber,
      from_location,
      to_location,
      quantity
    })

    return NextResponse.json({ transfer }, { status: 201 })
  } catch (error) {
    logError(error as Error, 'FACILITY_TRANSFERS_CREATE')
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
    const { id, status, shipped_date, received_date, notes } = body

    if (!id || !status) {
      return NextResponse.json({ error: 'Transfer ID and status required' }, { status: 400 })
    }

    // Build update object
    const updates: any = { status }
    
    if (status === 'in_transit' && !shipped_date) {
      updates.shipped_date = new Date().toISOString()
    } else if (shipped_date) {
      updates.shipped_date = shipped_date
    }

    if (status === 'received' && !received_date) {
      updates.received_date = new Date().toISOString()
    } else if (received_date) {
      updates.received_date = received_date
    }

    if (notes !== undefined) {
      updates.notes = notes
    }

    // Update transfer
    const { data: transfer, error } = await supabase
      .from('facility_transfers')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        from_location_info:locations!facility_transfers_from_location_fkey (
          name,
          code: name
        ),
        to_location_info:locations!facility_transfers_to_location_fkey (
          name,
          code: name
        ),
        batch:work_batches (
          batch_name: batch_number,
          headphone_model: specifications
        ),
        creator:workers!facility_transfers_created_by_fkey (
          name
        )
      `)
      .single()

    if (error) {
      logError(error, 'FACILITY_TRANSFERS_UPDATE', { userId: user.id, transferId: id })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    logBusiness('Facility transfer updated', 'FACILITY_TRANSFERS', { 
      userId: user.id,
      transferId: id,
      updates
    })

    return NextResponse.json({ transfer })
  } catch (error) {
    logError(error as Error, 'FACILITY_TRANSFERS_UPDATE')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
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

    // Get transfer ID from query params
    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Transfer ID required' }, { status: 400 })
    }

    // Check if transfer can be cancelled (only pending transfers)
    const { data: transfer } = await supabase
      .from('facility_transfers')
      .select('status')
      .eq('id', id)
      .single()

    if (!transfer) {
      return NextResponse.json({ error: 'Transfer not found' }, { status: 404 })
    }

    if (transfer.status !== 'pending') {
      return NextResponse.json({ 
        error: 'Only pending transfers can be cancelled' 
      }, { status: 400 })
    }

    // Cancel the transfer
    const { error } = await supabase
      .from('facility_transfers')
      .update({ status: 'cancelled' })
      .eq('id', id)

    if (error) {
      logError(error, 'FACILITY_TRANSFERS_CANCEL', { userId: user.id, transferId: id })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    logBusiness('Facility transfer cancelled', 'FACILITY_TRANSFERS', { 
      userId: user.id,
      transferId: id
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    logError(error as Error, 'FACILITY_TRANSFERS_CANCEL')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}