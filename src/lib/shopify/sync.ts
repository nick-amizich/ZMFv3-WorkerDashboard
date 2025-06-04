import { createClient } from '@/lib/supabase/server'
import { createShopifyClient } from './client'
import type { Database } from '@/types/database.types'

type OrderInsert = Database['public']['Tables']['orders']['Insert']
type OrderItemInsert = Database['public']['Tables']['order_items']['Insert']
type WorkTaskInsert = Database['public']['Tables']['work_tasks']['Insert']

// Cache for headphone models to avoid repeated database calls
let cachedHeadphoneModels: string[] | null = null
let cacheTimestamp: number = 0
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

// Helper function to clear the cache (useful when models are updated)
export function clearHeadphoneModelsCache() {
  cachedHeadphoneModels = null
  cacheTimestamp = 0
}

// Helper function to get headphone models from settings
async function getHeadphoneModels(): Promise<string[]> {
  const now = Date.now()
  
  // Return cached models if still valid
  if (cachedHeadphoneModels && (now - cacheTimestamp < CACHE_DURATION)) {
    return cachedHeadphoneModels
  }
  
  try {
    const supabase = await createClient()
    const { data: settings, error } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'headphone_models')
      .single()
    
    if (error && error.code !== 'PGRST116') {
      throw error
    }
    
    // Default models if none exist in settings
    const defaultModels = [
      'Caldera', 'Auteur', 'Atticus', 'Aeon', 'Eikon', 'Aeolus', 'Verite'
    ]
    
    const models = settings?.value as string[] || defaultModels
    
    // Update cache
    cachedHeadphoneModels = models.map(m => m.toLowerCase())
    cacheTimestamp = now
    
    return cachedHeadphoneModels
  } catch (error) {
    console.error('Failed to fetch headphone models, using defaults:', error)
    
    // Fallback to defaults if database fails
    const fallbackModels = [
      'caldera', 'auteur', 'atticus', 'aeon', 'eikon', 'aeolus', 'verite'
    ]
    
    cachedHeadphoneModels = fallbackModels
    cacheTimestamp = now
    
    return fallbackModels
  }
}

