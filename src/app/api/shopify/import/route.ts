import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { importSelectedLineItems } from '@/lib/shopify/sync'

export async function POST(request: NextRequest) {
  
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user) {
      console.error('Auth error:', error)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // ALWAYS validate employee status
    const { data: worker } = await supabase
      .from('workers')
      .select('role, is_active')
      .eq('auth_user_id', user.id)
      .single()
    
    
    if (!worker?.is_active || !['manager', 'supervisor'].includes(worker.role || '')) {
      console.error('Worker not authorized:', worker)
      return NextResponse.json({ error: 'Forbidden - must be active manager or supervisor' }, { status: 403 })
    }
    
    // Parse request body
    const body = await request.json()
    
    const { orderId, lineItemIds } = body
    
    if (!orderId || !lineItemIds || !Array.isArray(lineItemIds) || lineItemIds.length === 0) {
      return NextResponse.json({ 
        error: 'Missing required fields: orderId and lineItemIds',
        received: { orderId, lineItemIds }
      }, { status: 400 })
    }
    
    
    // Import selected line items
    const result = await importSelectedLineItems({
      orderId: Number(orderId),
      lineItemIds: lineItemIds.map(id => Number(id))
    })
    
    
    if (result.success) {
      return NextResponse.json({ 
        success: true, 
        message: `Successfully imported ${result.itemsCreated} items with ${result.tasksCreated} tasks`,
        itemsCreated: result.itemsCreated,
        tasksCreated: result.tasksCreated,
        orderItems: 'orderItems' in result ? result.orderItems : [],
        details: result.details
      })
    } else {
      console.error('Import failed:', result)
      return NextResponse.json({ 
        error: result.error || 'Import failed',
        details: result.details || []
      }, { status: 500 })
    }
  } catch (error) {
    console.error('Import API Error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 