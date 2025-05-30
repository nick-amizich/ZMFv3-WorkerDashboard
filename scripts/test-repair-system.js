import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function testRepairSystem() {
  console.log('🔧 Testing Repair System...\n')

  try {
    // 1. Check if repair tables exist
    console.log('1️⃣ Checking repair tables...')
    const tables = [
      'repair_orders',
      'repair_issues', 
      'repair_actions',
      'repair_photos',
      'repair_knowledge_base'
    ]

    for (const table of tables) {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true })

      if (error) {
        console.error(`❌ Table ${table} not found:`, error.message)
      } else {
        console.log(`✅ Table ${table} exists (${count} rows)`)
      }
    }

    // 2. Check repair number generation
    console.log('\n2️⃣ Testing repair number generation...')
    const { data: funcTest, error: funcError } = await supabase
      .rpc('generate_repair_number')

    if (funcError) {
      console.error('❌ Repair number generation failed:', funcError.message)
    } else {
      console.log(`✅ Generated repair number: ${funcTest}`)
    }

    // 3. Test creating a repair order
    console.log('\n3️⃣ Testing repair order creation...')
    
    // Get a test employee
    const { data: employee } = await supabase
      .from('employees')
      .select('id')
      .eq('active', true)
      .limit(1)
      .single()

    if (!employee) {
      console.error('❌ No active employees found')
      return
    }

    const testRepair = {
      repair_source: 'customer',
      order_type: 'warranty',
      original_order_number: 'TEST-12345',
      customer_name: 'Test Customer',
      customer_email: 'test@example.com',
      customer_phone: '555-0123',
      headphone_model: 'Verite Closed',
      serial_number: 'VC-TEST-001',
      wood_type: 'Sapele',
      priority: 'standard',
      repair_type: 'production',
      customer_note: 'This is a test repair order',
      assigned_employee_id: employee.id
    }

    const { data: repair, error: repairError } = await supabase
      .from('repair_orders')
      .insert(testRepair)
      .select()
      .single()

    if (repairError) {
      console.error('❌ Failed to create repair:', repairError.message)
    } else {
      console.log(`✅ Created repair: ${repair.repair_number}`)

      // 4. Test adding an issue
      console.log('\n4️⃣ Testing issue creation...')
      const { data: issue, error: issueError } = await supabase
        .from('repair_issues')
        .insert({
          repair_order_id: repair.id,
          category: 'driver',
          specific_issue: 'Test issue - driver cutting out',
          severity: 'functional'
        })
        .select()
        .single()

      if (issueError) {
        console.error('❌ Failed to create issue:', issueError.message)
      } else {
        console.log('✅ Created issue successfully')
      }

      // 5. Test adding an action
      console.log('\n5️⃣ Testing action creation...')
      const { data: action, error: actionError } = await supabase
        .from('repair_actions')
        .insert({
          repair_order_id: repair.id,
          action_type: 'diagnosis',
          action_description: 'Test diagnosis - found loose connection',
          technician_name: 'Test Tech',
          completed_at: new Date().toISOString()
        })
        .select()
        .single()

      if (actionError) {
        console.error('❌ Failed to create action:', actionError.message)
      } else {
        console.log('✅ Created action successfully')
      }

      // 6. Clean up test data
      console.log('\n6️⃣ Cleaning up test data...')
      await supabase.from('repair_actions').delete().eq('repair_order_id', repair.id)
      await supabase.from('repair_issues').delete().eq('repair_order_id', repair.id)
      await supabase.from('repair_orders').delete().eq('id', repair.id)
      console.log('✅ Test data cleaned up')
    }

    console.log('\n✨ Repair system test complete!')

  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

testRepairSystem()