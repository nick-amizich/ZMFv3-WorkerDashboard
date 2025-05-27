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
    
    // Get pagination parameters
    const url = new URL(request.url)
    const page = parseInt(url.searchParams.get('page') || '1')
    const limit = parseInt(url.searchParams.get('limit') || '50') // Increased default limit
    const offset = (page - 1) * limit
    
    console.log(`Fetching Shopify orders: page=${page}, limit=${limit}, offset=${offset}`)
    
    // Fetch orders for review (doesn't import anything)
    const result = await fetchShopifyOrdersForReview({ limit, offset })
    
    if (result.success) {
      return NextResponse.json({ 
        success: true, 
        message: `Found ${result.count} orders for review (page ${result.pagination.currentPage} of ${result.pagination.totalPages})`,
        orders: result.orders,
        count: result.count,
        pagination: result.pagination
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