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
    const requestId = searchParams.get('production_request_id')

    // Build query
    let query = supabase
      .from('daily_production')
      .select(`
        *,
        production_requests!inner (
          id,
          request_number,
          customer_name,
          quantity_ordered,
          quantity_completed,
          parts_catalog!inner (
            part_name,
            part_type,
            species
          )
        ),
        machines!inner (
          machine_name,
          machine_type
        ),
        workers (
          name,
          email
        )
      `)
      .order('manufacturing_date', { ascending: false })

    // Apply filters
    if (startDate) {
      query = query.gte('manufacturing_date', startDate)
    }
    if (endDate) {
      query = query.lte('manufacturing_date', endDate)
    }
    if (machineId) {
      query = query.eq('machine_id', machineId)
    }
    if (requestId) {
      query = query.eq('production_request_id', requestId)
    }

    const { data: production, error } = await query

    if (error) {
      logError(error, 'DAILY_PRODUCTION_GET', { userId: user.id })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Calculate summary statistics
    const summary = {
      totalProduced: production?.reduce((sum, p) => sum + (p.quantity_produced || 0), 0) || 0,
      totalScrap: production?.reduce((sum, p) => sum + (p.scrap_quantity || 0), 0) || 0,
      totalSetupTime: production?.reduce((sum, p) => sum + (p.setup_time_minutes || 0), 0) || 0,
      totalRunTime: production?.reduce((sum, p) => sum + (p.run_time_minutes || 0), 0) || 0,
      efficiency: 0
    }

    if (summary.totalProduced > 0) {
      summary.efficiency = ((summary.totalProduced - summary.totalScrap) / summary.totalProduced) * 100
    }

    logBusiness('Daily production fetched', 'DAILY_PRODUCTION', { 
      userId: user.id,
      count: production?.length || 0,
      filters: { startDate, endDate, machineId, requestId }
    })

    return NextResponse.json({ production, summary })
  } catch (error) {
    logError(error as Error, 'DAILY_PRODUCTION_GET')
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
      production_request_id,
      machine_id,
      manufacturing_date,
      quantity_produced,
      scrap_quantity,
      setup_time_minutes,
      run_time_minutes,
      quality_notes
    } = body

    // Validate required fields
    if (!production_request_id || !machine_id || !quantity_produced) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Validate quantities
    if (quantity_produced < 0 || (scrap_quantity && scrap_quantity < 0)) {
      return NextResponse.json({ error: 'Quantities must be positive' }, { status: 400 })
    }

    // Get production request details
    const { data: productionRequest } = await supabase
      .from('production_requests')
      .select('quantity_ordered, quantity_completed')
      .eq('id', production_request_id)
      .single()

    if (!productionRequest) {
      return NextResponse.json({ error: 'Production request not found' }, { status: 404 })
    }

    // Create production log
    const { data: production, error } = await supabase
      .from('daily_production')
      .insert({
        production_request_id,
        machine_id,
        manufacturing_date: manufacturing_date || new Date().toISOString().split('T')[0],
        quantity_produced,
        scrap_quantity: scrap_quantity || 0,
        setup_time_minutes: setup_time_minutes || 0,
        run_time_minutes: run_time_minutes || 0,
        completed_by: worker.id,
        quality_notes
      })
      .select()
      .single()

    if (error) {
      logError(error, 'DAILY_PRODUCTION_CREATE', { userId: user.id })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Update production request completed quantity
    const newCompletedQuantity = (productionRequest.quantity_completed || 0) + quantity_produced
    const newStatus = newCompletedQuantity >= productionRequest.quantity_ordered ? 'completed' : 'in_production'

    await supabase
      .from('production_requests')
      .update({ 
        quantity_completed: newCompletedQuantity,
        status: newStatus
      })
      .eq('id', production_request_id)

    logBusiness('Daily production logged', 'DAILY_PRODUCTION', { 
      userId: user.id,
      productionId: production.id,
      production_request_id,
      quantity_produced,
      scrap_quantity
    })

    return NextResponse.json({ production }, { status: 201 })
  } catch (error) {
    logError(error as Error, 'DAILY_PRODUCTION_CREATE')
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
      return NextResponse.json({ error: 'Production ID required' }, { status: 400 })
    }

    // Get existing production record
    const { data: existing } = await supabase
      .from('daily_production')
      .select('quantity_produced, production_request_id')
      .eq('id', id)
      .single()

    if (!existing) {
      return NextResponse.json({ error: 'Production record not found' }, { status: 404 })
    }

    // Update production
    const { data: production, error } = await supabase
      .from('daily_production')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      logError(error, 'DAILY_PRODUCTION_UPDATE', { userId: user.id, productionId: id })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // If quantity changed, update production request
    if (updates.quantity_produced && updates.quantity_produced !== existing.quantity_produced) {
      const quantityDiff = updates.quantity_produced - existing.quantity_produced

      const { data: productionRequest } = await supabase
        .from('production_requests')
        .select('quantity_ordered, quantity_completed')
        .eq('id', existing.production_request_id)
        .single()

      if (productionRequest) {
        const newCompletedQuantity = (productionRequest.quantity_completed || 0) + quantityDiff
        const newStatus = newCompletedQuantity >= productionRequest.quantity_ordered ? 'completed' : 'in_production'

        await supabase
          .from('production_requests')
          .update({ 
            quantity_completed: newCompletedQuantity,
            status: newStatus
          })
          .eq('id', existing.production_request_id)
      }
    }

    logBusiness('Daily production updated', 'DAILY_PRODUCTION', { 
      userId: user.id,
      productionId: id,
      updates
    })

    return NextResponse.json({ production })
  } catch (error) {
    logError(error as Error, 'DAILY_PRODUCTION_UPDATE')
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

    // Get production ID from query params
    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Production ID required' }, { status: 400 })
    }

    // Get production record before deletion
    const { data: production } = await supabase
      .from('daily_production')
      .select('quantity_produced, production_request_id')
      .eq('id', id)
      .single()

    if (!production) {
      return NextResponse.json({ error: 'Production record not found' }, { status: 404 })
    }

    // Delete production record
    const { error } = await supabase
      .from('daily_production')
      .delete()
      .eq('id', id)

    if (error) {
      logError(error, 'DAILY_PRODUCTION_DELETE', { userId: user.id, productionId: id })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Update production request completed quantity
    const { data: productionRequest } = await supabase
      .from('production_requests')
      .select('quantity_ordered, quantity_completed')
      .eq('id', production.production_request_id)
      .single()

    if (productionRequest) {
      const newCompletedQuantity = Math.max(0, (productionRequest.quantity_completed || 0) - production.quantity_produced)
      const newStatus = newCompletedQuantity >= productionRequest.quantity_ordered ? 'completed' : 'in_production'

      await supabase
        .from('production_requests')
        .update({ 
          quantity_completed: newCompletedQuantity,
          status: newStatus
        })
        .eq('id', production.production_request_id)
    }

    logBusiness('Daily production deleted', 'DAILY_PRODUCTION', { 
      userId: user.id,
      productionId: id,
      quantity_removed: production.quantity_produced
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    logError(error as Error, 'DAILY_PRODUCTION_DELETE')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}