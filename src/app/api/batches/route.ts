import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { ApiLogger } from '@/lib/api-logger'
import { logBusiness, logError } from '@/lib/logger'

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
    
    // Build query - note: order_items relationship needs to be handled separately
    let query = supabase
      .from('work_batches')
      .select(`
        *,
        workflow_template:workflow_templates(
          id,
          name,
          description
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
    
    // For each batch, fetch the order items that belong to it
    const batchesWithItems = await Promise.all(
      (batches || []).map(async (batch) => {
        let orderItems: any[] = []
        
        // Only fetch order items if the batch has order_item_ids
        if (batch.order_item_ids && batch.order_item_ids.length > 0) {
          const { data } = await supabase
            .from('order_items')
            .select(`
              id,
              product_name,
              quantity,
              sku,
              orders!inner(
                order_number,
                customer_name
              )
            `)
            .in('id', batch.order_item_ids)
          
          orderItems = data || []
        }
        
        return {
          ...batch,
          order_items: orderItems
        }
      })
    )
    
    return NextResponse.json(batchesWithItems)
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const logContext = ApiLogger.logRequest(request)
  
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
      criteria = {},
      stock_config,
      notes
    } = body
    
    // Validate required fields
    if (!name || !batch_type || !workflow_template_id) {
      return NextResponse.json({ 
        error: 'Missing required fields: name, batch_type, and workflow_template_id are required' 
      }, { status: 400 })
    }
    
    // Handle different batch types
    let finalOrderItemIds = []
    let finalBatchType = batch_type
    let finalCriteria = criteria

    if (batch_type === 'stock' && stock_config) {
      // For stock batches, create placeholder order items
      logBusiness('Creating stock batch', 'BATCH_CREATION', {
        name,
        stockConfig: stock_config,
        createdBy: worker.id
      })

      // Use 'custom' as batch_type since 'stock' isn't allowed by the database constraint
      finalBatchType = 'custom'
      
      // Store stock configuration in criteria
      finalCriteria = {
        ...criteria,
        stock_batch: true,
        stock_config: stock_config,
        item_type: 'stock_models'
      }
      
      // For stock batches, we don't need order_item_ids
      // The criteria will contain all the stock configuration details
      finalOrderItemIds = []
      
    } else {
      // For regular customer order batches
      if (!order_item_ids || !Array.isArray(order_item_ids) || order_item_ids.length === 0) {
        return NextResponse.json({ 
          error: 'Missing required field: order_item_ids is required for customer order batches' 
        }, { status: 400 })
      }
      
      // Validate batch_type for customer order batches
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
        logError(new Error(`Error verifying order items: ${orderItemsError.message}`), 'BATCH_CREATION', {
          orderItemIds: order_item_ids,
          error: orderItemsError
        })
        return NextResponse.json({ error: 'Failed to verify order items' }, { status: 500 })
      }
      
      if (!orderItems || orderItems.length !== order_item_ids.length) {
        return NextResponse.json({ 
          error: 'Some order items do not exist' 
        }, { status: 400 })
      }
      
      finalOrderItemIds = order_item_ids
      
      logBusiness('Creating customer order batch', 'BATCH_CREATION', {
        name,
        batchType: batch_type,
        orderItemCount: order_item_ids.length,
        createdBy: worker.id
      })
    }
    
    // Create the batch with the correct field names based on the schema
    const { data: batch, error: createError } = await supabase
      .from('work_batches')
      .insert({
        name: name,
        batch_type: finalBatchType,
        workflow_template_id,
        order_item_ids: finalOrderItemIds,
        criteria: finalCriteria,
        status: 'pending'
      })
      .select()
      .single()
    
    if (createError) {
      logError(new Error(`Error creating batch: ${createError.message}`), 'BATCH_CREATION', {
        name,
        batchType: finalBatchType,
        createError
      })
      return NextResponse.json({ error: 'Failed to create batch' }, { status: 500 })
    }
    
    logBusiness('Batch created successfully', 'BATCH_CREATION', {
      batchId: batch.id,
      name: batch.name,
      batchType: batch.batch_type,
      isStockBatch: !!stock_config,
      createdBy: worker.id
    })
    
    const response = NextResponse.json({
      ...batch,
      order_items: [] // Will be populated when we fetch batches later
    })
    
    ApiLogger.logResponse(logContext, response, worker.id, {
      batchId: batch.id,
      batchName: batch.name
    })
    
    return response
  } catch (error) {
    logError(error as Error, 'BATCH_CREATION', {
      requestId: logContext.requestId
    })
    
    const response = NextResponse.json({ 
      error: 'Internal server error',
      requestId: logContext.requestId 
    }, { status: 500 })
    
    ApiLogger.logResponse(logContext, response)
    return response
  }
} 