import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Validate employee status
    const { data: worker } = await supabase
      .from('workers')
      .select('role, is_active')
      .eq('auth_user_id', user.id)
      .single()
    
    if (!worker?.is_active) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    // Get URL parameters for filtering
    const url = new URL(request.url)
    const status = url.searchParams.get('status')
    const workflowId = url.searchParams.get('workflow_id')
    
    // Build query
    let query = supabase
      .from('work_batches')
      .select(`
        *,
        workflow_template:workflow_templates(
          id,
          name,
          description
        ),
        order_items(
          id,
          product_name,
          quantity,
          sku,
          order:orders(
            order_number,
            customer_name
          )
        )
      `)
      .order('created_at', { ascending: false })
    
    // Apply filters
    if (status) {
      query = query.eq('status', status)
    }
    
    if (workflowId) {
      query = query.eq('workflow_template_id', workflowId)
    }
    
    const { data: batches, error: batchesError } = await query
    
    if (batchesError) {
      console.error('Error fetching batches:', batchesError)
      return NextResponse.json({ error: 'Failed to fetch batches' }, { status: 500 })
    }
    
    return NextResponse.json(batches || [])
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Validate employee status and role
    const { data: worker } = await supabase
      .from('workers')
      .select('id, role, is_active')
      .eq('auth_user_id', user.id)
      .single()
    
    if (!worker?.is_active) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    // Only managers can create batches
    if (!['manager', 'supervisor'].includes(worker.role || '')) {
      return NextResponse.json({ error: 'Forbidden: Only managers can create batches' }, { status: 403 })
    }
    
    const body = await request.json()
    const { 
      name,
      batch_type,
      order_item_ids,
      workflow_template_id,
      criteria = {}
    } = body
    
    // Validate required fields
    if (!name || !batch_type || !order_item_ids || !Array.isArray(order_item_ids) || order_item_ids.length === 0) {
      return NextResponse.json({ 
        error: 'Missing required fields: name, batch_type, and order_item_ids are required' 
      }, { status: 400 })
    }
    
    // Validate batch_type
    if (!['model', 'wood_type', 'custom'].includes(batch_type)) {
      return NextResponse.json({ 
        error: 'Invalid batch_type. Must be one of: model, wood_type, custom' 
      }, { status: 400 })
    }
    
    // Verify all order items exist
    const { data: orderItems, error: orderItemsError } = await supabase
      .from('order_items')
      .select('id, product_name')
      .in('id', order_item_ids)
    
    if (orderItemsError) {
      console.error('Error verifying order items:', orderItemsError)
      return NextResponse.json({ error: 'Failed to verify order items' }, { status: 500 })
    }
    
    if (!orderItems || orderItems.length !== order_item_ids.length) {
      return NextResponse.json({ 
        error: 'Some order items do not exist' 
      }, { status: 400 })
    }
    
    // Create the batch
    const { data: batch, error: createError } = await supabase
      .from('work_batches')
      .insert({
        name,
        batch_type,
        order_item_ids,
        workflow_template_id,
        criteria,
        status: 'pending'
      })
      .select(`
        *,
        workflow_template:workflow_templates(
          id,
          name,
          description
        ),
        order_items(
          id,
          product_name,
          quantity,
          sku,
          order:orders(
            order_number,
            customer_name
          )
        )
      `)
      .single()
    
    if (createError) {
      console.error('Error creating batch:', createError)
      return NextResponse.json({ error: 'Failed to create batch' }, { status: 500 })
    }
    
    return NextResponse.json(batch)
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 