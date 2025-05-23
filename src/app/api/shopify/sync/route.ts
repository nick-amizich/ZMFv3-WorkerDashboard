import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { syncShopifyOrders } from '@/lib/shopify/sync'

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
    
    // Perform sync
    const result = await syncShopifyOrders()
    
    if (result.success) {
      return NextResponse.json({ 
        success: true, 
        message: `Successfully synced ${result.ordersSynced} orders`,
        ordersSynced: result.ordersSynced,
        errors: result.errors || 0,
        details: result.details || []
      })
    } else {
      return NextResponse.json({ 
        error: result.error || 'Sync failed',
        details: result.details || []
      }, { status: 500 })
    }
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET endpoint for cron job (Vercel)
export async function GET(request: NextRequest) {
  // Verify cron secret if provided
  const authHeader = request.headers.get('authorization')
  if (authHeader && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  try {
    const result = await syncShopifyOrders()
    
    if (result.success) {
      return NextResponse.json({ 
        success: true, 
        message: `Successfully synced ${result.ordersSynced} orders`,
        ordersSynced: result.ordersSynced,
        errors: result.errors || 0,
        details: result.details || []
      })
    } else {
      return NextResponse.json({ 
        error: result.error || 'Sync failed' 
      }, { status: 500 })
    }
  } catch (error) {
    console.error('Cron sync error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}