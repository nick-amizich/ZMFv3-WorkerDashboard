const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function testLocationSetup() {
  console.log('🔍 Testing location setup...\n')

  try {
    // Test 1: Check if locations table exists and has data
    console.log('1️⃣ Checking locations table...')
    const { data: locations, error: locError } = await supabase
      .from('locations')
      .select('*')
    
    if (locError) {
      console.error('❌ Error fetching locations:', locError.message)
      return
    }
    
    console.log('✅ Locations found:', locations.length)
    locations.forEach(loc => {
      console.log(`   - ${loc.name} (${loc.code})`)
    })

    // Test 2: Check if workers table has location field
    console.log('\n2️⃣ Checking workers table location field...')
    const { data: workers, error: workersError } = await supabase
      .from('workers')
      .select('id, name, primary_location')
      .limit(5)
    
    if (workersError) {
      console.error('❌ Error fetching workers:', workersError.message)
    } else {
      console.log('✅ Workers with location field:')
      workers.forEach(w => {
        console.log(`   - ${w.name}: ${w.primary_location || 'not set'}`)
      })
    }

    // Test 3: Check location production status view
    console.log('\n3️⃣ Checking location production status view...')
    const { data: prodStatus, error: prodError } = await supabase
      .from('location_production_status')
      .select('*')
    
    if (prodError) {
      console.error('❌ Error fetching production status:', prodError.message)
    } else {
      console.log('✅ Production status by location:')
      prodStatus.forEach(status => {
        console.log(`   - ${status.location_name}:`)
        console.log(`     Active Tasks: ${status.active_tasks}`)
        console.log(`     In Progress: ${status.in_progress_tasks}`)
        console.log(`     Active Workers: ${status.active_workers}`)
      })
    }

    // Test 4: Check if facility_transfers table exists
    console.log('\n4️⃣ Checking facility_transfers table...')
    const { data: transfers, error: transferError } = await supabase
      .from('facility_transfers')
      .select('*')
      .limit(1)
    
    if (transferError) {
      console.error('❌ Error accessing facility_transfers:', transferError.message)
    } else {
      console.log('✅ Facility transfers table accessible')
    }

    console.log('\n✨ Location setup test completed!')

  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

// Run the test
testLocationSetup()