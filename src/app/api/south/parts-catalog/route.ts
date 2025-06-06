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
    const partType = searchParams.get('part_type')
    const isActive = searchParams.get('is_active')
    const search = searchParams.get('search')

    // Build query
    let query = supabase
      .from('parts_catalog')
      .select('*')
      .order('part_name')

    // Apply filters
    if (partType) {
      query = query.eq('part_type', partType)
    }
    if (isActive !== null) {
      query = query.eq('is_active', isActive === 'true')
    }
    if (search) {
      query = query.or(`part_name.ilike.%${search}%,species.ilike.%${search}%`)
    }

    const { data: parts, error } = await query

    if (error) {
      logError(error, 'PARTS_CATALOG_GET', { userId: user.id })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    logBusiness('Parts catalog fetched', 'PARTS_CATALOG', { 
      userId: user.id,
      count: parts?.length || 0,
      filters: { partType, isActive, search }
    })

    return NextResponse.json({ parts })
  } catch (error) {
    logError(error as Error, 'PARTS_CATALOG_GET')
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
    const { part_name, part_type, species, specifications, material_cost, estimated_labor_hours } = body

    // Validate required fields
    if (!part_name || !part_type) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Create part
    const { data: part, error } = await supabase
      .from('parts_catalog')
      .insert({
        part_name,
        part_type,
        species,
        specifications: specifications || {},
        material_cost: material_cost || null,
        estimated_labor_hours: estimated_labor_hours || null,
        is_active: true
      })
      .select()
      .single()

    if (error) {
      logError(error, 'PARTS_CATALOG_CREATE', { userId: user.id, part_name })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    logBusiness('Part created', 'PARTS_CATALOG', { 
      userId: user.id,
      partId: part.id,
      part_name,
      part_type
    })

    return NextResponse.json({ part }, { status: 201 })
  } catch (error) {
    logError(error as Error, 'PARTS_CATALOG_CREATE')
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
      return NextResponse.json({ error: 'Part ID required' }, { status: 400 })
    }

    // Update part
    const { data: part, error } = await supabase
      .from('parts_catalog')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      logError(error, 'PARTS_CATALOG_UPDATE', { userId: user.id, partId: id })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    logBusiness('Part updated', 'PARTS_CATALOG', { 
      userId: user.id,
      partId: id,
      updates
    })

    return NextResponse.json({ part })
  } catch (error) {
    logError(error as Error, 'PARTS_CATALOG_UPDATE')
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

    // Get part ID from query params
    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Part ID required' }, { status: 400 })
    }

    // Soft delete by setting is_active to false
    const { error } = await supabase
      .from('parts_catalog')
      .update({ is_active: false })
      .eq('id', id)

    if (error) {
      logError(error, 'PARTS_CATALOG_DELETE', { userId: user.id, partId: id })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    logBusiness('Part deactivated', 'PARTS_CATALOG', { 
      userId: user.id,
      partId: id
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    logError(error as Error, 'PARTS_CATALOG_DELETE')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}