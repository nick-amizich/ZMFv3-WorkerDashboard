import { createClient } from '@/lib/supabase/server'
import { createShopifyClient } from './client'
import type { Database } from '@/types/database'

type OrderInsert = Database['public']['Tables']['orders']['Insert']
type OrderItemInsert = Database['public']['Tables']['order_items']['Insert']
type WorkTaskInsert = Database['public']['Tables']['work_tasks']['Insert']

// Helper function to parse headphone specifications from variant data
function parseHeadphoneSpecs(lineItem: any) {
  const variantTitle = lineItem.variant_title || ''
  const productName = lineItem.title || lineItem.name || ''
  const properties = lineItem.properties || []
  
  // Initialize specs object
  const specs: Record<string, any> = {
    material: null,
    color: null,
    pad_type: null,
    cable_type: null,
    finish: null,
    driver_type: null,
    impedance: null,
    custom_engraving: null,
    bundle_component: false
  }
  
  // Parse variant title for common headphone attributes
  const variantParts = variantTitle.split(' / ').map((part: string) => part.trim())
  
  // Common headphone materials
  const materials = ['Aluminum', 'Wood', 'Carbon', 'Steel', 'Titanium', 'Plastic']
  const colors = ['Black', 'Silver', 'Natural', 'White', 'Red', 'Blue', 'Gold']
  const padTypes = ['Vegan', 'Leather', 'Velour', 'Cloth', 'Perforated', 'Vented', 'Solid']
  const cableTypes = ['1/4', '3.5mm', 'XLR', 'USB-C', 'Lightning', 'Balanced']
  
  // Parse each part of the variant title
  variantParts.forEach((part: string) => {
    const upperPart = part.toUpperCase()
    
    // Check for materials
    materials.forEach(material => {
      if (upperPart.includes(material.toUpperCase())) {
        specs.material = material
      }
    })
    
    // Check for colors
    colors.forEach(color => {
      if (upperPart.includes(color.toUpperCase())) {
        specs.color = color
      }
    })
    
    // Check for pad types
    padTypes.forEach(padType => {
      if (upperPart.includes(padType.toUpperCase())) {
        specs.pad_type = padType
      }
    })
    
    // Check for cable types
    cableTypes.forEach(cableType => {
      if (part.includes(cableType)) {
        specs.cable_type = cableType
      }
    })
    
    // Check for impedance (like "32ohm", "150Ω")
    const impedanceMatch = part.match(/(\d+)\s?(ohm|Ω|ohms)/i)
    if (impedanceMatch) {
      specs.impedance = `${impedanceMatch[1]}Ω`
    }
  })
  
  // Parse properties for custom attributes
  properties.forEach((prop: any) => {
    const key = prop.name?.toLowerCase() || ''
    const value = prop.value || ''
    
    if (key.includes('engraving') || key.includes('personalization')) {
      specs.custom_engraving = value
    }
    
    if (key.includes('bundle') || key.includes('biscuits')) {
      specs.bundle_component = true
    }
    
    // Store any custom properties
    if (key && value && !key.startsWith('_')) {
      specs[key] = value
    }
  })
  
  // Determine product category and task requirements
  const productCategory = determineProductCategory(productName, variantTitle)
  specs.product_category = productCategory
  specs.requires_assembly = productCategory === 'headphone'
  specs.requires_custom_work = !!specs.custom_engraving
  
  return specs
}

function determineProductCategory(productName: string, variantTitle: string): string {
  const name = productName.toLowerCase()
  const variant = variantTitle.toLowerCase()
  
  if (name.includes('headphone') || name.includes('atrium') || name.includes('aeon')) {
    return 'headphone'
  } else if (name.includes('pad') || name.includes('cushion')) {
    return 'accessory'
  } else if (name.includes('cable') || name.includes('cord')) {
    return 'cable'
  } else if (name.includes('amp') || name.includes('dac')) {
    return 'electronics'
  }
  
  return 'other'
}

