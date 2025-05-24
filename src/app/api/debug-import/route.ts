import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  console.log('Debug import called')
  
  try {
    const supabase = await createClient()
    
    // Get an order item without tasks
    const { data: orderItem } = await supabase
      .from('order_items')
      .select(`
        *,
        work_tasks(id)
      `)
      .is('work_tasks.id', null)
      .limit(1)
      .single()
    
    if (!orderItem) {
      return NextResponse.json({ error: 'No order items without tasks found' })
    }
    
    console.log('Found order item:', orderItem.id, orderItem.product_name)
    
    // Parse product data to determine tasks
    const productData = orderItem.product_data as any
    const productName = orderItem.product_name?.toLowerCase() || ''
    
    // Determine product category
    let productCategory = 'other'
    if (productName.includes('headphone') || productName.includes('atticus') || productName.includes('aeon')) {
      productCategory = 'headphone'
    } else if (productName.includes('chassis') || productName.includes('aluminum')) {
      productCategory = 'accessory'
    }
    
    // Define tasks based on category
    const taskTypes = productCategory === 'headphone' 
      ? ['sanding', 'assembly', 'qc', 'packaging']
      : ['qc', 'packaging']
    
    console.log('Creating tasks for category:', productCategory, 'tasks:', taskTypes)
    
    const createdTasks = []
    
    for (const taskType of taskTypes) {
      const { data: task, error } = await supabase
        .from('work_tasks')
        .insert({
          order_item_id: orderItem.id,
          task_type: taskType,
          stage: taskType,
          task_description: `${taskType} - ${orderItem.product_name}`,
          status: 'pending',
          priority: 'normal',
          estimated_hours: taskType === 'assembly' ? 3 : 1,
          notes: `Debug created for order item ${orderItem.id}`
        })
        .select()
        .single()
      
      if (error) {
        console.error('Failed to create task:', taskType, error)
      } else {
        console.log('Created task:', task.id, task.task_description)
        createdTasks.push(task)
      }
    }
    
    return NextResponse.json({
      success: true,
      orderItem: {
        id: orderItem.id,
        name: orderItem.product_name,
        category: productCategory
      },
      tasksCreated: createdTasks.length,
      tasks: createdTasks
    })
    
  } catch (error) {
    console.error('Debug import error:', error)
    return NextResponse.json({ 
      error: 'Debug import failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}