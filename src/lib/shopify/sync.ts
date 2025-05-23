import { createClient } from '@/lib/supabase/server'
import { createShopifyClient } from './client'
import type { Database } from '@/types/database'

type OrderInsert = Database['public']['Tables']['orders']['Insert']
type OrderItemInsert = Database['public']['Tables']['order_items']['Insert']
type WorkTaskInsert = Database['public']['Tables']['work_tasks']['Insert']

export async function syncShopifyOrders() {
  const shopifyClient = await createShopifyClient()
  const supabase = await createClient()
  
  if (!shopifyClient) {
    return { 
      success: false, 
      error: 'Shopify not configured. Please configure in Settings.',
      processed: 0,
      details: []
    }
  }
  
  const syncDetails: string[] = []
  
  try {
    // Get the last synced order ID
    const { data: lastOrder } = await supabase
      .from('orders')
      .select('shopify_order_id')
      .order('shopify_order_id', { ascending: false })
      .limit(1)
      .single()
    
    const sinceId = lastOrder?.shopify_order_id
    
    // Fetch orders from Shopify
    const orders = await shopifyClient.getOrders(250, sinceId ? Number(sinceId) : undefined)
    
    console.log(`Syncing ${orders.length} orders from Shopify`)
    syncDetails.push(`Found ${orders.length} orders to sync`)
    
    let successCount = 0
    let errorCount = 0
    
    for (const shopifyOrder of orders) {
      try {
      // Prepare order data
      const orderData: OrderInsert = {
        shopify_order_id: shopifyOrder.id,
        order_number: String(shopifyOrder.order_number),
        customer_name: shopifyOrder.customer ? 
          `${shopifyOrder.customer.first_name || ''} ${shopifyOrder.customer.last_name || ''}`.trim() || 'Guest' : 
          'Guest',
        customer_email: shopifyOrder.customer?.email || null,
        total_price: parseFloat(shopifyOrder.total_price || '0'),
        order_date: shopifyOrder.created_at,
        status: 'pending',
        raw_data: shopifyOrder as any,
        synced_at: new Date().toISOString()
      }
      
      // Upsert order
      const { data: upsertedOrder, error: orderError } = await supabase
        .from('orders')
        .upsert(orderData, {
          onConflict: 'shopify_order_id'
        })
        .select()
        .single()
      
      if (orderError) {
        console.error('Error upserting order:', orderError)
        errorCount++
        syncDetails.push(`❌ Failed to sync order #${orderData.order_number}: ${orderError.message}`)
        continue
      }
      
      if (!upsertedOrder) {
        console.error('No order returned after upsert')
        continue
      }
      
      // Process line items
      for (const lineItem of shopifyOrder.line_items || []) {
        if (!lineItem.id) {
          console.warn('Skipping line item without ID')
          continue
        }
        
        const orderItemData: OrderItemInsert = {
          order_id: upsertedOrder.id,
          shopify_line_item_id: lineItem.id,
          product_name: lineItem.title || 'Unknown Product',
          variant_title: lineItem.variant_title || null,
          quantity: lineItem.quantity || 1,
          price: parseFloat(lineItem.price || '0'),
          sku: lineItem.sku || null,
          product_data: lineItem // Store full line item data
        }
        
        // Upsert order item
        const { data: orderItem, error: itemError } = await supabase
          .from('order_items')
          .upsert(orderItemData, {
            onConflict: 'shopify_line_item_id'
          })
          .select()
          .single()
        
        if (itemError) {
          console.error('Error upserting order item:', itemError)
          continue
        }
        
        if (!orderItem) {
          console.error('No order item returned after upsert')
          continue
        }
        
        // Create work tasks for new order items
        // Using the correct task types from the database schema
        const taskTypes = ['build', 'qc', 'pack'] as const
        
        for (const taskType of taskTypes) {
          // Check if task already exists
          const { data: existingTask } = await supabase
            .from('work_tasks')
            .select('id')
            .eq('order_item_id', orderItem.id)
            .eq('task_type', taskType)
            .single()
          
          if (!existingTask) {
            const taskData: WorkTaskInsert = {
              order_item_id: orderItem.id,
              task_type: taskType,
              task_description: `${taskType.charAt(0).toUpperCase() + taskType.slice(1)} for ${orderItem.product_name}`,
              status: 'pending',
              priority: 'normal',
              estimated_hours: getEstimatedHours(taskType),
              notes: `Order #${orderData.order_number} - Qty: ${orderItem.quantity}`
            }
            
            const { error: taskError } = await supabase
              .from('work_tasks')
              .insert(taskData)
            
            if (taskError) {
              console.error('Error creating work task:', taskError)
            }
          }
        }
      }
      
      successCount++
      syncDetails.push(`✅ Order #${orderData.order_number} synced successfully`)
      } catch (orderError) {
        errorCount++
        const errorMessage = orderError instanceof Error ? orderError.message : 'Unknown error'
        syncDetails.push(`❌ Failed to process order: ${errorMessage}`)
        console.error('Order processing error:', orderError)
      }
    }
    
    return { 
      success: true, 
      processed: orders.length,
      ordersSynced: successCount,
      errors: errorCount,
      details: syncDetails
    }
  } catch (error) {
    console.error('Sync error:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
      processed: 0,
      ordersSynced: 0,
      errors: 0,
      details: syncDetails
    }
  }
}

function getEstimatedHours(taskType: string): number {
  const estimates: Record<string, number> = {
    'build': 2.0,
    'qc': 0.5,
    'pack': 0.5,
    'ship': 0.25,
    'repair': 1.5
  }
  return estimates[taskType] || 1.0
}