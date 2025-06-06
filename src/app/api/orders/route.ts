import { createClient } from '@/lib/supabase/server'
import { NextResponse, NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // ALWAYS validate employee status
    const { data: worker } = await supabase
      .from('workers')
      .select('role, is_active')
      .eq('auth_user_id', user.id)
      .single()
    
    if (!worker?.is_active) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    // Only managers can view all orders
    if (!['manager', 'supervisor'].includes(worker.role || '')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    // Check if we just want counts
    const url = new URL(request.url)
    if (url.searchParams.get('count') === 'items') {
      const { count } = await supabase
        .from('order_items')
        .select('*', { count: 'exact', head: true })
      
      return NextResponse.json({ count })
    }
    
    // Check if we want available items for batch creation
    if (url.searchParams.get('status') === 'pending') {
      const limit = parseInt(url.searchParams.get('limit') || '50')
      
      // Get all order items that are not yet in a batch
      const { data: batchedItems } = await supabase
        .from('work_batches')
        .select('order_item_ids')
      
      const batchedItemIds = new Set(
        batchedItems?.flatMap(batch => batch.order_item_ids || []) || []
      )
      
      const { data: orderItems, error: itemsError } = await supabase
        .from('order_items')
        .select(`
          id,
          order_id,
          sku,
          product_name,
          variant_title,
          quantity,
          headphone_material,
          headphone_color,
          orders!inner (
            shopify_order_id,
            customer_name,
            order_number
          )
        `)
        .order('created_at', { ascending: false })
        .limit(limit * 2) // Get more than needed to account for filtering
      
      if (itemsError) {
        console.error('Error fetching order items:', itemsError)
        return NextResponse.json({ error: 'Failed to fetch order items' }, { status: 500 })
      }
      
      // Filter out items already in batches and format the response
      const availableItems = (orderItems || [])
        .filter(item => !batchedItemIds.has(item.id))
        .slice(0, limit) // Apply the limit after filtering
        .map(item => ({
          id: item.id,
          order_id: item.order_id,
          sku: item.sku,
          product_name: item.product_name || 'Unknown Product',
          variant_title: item.variant_title,
          quantity: item.quantity,
          shopify_order_name: item.orders?.order_number || 'Unknown',
          customer_name: item.orders?.customer_name || 'Unknown Customer',
          material: item.headphone_material,
          color: item.headphone_color
        }))
      
      return NextResponse.json({ items: availableItems })
    }
    
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (
          id,
          product_name,
          variant_title,
          quantity,
          price,
          sku,
          product_data
        )
      `)
      .order('created_at', { ascending: false })
    
    if (ordersError) {
      console.error('Error fetching orders:', ordersError)
      return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 })
    }
    
    return NextResponse.json({ orders: orders || [] })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}