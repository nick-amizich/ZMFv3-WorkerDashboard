import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Get all order items without tasks
    const { data: orderItems, error: fetchError } = await supabase
      .from('order_items')
      .select(`
        *,
        order:orders(order_number),
        work_tasks(id)
      `)
      .order('created_at', { ascending: false })
    
    if (fetchError) {
      return NextResponse.json({ error: 'Failed to fetch order items' }, { status: 500 })
    }
    
    // Filter items without tasks
    const itemsWithoutTasks = orderItems?.filter(item => 
      !item.work_tasks || item.work_tasks.length === 0
    ) || []
    
    
    let totalTasksCreated = 0
    const results = []
    
    for (const item of itemsWithoutTasks) {
      const productName = item.product_name?.toLowerCase() || ''
      const productData = item.product_data as any
      
      // Determine product category
      let productCategory = 'other'
      if (productName.includes('headphone') || productName.includes('atticus') || 
          productName.includes('aeon') || productName.includes('aeolus')) {
        productCategory = 'headphone'
      } else if (productName.includes('chassis') || productName.includes('aluminum') ||
                 productName.includes('magnesium')) {
        productCategory = 'accessory'
      } else if (productName.includes('cable')) {
        productCategory = 'cable'
      }
      
      // Define tasks based on category
      const taskTypes = productCategory === 'headphone' 
        ? ['sanding', 'assembly', 'qc', 'packaging']
        : productCategory === 'cable'
        ? ['assembly', 'qc', 'packaging']
        : ['qc', 'packaging']
      
      
      for (const taskType of taskTypes) {
        const taskData = {
          order_item_id: item.id,
          task_type: taskType,
          stage: taskType,
          task_description: `${taskType.charAt(0).toUpperCase() + taskType.slice(1)} ${item.product_name}${item.variant_title ? ' - ' + item.variant_title : ''}`,
          status: 'pending',
          priority: 'normal',
          estimated_hours: getEstimatedHours(taskType, productCategory),
          notes: `Order #${item.order?.order_number} | Qty: ${item.quantity}`
        }
        
        const { error: insertError } = await supabase
          .from('work_tasks')
          .insert(taskData)
        
        if (insertError) {
          console.error(`Failed to create ${taskType} task for item ${item.id}:`, insertError)
        } else {
          totalTasksCreated++
        }
      }
      
      results.push({
        item: item.product_name,
        category: productCategory,
        tasksCreated: taskTypes.length
      })
    }
    
    return NextResponse.json({
      success: true,
      itemsProcessed: itemsWithoutTasks.length,
      totalTasksCreated,
      results
    })
    
  } catch (error) {
    console.error('Fix missing tasks error:', error)
    return NextResponse.json({ 
      error: 'Failed to fix missing tasks',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

function getEstimatedHours(taskType: string, productCategory: string): number {
  const baseHours: Record<string, number> = {
    sanding: productCategory === 'headphone' ? 2.0 : 0.5,
    assembly: productCategory === 'headphone' ? 3.0 : 1.0,
    qc: 0.5,
    packaging: 0.3
  }
  
  return baseHours[taskType] || 1.0
}