import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { fetchShopifyOrdersForReview, importSelectedLineItems } from '@/lib/shopify/sync'

export async function GET(request: NextRequest) {
  console.log('Test import endpoint called')
  
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Step 1: Fetch orders
    console.log('Step 1: Fetching orders from Shopify')
    const fetchResult = await fetchShopifyOrdersForReview()
    
    if (!fetchResult.success || !fetchResult.orders?.length) {
      return NextResponse.json({ 
        error: 'No orders found',
        fetchResult 
      }, { status: 404 })
    }
    
    // Step 2: Import first order's first item
    const firstOrder = fetchResult.orders[0]
    const firstItem = firstOrder.line_items[0]
    
    console.log('Step 2: Importing first order', firstOrder.id, 'item', firstItem.id)
    
    const importResult = await importSelectedLineItems({
      orderId: firstOrder.id,
      lineItemIds: [firstItem.id]
    })
    
    console.log('Step 3: Import result', importResult)
    
    // Step 4: Check what was created
    const { data: tasks } = await supabase
      .from('work_tasks')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5)
    
    const { data: orderItems } = await supabase
      .from('order_items')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5)
    
    return NextResponse.json({
      success: true,
      order: {
        id: firstOrder.id,
        number: firstOrder.order_number,
        itemCount: firstOrder.line_items.length
      },
      importedItem: {
        id: firstItem.id,
        name: firstItem.title,
        specs: firstItem.headphone_specs
      },
      importResult,
      createdTasks: tasks?.length || 0,
      createdOrderItems: orderItems?.length || 0,
      recentTasks: tasks,
      recentOrderItems: orderItems
    })
    
  } catch (error) {
    console.error('Test import error:', error)
    return NextResponse.json({ 
      error: 'Test failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}