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
    const priority = searchParams.get('priority')
    const search = searchParams.get('search')

    // Build query
    let query = supabase
      .from('production_requests')
      .select(`
        *,
        parts_catalog!inner (
          id,
          part_name,
          part_type,
          species,
          specifications
        ),
        workers (
          name,
          email
        )
      `)
      .eq('location', 'south')
      .order('due_date', { ascending: true })

    // Apply filters
    if (status) {
      query = query.eq('status', status)
    }
    if (priority) {
      query = query.eq('priority', priority)
    }
    if (search) {
      query = query.or(`request_number.ilike.%${search}%,customer_name.ilike.%${search}%`)
    }

    const { data: requests, error } = await query

    if (error) {
      logError(error, 'PRODUCTION_REQUESTS_GET', { userId: user.id })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Calculate additional metrics
    const requestsWithMetrics = requests?.map(request => ({
      ...request,
      completion_percentage: request.quantity_ordered > 0 
        ? Math.round((request.quantity_completed / request.quantity_ordered) * 100)
        : 0,
      is_overdue: new Date(request.due_date) < new Date() && request.status !== 'completed'
    }))

    logBusiness('Production requests fetched', 'PRODUCTION_REQUESTS', { 
      userId: user.id,
      count: requests?.length || 0,
      filters: { status, priority, search }
    })

    return NextResponse.json({ requests: requestsWithMetrics })
  } catch (error) {
    logError(error as Error, 'PRODUCTION_REQUESTS_GET')
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
      customer_name,
      part_id,
      quantity_ordered,
      due_date,
      priority,
      unit_price,
      notes
    } = body

    // Validate required fields
    if (!customer_name || !part_id || !quantity_ordered || !due_date) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Validate quantity
    if (quantity_ordered <= 0) {
      return NextResponse.json({ error: 'Quantity must be positive' }, { status: 400 })
    }

    // Create production request
    const { data: request, error } = await supabase
      .from('production_requests')
      .insert({
        customer_name,
        part_id,
        quantity_ordered,
        quantity_completed: 0,
        due_date,
        priority: priority || 'normal',
        status: 'pending',
        location: 'south',
        unit_price: unit_price || null,
        notes,
        created_by: worker.id
      })
      .select(`
        *,
        parts_catalog (
          part_name,
          part_type,
          species
        )
      `)
      .single()

    if (error) {
      logError(error, 'PRODUCTION_REQUESTS_CREATE', { userId: user.id })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    logBusiness('Production request created', 'PRODUCTION_REQUESTS', { 
      userId: user.id,
      requestId: request.id,
      request_number: request.request_number,
      customer_name,
      quantity_ordered
    })

    return NextResponse.json({ request }, { status: 201 })
  } catch (error) {
    logError(error as Error, 'PRODUCTION_REQUESTS_CREATE')
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
      return NextResponse.json({ error: 'Request ID required' }, { status: 400 })
    }

    // Don't allow direct updates to quantity_completed (use daily production logs)
    delete updates.quantity_completed

    // Update production request
    const { data: request, error } = await supabase
      .from('production_requests')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        parts_catalog (
          part_name,
          part_type,
          species
        )
      `)
      .single()

    if (error) {
      logError(error, 'PRODUCTION_REQUESTS_UPDATE', { userId: user.id, requestId: id })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    logBusiness('Production request updated', 'PRODUCTION_REQUESTS', { 
      userId: user.id,
      requestId: id,
      updates
    })

    return NextResponse.json({ request })
  } catch (error) {
    logError(error as Error, 'PRODUCTION_REQUESTS_UPDATE')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Cancel production request
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

    // Get request ID from query params
    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Request ID required' }, { status: 400 })
    }

    // Check if request has any production
    const { data: request } = await supabase
      .from('production_requests')
      .select('quantity_completed, status')
      .eq('id', id)
      .single()

    if (!request) {
      return NextResponse.json({ error: 'Production request not found' }, { status: 404 })
    }

    if (request.quantity_completed > 0) {
      return NextResponse.json({ 
        error: 'Cannot cancel request with completed production. Mark as completed instead.' 
      }, { status: 400 })
    }

    // Cancel the request
    const { error } = await supabase
      .from('production_requests')
      .update({ status: 'cancelled' })
      .eq('id', id)

    if (error) {
      logError(error, 'PRODUCTION_REQUESTS_CANCEL', { userId: user.id, requestId: id })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    logBusiness('Production request cancelled', 'PRODUCTION_REQUESTS', { 
      userId: user.id,
      requestId: id
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    logError(error as Error, 'PRODUCTION_REQUESTS_CANCEL')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}