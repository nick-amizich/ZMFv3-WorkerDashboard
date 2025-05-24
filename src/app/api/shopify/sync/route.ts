import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { fetchShopifyOrdersForReview } from '@/lib/shopify/sync'

export async function POST(request: NextRequest) {
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
    
    if (!worker?.is_active || !['manager', 'supervisor'].includes(worker.role || '')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    // Fetch orders for review (doesn't import anything)
    const result = await fetchShopifyOrdersForReview()
    
    if (result.success) {
      return NextResponse.json({ 
        success: true, 
        message: `Found ${result.count} orders for review`,
        orders: result.orders,
        count: result.count
      })
    } else {
      return NextResponse.json({ 
        error: result.error || 'Failed to fetch orders'
      }, { status: 500 })
    }
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET endpoint for cron job (Vercel) - now just fetches for review
export async function GET(request: NextRequest) {
  // Verify cron secret if provided
  const authHeader = request.headers.get('authorization')
  if (authHeader && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  try {
    const result = await fetchShopifyOrdersForReview()
    
    if (result.success) {
      return NextResponse.json({ 
        success: true, 
        message: `Found ${result.count} orders available for import`,
        count: result.count
      })
    } else {
      return NextResponse.json({ 
        error: result.error || 'Failed to fetch orders' 
      }, { status: 500 })
    }
  } catch (error) {
    console.error('Cron fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}