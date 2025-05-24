// Script to create test data for the worker dashboard
// Run with: node scripts/create-test-data.js

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function createTestData() {
  console.log('🚀 Creating test data...')
  
  try {
    // 1. Create test workers if they don't exist
    const testWorkers = [
      { name: 'John Smith', email: 'john@example.com', role: 'worker', skills: ['sanding', 'assembly'] },
      { name: 'Jane Doe', email: 'jane@example.com', role: 'worker', skills: ['assembly', 'qc'] },
      { name: 'Bob Wilson', email: 'bob@example.com', role: 'worker', skills: ['qc', 'packaging'] },
      { name: 'Manager Mike', email: 'manager@example.com', role: 'manager', skills: [] }
    ]
    
    console.log('Creating workers...')
    for (const worker of testWorkers) {
      const { data: existingWorker } = await supabase
        .from('workers')
        .select('id')
        .eq('email', worker.email)
        .single()
      
      if (!existingWorker) {
        const { error } = await supabase
          .from('workers')
          .insert(worker)
        
        if (error) {
          console.error(`Failed to create worker ${worker.name}:`, error)
        } else {
          console.log(`✅ Created worker: ${worker.name}`)
        }
      }
    }
    
    // 2. Create test orders with items
    const testOrders = [
      {
        shopify_order_id: 90001,
        order_number: 'TEST-001',
        customer_name: 'Test Customer 1',
        customer_email: 'customer1@test.com',
        total_price: 1299.00,
        order_date: new Date().toISOString(),
        status: 'pending',
        raw_data: {}
      },
      {
        shopify_order_id: 90002,
        order_number: 'TEST-002',
        customer_name: 'Test Customer 2',
        customer_email: 'customer2@test.com',
        total_price: 899.00,
        order_date: new Date().toISOString(),
        status: 'pending',
        raw_data: {}
      }
    ]
    
    console.log('\nCreating orders...')
    for (const order of testOrders) {
      const { data: createdOrder, error } = await supabase
        .from('orders')
        .upsert(order, { onConflict: 'shopify_order_id' })
        .select()
        .single()
      
      if (error) {
        console.error(`Failed to create order ${order.order_number}:`, error)
        continue
      }
      
      console.log(`✅ Created order: ${order.order_number}`)
      
      // Create order items
      const orderItems = order.order_number === 'TEST-001' ? [
        {
          order_id: createdOrder.id,
          shopify_line_item_id: 900011,
          product_name: 'ZMF Auteur - Walnut',
          variant_title: 'Walnut / Vegan Pads / 1/4" Cable',
          quantity: 1,
          price: 1299.00,
          sku: 'ZMF-AUT-WAL',
          product_data: {
            headphone_specs: {
              product_category: 'headphone',
              material: 'Walnut',
              pad_type: 'Vegan',
              cable_type: '1/4"',
              requires_custom_work: false
            }
          }
        }
      ] : [
        {
          order_id: createdOrder.id,
          shopify_line_item_id: 900021,
          product_name: 'ZMF Verite Closed - Ebony',
          variant_title: 'Ebony / Leather Pads / XLR Cable',
          quantity: 1,
          price: 899.00,
          sku: 'ZMF-VER-EBO',
          product_data: {
            headphone_specs: {
              product_category: 'headphone',
              material: 'Ebony',
              pad_type: 'Leather',
              cable_type: 'XLR',
              requires_custom_work: true,
              custom_engraving: 'Happy Birthday!'
            }
          }
        }
      ]
      
      for (const item of orderItems) {
        const { data: createdItem, error: itemError } = await supabase
          .from('order_items')
          .upsert(item, { onConflict: 'shopify_line_item_id' })
          .select()
          .single()
        
        if (itemError) {
          console.error(`Failed to create item:`, itemError)
          continue
        }
        
        console.log(`  ✅ Created item: ${item.product_name}`)
        
        // Create tasks for the item
        const taskTypes = ['sanding', 'assembly', 'qc', 'packaging']
        for (const taskType of taskTypes) {
          const { error: taskError } = await supabase
            .from('work_tasks')
            .insert({
              order_item_id: createdItem.id,
              task_type: taskType,
              task_description: `${taskType} for ${item.product_name}`,
              status: 'pending',
              priority: item.product_data.headphone_specs.requires_custom_work ? 'high' : 'normal',
              estimated_hours: taskType === 'assembly' ? 4 : 2,
              notes: `Order #${order.order_number} | ${item.variant_title}`
            })
          
          if (taskError) {
            console.error(`Failed to create ${taskType} task:`, taskError)
          } else {
            console.log(`    ✅ Created ${taskType} task`)
          }
        }
      }
    }
    
    // 3. Create a test batch
    console.log('\nCreating test batch...')
    const { data: workflow } = await supabase
      .from('workflow_templates')
      .select('id')
      .eq('is_default', true)
      .single()
    
    if (workflow) {
      const { data: orderItems } = await supabase
        .from('order_items')
        .select('id')
        .limit(2)
      
      if (orderItems && orderItems.length > 0) {
        const { error: batchError } = await supabase
          .from('work_batches')
          .insert({
            name: 'Test Batch - Walnut Headphones',
            batch_type: 'model',
            criteria: { model: 'Auteur', wood_type: 'Walnut' },
            order_item_ids: orderItems.map(item => item.id),
            workflow_template_id: workflow.id,
            current_stage: 'sanding',
            status: 'active'
          })
        
        if (batchError) {
          console.error('Failed to create batch:', batchError)
        } else {
          console.log('✅ Created test batch')
        }
      }
    }
    
    console.log('\n✨ Test data creation complete!')
    console.log('\nYou should now see:')
    console.log('- Tasks in the Task Assignment page')
    console.log('- Orders in the Orders page')
    console.log('- Workers in the Workers page')
    console.log('- A workflow in the Workflows page')
    console.log('\nTry importing orders from the Import page to create more tasks!')
    
  } catch (error) {
    console.error('Error creating test data:', error)
  }
}

createTestData()