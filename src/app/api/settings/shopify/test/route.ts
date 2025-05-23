import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Verify manager role
    const { data: worker } = await supabase
      .from('workers')
      .select('role, is_active')
      .eq('auth_user_id', user.id)
      .single()
    
    if (!worker?.is_active || worker.role !== 'manager') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    const { store_domain, api_access_token } = await request.json()
    
    if (!store_domain || !api_access_token) {
      return NextResponse.json({ 
        error: 'Store domain and API token are required' 
      }, { status: 400 })
    }
    
    try {
      // Test connection by fetching shop info and recent orders
      const shopResponse = await fetch(
        `https://${store_domain}/admin/api/2024-01/shop.json`,
        {
          headers: {
            'X-Shopify-Access-Token': api_access_token,
            'Content-Type': 'application/json',
          },
        }
      )
      
      if (!shopResponse.ok) {
        const error = await shopResponse.text()
        console.error('Shopify API error:', error)
        return NextResponse.json({ 
          success: false,
          error: 'Invalid credentials or store domain' 
        }, { status: 400 })
      }
      
      const shopData = await shopResponse.json()
      
      // Also test orders endpoint
      const ordersResponse = await fetch(
        `https://${store_domain}/admin/api/2024-01/orders/count.json`,
        {
          headers: {
            'X-Shopify-Access-Token': api_access_token,
            'Content-Type': 'application/json',
          },
        }
      )
      
      let orderCount = 0
      if (ordersResponse.ok) {
        const ordersData = await ordersResponse.json()
        orderCount = ordersData.count || 0
      }
      
      return NextResponse.json({
        success: true,
        shop_name: shopData.shop?.name || 'Unknown',
        shop_domain: shopData.shop?.domain || store_domain,
        order_count: orderCount,
        message: 'Connection successful!'
      })
    } catch (error) {
      console.error('Test connection error:', error)
      return NextResponse.json({ 
        success: false,
        error: 'Failed to connect to Shopify. Please check your credentials.' 
      }, { status: 400 })
    }
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}