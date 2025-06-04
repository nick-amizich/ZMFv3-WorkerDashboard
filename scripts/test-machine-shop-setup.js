const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function testMachineShopSetup() {
  console.log('🔍 Testing machine shop setup...\n')

  try {
    // Test 1: Check if parts_catalog table exists
    console.log('1️⃣ Checking parts_catalog table...')
    const { data: parts, error: partsError } = await supabase
      .from('parts_catalog')
      .select('*')
      .limit(1)
    
    if (partsError) {
      console.error('❌ Error accessing parts_catalog:', partsError.message)
    } else {
      console.log('✅ Parts catalog table accessible')
    }

    // Test 2: Check if machines table exists
    console.log('\n2️⃣ Checking machines table...')
    const { data: machines, error: machinesError } = await supabase
      .from('machines')
      .select('*')
      .limit(1)
    
    if (machinesError) {
      console.error('❌ Error accessing machines:', machinesError.message)
    } else {
      console.log('✅ Machines table accessible')
    }

    // Test 3: Check if wood_inventory table exists
    console.log('\n3️⃣ Checking wood_inventory table...')
    const { data: inventory, error: inventoryError } = await supabase
      .from('wood_inventory')
      .select('*')
      .limit(1)
    
    if (inventoryError) {
      console.error('❌ Error accessing wood_inventory:', inventoryError.message)
    } else {
      console.log('✅ Wood inventory table accessible')
    }

    // Test 4: Check if production_requests table exists
    console.log('\n4️⃣ Checking production_requests table...')
    const { data: requests, error: requestsError } = await supabase
      .from('production_requests')
      .select('*')
      .limit(1)
    
    if (requestsError) {
      console.error('❌ Error accessing production_requests:', requestsError.message)
    } else {
      console.log('✅ Production requests table accessible')
    }

    // Test 5: Check production_overview view
    console.log('\n5️⃣ Checking production_overview view...')
    const { data: overview, error: overviewError } = await supabase
      .from('production_overview')
      .select('*')
      .limit(1)
    
    if (overviewError) {
      console.error('❌ Error accessing production_overview:', overviewError.message)
    } else {
      console.log('✅ Production overview view accessible')
    }

    // Test 6: Check inventory_status view
    console.log('\n6️⃣ Checking inventory_status view...')
    const { data: invStatus, error: invStatusError } = await supabase
      .from('inventory_status')
      .select('*')
      .limit(1)
    
    if (invStatusError) {
      console.error('❌ Error accessing inventory_status:', invStatusError.message)
    } else {
      console.log('✅ Inventory status view accessible')
    }

    console.log('\n✨ Machine shop setup test completed!')
    console.log('\nNext steps:')
    console.log('1. Run the app with: npm run dev')
    console.log('2. Navigate to /south to see the machine shop dashboard')
    console.log('3. Start adding parts, materials, and production requests')

  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

// Run the test
testMachineShopSetup()