function getEstimatedHours(taskType: string, productCategory: string, hasCustomWork: boolean): number {
  const baseHours: Record<string, number> = {
    sanding: productCategory === 'headphone' ? 2.0 : 0.5,
    assembly: productCategory === 'headphone' ? 3.0 : 1.0,
    qc: 0.5,
    packaging: 0.3
  }
  
  const hours = baseHours[taskType] || 1.0
  return hasCustomWork ? hours * 1.5 : hours
}

/**
 * Fetch orders from Shopify for manager review
 * Does NOT automatically import into production system
 */
export async function fetchShopifyOrdersForReview() {
  const shopifyClient = await createShopifyClient()
  
  if (!shopifyClient) {
    return { 
      success: false, 
      error: 'Shopify not configured. Please configure in Settings.',
      orders: []
    }
  }
  
  try {
    // Fetch recent orders from Shopify
    const orders = await shopifyClient.getOrders(50) // Get last 50 orders
    
    // Enhance each order with parsed headphone specs
    const enhancedOrders = orders.map(order => ({
      ...order,
      line_items: order.line_items.map(lineItem => ({
        ...lineItem,
        headphone_specs: parseHeadphoneSpecs(lineItem),
        estimated_tasks: getRequiredTasks(
          parseHeadphoneSpecs(lineItem).product_category, 
          parseHeadphoneSpecs(lineItem).requires_custom_work
        )
      }))
    }))
    
    return { 
      success: true, 
      orders: enhancedOrders,
      count: enhancedOrders.length
    }
  } catch (error) {
    console.error('Fetch error:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
      orders: []
    }
  }
}

/**
 * Import selected line items into the production system
 * Creates order_items and work_tasks only for selected items
 */
export async function importSelectedLineItems(selections: {
  orderId: number
  lineItemIds: number[]
}) {
  console.log('importSelectedLineItems called with:', selections)
  
  const shopifyClient = await createShopifyClient()
  const supabase = await createClient()
  
  if (!shopifyClient) {
    console.error('Shopify client not available')
    return { 
      success: false, 
      error: 'Shopify not configured'
    }
  }
  
  const importDetails: string[] = []
  
  try {
    // Get the specific order from Shopify
    console.log('Fetching order from Shopify:', selections.orderId)
    const shopifyOrder = await shopifyClient.getOrder(selections.orderId)
    
    if (!shopifyOrder) {
      console.error('Order not found in Shopify:', selections.orderId)
      return {
        success: false,
        error: 'Order not found in Shopify'
      }
    }
    
    console.log('Found Shopify order:', shopifyOrder.order_number)
    
    // First, ensure the order exists in our system
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
    console.log('Upserting order:', orderData.shopify_order_id)
    const { data: upsertedOrder, error: orderError } = await supabase
      .from('orders')
      .upsert(orderData, {
        onConflict: 'shopify_order_id'
      })
      .select()
      .single()
    
    if (orderError || !upsertedOrder) {
      console.error('Order upsert failed:', orderError)
      return {
        success: false,
        error: `Failed to create order: ${orderError?.message}`
      }
    }
    
    console.log('Order upserted successfully:', upsertedOrder.id)
    
    let itemsCreated = 0
    let tasksCreated = 0
    
    // Process only selected line items
    for (const lineItemId of selections.lineItemIds) {
      const lineItem = shopifyOrder.line_items.find(item => item.id === lineItemId)
      
      if (!lineItem) {
        importDetails.push(`⚠️  Line item ${lineItemId} not found`)
        continue
      }
      
      // Parse headphone specifications
      const headphoneSpecs = parseHeadphoneSpecs(lineItem)
      
      const orderItemData: OrderItemInsert = {
        order_id: upsertedOrder.id,
        shopify_line_item_id: lineItem.id,
        product_name: lineItem.title || 'Unknown Product',
        variant_title: lineItem.variant_title || null,
        quantity: lineItem.quantity || 1,
        price: parseFloat(lineItem.price || '0'),
        sku: lineItem.sku || null,
        product_data: {
          ...lineItem, // Store full line item data
          headphone_specs: headphoneSpecs // Add parsed specifications
        }
      }
      
      // Create order item
      const { data: orderItem, error: itemError } = await supabase
        .from('order_items')
        .upsert(orderItemData, {
          onConflict: 'shopify_line_item_id'
        })
        .select()
        .single()
      
      if (itemError || !orderItem) {
        importDetails.push(`❌ Failed to import ${lineItem.title}: ${itemError?.message}`)
        continue
      }
      
      itemsCreated++
      importDetails.push(`✅ Imported: ${orderItem.product_name} (${headphoneSpecs.product_category})`)
      
      // Create work tasks based on product type
      const taskTypes = getRequiredTasks(headphoneSpecs.product_category, headphoneSpecs.requires_custom_work)
      
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
            stage: taskType, // Set stage as well for v2 compatibility
            task_description: generateTaskDescription(taskType, orderItem.product_name, headphoneSpecs),
            status: 'pending',
            priority: headphoneSpecs.requires_custom_work ? 'high' : 'normal',
            estimated_hours: getEstimatedHours(taskType, headphoneSpecs.product_category, headphoneSpecs.requires_custom_work),
            notes: generateTaskNotes(orderData.order_number, orderItem, headphoneSpecs)
          }
          
          const { error: taskError } = await supabase
            .from('work_tasks')
            .insert(taskData)
          
          if (taskError) {
            importDetails.push(`⚠️  Failed to create ${taskType} task: ${taskError.message}`)
          } else {
            tasksCreated++
          }
        }
      }
    }
    
    importDetails.push(`\n📊 Summary: ${itemsCreated} items imported, ${tasksCreated} tasks created`)
    
    return { 
      success: true, 
      itemsCreated,
      tasksCreated,
      details: importDetails
    }
  } catch (error) {
    console.error('Import error:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
      details: importDetails
    }
  }
}

