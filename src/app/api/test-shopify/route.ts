import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { createShopifyClient } from '@/lib/shopify/client'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Test Shopify connection
    const shopifyClient = await createShopifyClient()
    
    if (!shopifyClient) {
      return NextResponse.json({ 
        error: 'Shopify client not configured',
        message: 'Please configure Shopify in settings'
      }, { status: 500 })
    }
    
    try {
      // Try to fetch orders
      const orders = await shopifyClient.getOrders(5)
      
      return NextResponse.json({
        success: true,
        message: 'Shopify connection successful',
        orderCount: orders.length,
        sampleOrder: orders[0] ? {
          order_number: orders[0].order_number,
          created_at: orders[0].created_at,
          line_items_count: orders[0].line_items.length
        } : null
      })
    } catch (shopifyError) {
      return NextResponse.json({
        success: false,
        error: 'Shopify API error',
        details: shopifyError instanceof Error ? shopifyError.message : 'Unknown error',
        config: {
          hasToken: !!process.env.SHOPIFY_ACCESS_TOKEN,
          hasStore: !!process.env.SHOPIFY_STORE_DOMAIN
        }
      }, { status: 500 })
    }
    
  } catch (error) {
    console.error('Test API Error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}