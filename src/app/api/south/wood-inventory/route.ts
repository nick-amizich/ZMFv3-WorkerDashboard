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
    const species = searchParams.get('species')
    const belowMinimum = searchParams.get('below_minimum') === 'true'

    // Build query
    let query = supabase
      .from('wood_inventory')
      .select('*')
      .order('species')

    // Apply filters
    if (species) {
      query = query.eq('species', species)
    }
    if (belowMinimum) {
      query = query.or('quantity_in_stock.lt.minimum_stock,minimum_stock.is.null')
    }

    const { data: inventory, error } = await query

    if (error) {
      logError(error, 'WOOD_INVENTORY_GET', { userId: user.id })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Calculate summary metrics
    const summary = {
      totalSpecies: inventory?.length || 0,
      totalBoardFeet: inventory?.reduce((sum, item) => sum + (item.board_feet || 0), 0) || 0,
      totalValue: inventory?.reduce((sum, item) => sum + ((item.board_feet || 0) * (item.unit_cost || 0)), 0) || 0,
      belowMinimum: inventory?.filter(item => item.quantity_in_stock < (item.minimum_stock || 0)).length || 0,
      outOfStock: inventory?.filter(item => item.quantity_in_stock === 0).length || 0
    }

    logBusiness('Wood inventory fetched', 'WOOD_INVENTORY', { 
      userId: user.id,
      count: inventory?.length || 0,
      filters: { species, belowMinimum }
    })

    return NextResponse.json({ inventory, summary })
  } catch (error) {
    logError(error as Error, 'WOOD_INVENTORY_GET')
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

    // Get request body
    const body = await request.json()
    const { 
      species,
      board_feet,
      quantity_in_stock,
      minimum_stock,
      unit_cost,
      supplier,
      notes
    } = body

    // Validate required fields
    if (!species || quantity_in_stock === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Check if species already exists
    const { data: existing } = await supabase
      .from('wood_inventory')
      .select('id')
      .eq('species', species)
      .single()

    if (existing) {
      return NextResponse.json({ 
        error: 'Species already exists in inventory. Use PUT to update.' 
      }, { status: 409 })
    }

    // Create inventory entry
    const { data: inventory, error } = await supabase
      .from('wood_inventory')
      .insert({
        species,
        board_feet: board_feet || null,
        quantity_in_stock,
        minimum_stock: minimum_stock || 10,
        unit_cost: unit_cost || null,
        supplier: supplier || null,
        notes: notes || null,
        last_updated: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      logError(error, 'WOOD_INVENTORY_CREATE', { userId: user.id })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    logBusiness('Wood inventory entry created', 'WOOD_INVENTORY', { 
      userId: user.id,
      inventoryId: inventory.id,
      species,
      quantity_in_stock
    })

    return NextResponse.json({ inventory }, { status: 201 })
  } catch (error) {
    logError(error as Error, 'WOOD_INVENTORY_CREATE')
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
      return NextResponse.json({ error: 'Inventory ID required' }, { status: 400 })
    }

    // Always update last_updated timestamp
    updates.last_updated = new Date().toISOString()

    // Update inventory
    const { data: inventory, error } = await supabase
      .from('wood_inventory')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      logError(error, 'WOOD_INVENTORY_UPDATE', { userId: user.id, inventoryId: id })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    logBusiness('Wood inventory updated', 'WOOD_INVENTORY', { 
      userId: user.id,
      inventoryId: id,
      updates
    })

    return NextResponse.json({ inventory })
  } catch (error) {
    logError(error as Error, 'WOOD_INVENTORY_UPDATE')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Adjust inventory (for material usage, receiving, etc.)
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
      .select('id, name')
      .eq('auth_user_id', user.id)
      .single()

    if (!worker) {
      return NextResponse.json({ error: 'Worker not found' }, { status: 404 })
    }

    // Get request body
    const body = await request.json()
    const { 
      species,
      adjustment_type,
      quantity,
      board_feet_adjustment,
      reason,
      production_request_id
    } = body

    if (!species || !adjustment_type || quantity === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Get current inventory
    const { data: currentInventory } = await supabase
      .from('wood_inventory')
      .select('*')
      .eq('species', species)
      .single()

    if (!currentInventory) {
      return NextResponse.json({ error: 'Species not found in inventory' }, { status: 404 })
    }

    // Calculate new values based on adjustment type
    let newQuantity = currentInventory.quantity_in_stock
    let newBoardFeet = currentInventory.board_feet || 0

    switch (adjustment_type) {
      case 'usage':
        newQuantity -= quantity
        if (board_feet_adjustment) {
          newBoardFeet -= board_feet_adjustment
        }
        break
      case 'receive':
        newQuantity += quantity
        if (board_feet_adjustment) {
          newBoardFeet += board_feet_adjustment
        }
        break
      case 'adjust':
        newQuantity = quantity
        if (board_feet_adjustment !== undefined) {
          newBoardFeet = board_feet_adjustment
        }
        break
      default:
        return NextResponse.json({ error: 'Invalid adjustment type' }, { status: 400 })
    }

    // Ensure we don't go negative
    if (newQuantity < 0) {
      return NextResponse.json({ 
        error: 'Insufficient inventory. Cannot reduce below zero.' 
      }, { status: 400 })
    }

    // Update inventory
    const { data: updatedInventory, error: updateError } = await supabase
      .from('wood_inventory')
      .update({
        quantity_in_stock: newQuantity,
        board_feet: newBoardFeet,
        last_updated: new Date().toISOString(),
        last_ordered: adjustment_type === 'receive' ? new Date().toISOString().split('T')[0] : currentInventory.last_ordered
      })
      .eq('id', currentInventory.id)
      .select()
      .single()

    if (updateError) {
      logError(updateError, 'WOOD_INVENTORY_ADJUST', { userId: user.id, species })
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // Log the adjustment
    logBusiness('Wood inventory adjusted', 'WOOD_INVENTORY', { 
      userId: user.id,
      inventoryId: currentInventory.id,
      species,
      adjustment_type,
      quantity,
      board_feet_adjustment,
      reason,
      production_request_id,
      adjusted_by: worker.name,
      old_quantity: currentInventory.quantity_in_stock,
      new_quantity: newQuantity
    })

    return NextResponse.json({ 
      inventory: updatedInventory,
      adjustment: {
        type: adjustment_type,
        quantity_change: newQuantity - currentInventory.quantity_in_stock,
        board_feet_change: newBoardFeet - (currentInventory.board_feet || 0),
        performed_by: worker.name,
        timestamp: new Date().toISOString()
      }
    })
  } catch (error) {
    logError(error as Error, 'WOOD_INVENTORY_ADJUST')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}