/**
 * Legacy sync function - now just calls fetchShopifyOrdersForReview
 * @deprecated Use fetchShopifyOrdersForReview and importSelectedLineItems instead
 */
export async function syncShopifyOrders() {
  return await fetchShopifyOrdersForReview()
}

function getRequiredTasks(productCategory: string, hasCustomWork: boolean): string[] {
  const baseTasks: Record<string, string[]> = {
    headphone: ['sanding', 'assembly', 'qc', 'packaging'],
    accessory: ['qc', 'packaging'],
    cable: ['assembly', 'qc', 'packaging'],
    electronics: ['assembly', 'qc', 'packaging'],
    other: ['qc', 'packaging']
  }
  
  return baseTasks[productCategory] || baseTasks.other
}

function generateTaskDescription(taskType: string, productName: string, specs: any): string {
  const descriptions: Record<string, string> = {
    sanding: `Sand and finish ${productName}${specs.material ? ` (${specs.material})` : ''}`,
    assembly: `Assemble ${productName}${specs.custom_engraving ? ' with custom engraving' : ''}`,
    qc: `Quality check ${productName} - verify ${specs.material || 'finish'}, fit, and function`,
    packaging: `Package ${productName} for shipment`
  }
  
  return descriptions[taskType] || `${taskType} for ${productName}`
}

function generateTaskNotes(orderNumber: string, orderItem: any, specs: any): string {
  const notes = [`Order #${orderNumber}`, `Qty: ${orderItem.quantity}`]
  
  if (specs.material) notes.push(`Material: ${specs.material}`)
  if (specs.color) notes.push(`Color: ${specs.color}`)
  if (specs.pad_type) notes.push(`Pads: ${specs.pad_type}`)
  if (specs.cable_type) notes.push(`Cable: ${specs.cable_type}`)
  if (specs.custom_engraving) notes.push(`Engraving: "${specs.custom_engraving}"`)
  if (specs.impedance) notes.push(`Impedance: ${specs.impedance}`)
  
  return notes.join(' | ')
}