// Helper function to parse headphone specifications from variant data
async function parseHeadphoneSpecs(lineItem: any) {
  const variantTitle = lineItem.variant_title || ''
  const productName = lineItem.title || lineItem.name || ''
  const properties = lineItem.properties || []
  
  // Initialize specs object
  const specs: Record<string, any> = {
    wood_type: null,
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

  // First, parse from properties (most reliable for Globo options)
  properties.forEach((prop: any) => {
    const key = prop.name?.toLowerCase() || ''
    const value = prop.value || ''
    
    // Wood type detection (critical for production)
    if (key.includes('wood') || key === 'wood type' || key === 'select-24') {
      specs.wood_type = value
    }
    
    // Chassis/frame material
    if (key.includes('chassis') || key.includes('frame material')) {
      specs.material = value
    }
    
    // Pad types
    if (key.includes('pad') || key.includes('cushion')) {
      specs.pad_type = value
    }
    
    // Cable types  
    if (key.includes('cable') || key.includes('cord')) {
      specs.cable_type = value
    }
    
    // Custom engraving
    if (key.includes('engraving') || key.includes('personalization')) {
      specs.custom_engraving = value
    }
    
    // Bundle detection
    if (key.includes('bundle') || key.includes('biscuits')) {
      specs.bundle_component = true
    }
    
    // Color/finish
    if (key.includes('color') || key.includes('finish')) {
      specs.color = value
    }
    
    // Store any custom properties
    if (key && value && !key.startsWith('_')) {
      specs[key.replace(/\s+/g, '_')] = value
    }
  })
  
  // Fallback: Parse variant title for common headphone attributes if properties didn't capture everything
  const variantParts = variantTitle.split(' / ').map((part: string) => part.trim())
  
  // Common wood types
  const woodTypes = ['Zebra', 'Cocobolo', 'Padauk', 'Cherry', 'Walnut', 'Bocote', 'Maple', 'Oak', 'Mahogany']
  // Common materials
  const materials = ['Aluminum', 'Aluminium', 'Wood', 'Carbon', 'Steel', 'Titanium', 'Plastic']
  const colors = ['Black', 'Silver', 'Natural', 'White', 'Red', 'Blue', 'Gold']
  const padTypes = ['Vegan', 'Leather', 'Velour', 'Cloth', 'Perforated', 'Vented', 'Solid', 'Suede']
  const cableTypes = ['1/4', '3.5mm', 'XLR', 'USB-C', 'Lightning', 'Balanced']
  
  // Parse each part of the variant title
  variantParts.forEach((part: string) => {
    const upperPart = part.toUpperCase()
    
    // Check for wood types first (highest priority)
    if (!specs.wood_type) {
      woodTypes.forEach(wood => {
        if (upperPart.includes(wood.toUpperCase())) {
          specs.wood_type = wood
        }
      })
    }
    
    // Check for materials
    if (!specs.material) {
      materials.forEach(material => {
        if (upperPart.includes(material.toUpperCase())) {
          specs.material = material
        }
      })
    }
    
    // Check for colors
    if (!specs.color) {
      colors.forEach(color => {
        if (upperPart.includes(color.toUpperCase())) {
          specs.color = color
        }
      })
    }
    
    // Check for pad types
    if (!specs.pad_type) {
      padTypes.forEach(padType => {
        if (upperPart.includes(padType.toUpperCase())) {
          specs.pad_type = padType
        }
      })
    }
    
    // Check for cable types
    if (!specs.cable_type) {
      cableTypes.forEach(cableType => {
        if (part.includes(cableType)) {
          specs.cable_type = cableType
        }
      })
    }
    
    // Check for impedance (like "32ohm", "150Ω")
    const impedanceMatch = part.match(/(\d+)\s?(ohm|Ω|ohms)/i)
    if (impedanceMatch && !specs.impedance) {
      specs.impedance = `${impedanceMatch[1]}Ω`
    }
  })
  
  // Determine product category and task requirements
  const productCategory = await determineProductCategory(productName, variantTitle, parseFloat(lineItem.price || '0'))
  specs.product_category = productCategory
  specs.requires_assembly = productCategory === 'headphone'
  specs.requires_custom_work = !!specs.custom_engraving
  
  return specs
}

async function determineProductCategory(productName: string, variantTitle: string, price: number): Promise<string> {
  const name = productName.toLowerCase()
  const variant = variantTitle.toLowerCase()
  
  // If price is $0, it's likely a Globo component
  if (price === 0) {
    return 'component'
  }
  
  // Check for accessories first (more specific patterns)
  if (name.includes('pad') || name.includes('cushion') || 
      name.includes('cable') || name.includes('cord') ||
      name.includes('strap') || name.includes('headband')) {
    return 'accessory'
  }
  
  // Get configured headphone models
  const headphoneModels = await getHeadphoneModels()
  
  // Check for configured headphone models - MADE MORE PERMISSIVE FOR DEBUGGING
  const isHeadphoneModel = headphoneModels.some(model => {
    // Check if it's specifically a headphone, not just contains the model name
    return name.includes(model + ' headphone') || 
           name.includes(model + 'headphone') ||
           (name.includes(model) && name.includes('headphone')) ||
           name === model || // exact match for just the model name
           name.includes(model) // TEMPORARILY: any mention of the model name
  })
  
  // Also check for generic "headphone" but not with accessory keywords
  const isGenericHeadphone = name.includes('headphone') && 
    !name.includes('pad') && !name.includes('cushion') && 
    !name.includes('cable') && !name.includes('strap')
  
  // TEMPORARY: Also check for ZMF products above a certain price as headphones
  const isPricedZMFProduct = name.toLowerCase().includes('zmf') && price > 100
  
  let category = 'other'
  if (isHeadphoneModel || isGenericHeadphone || isPricedZMFProduct) {
    category = 'headphone'
  } else if (name.includes('amp') || name.includes('dac')) {
    category = 'electronics'
  }
  
  console.log(`Product categorization: "${productName}" -> ${category} (price: $${price})`)
  
  return category
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
 * Shows both imported and unimported items with status indicators
 * Supports pagination for large order lists
 */
export async function fetchShopifyOrdersForReview(options: {
  limit?: number
  offset?: number
} = {}) {
  const shopifyClient = await createShopifyClient()
  const supabase = await createClient()
  
  if (!shopifyClient) {
    return { 
      success: false, 
      error: 'Shopify not configured. Please configure in Settings.',
      orders: [],
      pagination: { total: 0, hasMore: false }
    }
  }
  
  try {
    const limit = options.limit || 50 // Increased to get more orders
    const offset = options.offset || 0
    const page = Math.floor(offset / limit) + 1
    
    // Fetch orders from Shopify with pagination
    // Note: We're fetching more than needed since Shopify pagination is cursor-based  
    const orders = await shopifyClient.getOrders(Math.max(limit * 2, 100), page)
    
    console.log(`Fetched ${orders.length} orders from Shopify`)
    
    // Get all imported Shopify order IDs and line item IDs
    const { data: importedOrders } = await supabase
      .from('orders')
      .select('shopify_order_id')
    
    const { data: importedLineItems } = await supabase
      .from('order_items')
      .select('shopify_line_item_id')
      .not('shopify_line_item_id', 'is', null)
    
    const importedOrderIds = new Set(importedOrders?.map(o => o.shopify_order_id) || [])
    const importedLineItemIds = new Set(importedLineItems?.map(i => i.shopify_line_item_id) || [])
    
    // Filter and enhance orders - now showing both imported and unimported
    const enhancedOrders = []
    const paginatedOrders = orders.slice(0, limit) // Apply pagination limit
    const hasMore = orders.length > limit
    
    for (const order of paginatedOrders) {
      // Process ALL line items, not just unimported ones
      const allLineItems = order.line_items
      const unimportedLineItems = allLineItems.filter(item => !importedLineItemIds.has(item.id))
      const importedLineItems = allLineItems.filter(item => importedLineItemIds.has(item.id))
      
      // Calculate import status for the order
      const totalItems = allLineItems.length
      const importedCount = importedLineItems.length
      const unimportedCount = unimportedLineItems.length
      
      let importStatus: 'not_imported' | 'partially_imported' | 'fully_imported' = 'not_imported'
      if (importedCount === 0) {
        importStatus = 'not_imported'
      } else if (importedCount === totalItems) {
        importStatus = 'fully_imported'
      } else {
        importStatus = 'partially_imported'
      }
      
      // Categorize ALL line items (both imported and unimported) into main items and extras
      const categorizedItems = {
        mainItems: [] as any[],
        extraItems: [] as any[]
      }
      
      // Process each line item sequentially to handle async parseHeadphoneSpecs
      for (const lineItem of allLineItems) {
        const headphoneSpecs = await parseHeadphoneSpecs(lineItem)
        const price = parseFloat(lineItem.price || '0')
        const isImported = importedLineItemIds.has(lineItem.id)
        
        const enhancedLineItem = {
          ...lineItem,
          headphone_specs: headphoneSpecs,
          estimated_tasks: getRequiredTasks(headphoneSpecs.product_category, headphoneSpecs.requires_custom_work),
          import_status: isImported ? 'imported' : 'not_imported',
          can_be_selected: !isImported // Only unimported items can be selected for new batches
        }
        
        // Main items: Headphones with price > 0
        if (headphoneSpecs.product_category === 'headphone' && price > 0) {
          categorizedItems.mainItems.push(enhancedLineItem)
        } else {
          // Extras: $0 Globo components, accessories, cables, etc.
          categorizedItems.extraItems.push(enhancedLineItem)
        }
      }
      
      // Only skip orders that have NO main items at all (imported or unimported)
      // TEMPORARILY DISABLED for debugging - let's see all orders
      if (categorizedItems.mainItems.length === 0) {
        console.log(`Order ${order.order_number} has no main items (headphones), but showing anyway for debugging`)
        // continue // COMMENTED OUT FOR DEBUGGING
      }
      
      // Create legacy line_items for backwards compatibility - include ALL items
      const legacyLineItems = []
      for (const lineItem of allLineItems) {
        const headphoneSpecs = await parseHeadphoneSpecs(lineItem)
        const isImported = importedLineItemIds.has(lineItem.id)
        
        legacyLineItems.push({
          ...lineItem,
          headphone_specs: headphoneSpecs,
          estimated_tasks: getRequiredTasks(headphoneSpecs.product_category, headphoneSpecs.requires_custom_work),
          import_status: isImported ? 'imported' : 'not_imported',
          can_be_selected: !isImported
        })
      }
      
      enhancedOrders.push({
        ...order,
        import_status: importStatus,
        _import_status: {
          status: importStatus,
          has_imported_items: importedCount > 0,
          imported_count: importedCount,
          unimported_count: unimportedCount,
          total_count: totalItems,
          all_imported: importStatus === 'fully_imported',
          partially_imported: importStatus === 'partially_imported'
        },
        main_items: categorizedItems.mainItems,
        extra_items: categorizedItems.extraItems,
        // Legacy support - keep original line_items for backwards compatibility
        line_items: legacyLineItems
      })
    }
    
    console.log(`Returning ${enhancedOrders.length} enhanced orders out of ${orders.length} total fetched`)
    
    return { 
      success: true, 
      orders: enhancedOrders,
      count: enhancedOrders.length,
      pagination: {
        total: orders.length,
        limit,
        offset,
        hasMore,
        currentPage: Math.floor(offset / limit) + 1,
        totalPages: Math.ceil(orders.length / limit)
      }
    }
  } catch (error) {
    console.error('Fetch error:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
      orders: [],
      pagination: { total: 0, limit: 0, offset: 0, hasMore: false, currentPage: 1, totalPages: 0 }
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
    const createdOrderItems: any[] = []
    
    // Process only selected line items
    for (const lineItemId of selections.lineItemIds) {
      const lineItem = shopifyOrder.line_items.find(item => item.id === lineItemId)
      
      if (!lineItem) {
        importDetails.push(`⚠️  Line item ${lineItemId} not found`)
        continue
      }
      
      // Parse headphone specifications
      const headphoneSpecs = await parseHeadphoneSpecs(lineItem)
      
      // Skip creating tasks for $0 Globo components (they're just specs for the main product)
      const price = parseFloat(lineItem.price || '0')
      if (price === 0 && headphoneSpecs.product_category === 'component') {
        importDetails.push(`ℹ️  Skipped component: ${lineItem.title} (specifications only)`)
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
      createdOrderItems.push(orderItem)
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
          .maybeSingle()
        
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
      orderItems: createdOrderItems,
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