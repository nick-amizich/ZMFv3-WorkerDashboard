import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function populateMachineShopData() {
  console.log('🔧 Populating machine shop data...')

  try {
    // First, ensure the South location exists
    console.log('📍 Checking for South location...')
    let { data: locations } = await supabase
      .from('locations')
      .select('id, name')
    
    let southLocation = locations?.find(l => l.name === 'south')
    
    if (!southLocation) {
      console.log('Creating South location...')
      const { data: newLocation, error: locationError } = await supabase
        .from('locations')
        .insert({
          name: 'south',
          display_name: 'South Machine Shop',
          address: '456 Industrial Blvd',
          city: 'Chicago',
          state: 'IL',
          zip: '60602',
          country: 'USA',
          is_active: true,
          capabilities: ['cnc_machining', 'wood_working', 'custom_parts']
        })
        .select()
        .single()
      
      if (locationError) {
        console.error('Error creating South location:', locationError)
        return
      }
      
      southLocation = newLocation
      console.log('✅ Created South location')
    }

    // Get location IDs
    ({ data: locations } = await supabase
      .from('locations')
      .select('id, name'))
    
    southLocation = locations?.find(l => l.name === 'south')
    if (!southLocation) {
      console.error('South location not found!')
      console.log('Available locations:', locations)
      return
    }

    // 1. Add sample parts to catalog
    console.log('📦 Adding parts catalog...')
    const parts = [
      {
        part_name: 'ZMF Auteur Cup',
        part_type: 'cup',
        species: 'African Blackwood',
        specifications: 'OD: 110mm, Height: 30-40mm',
        is_active: true,
        material_cost: 150,
        estimated_labor_hours: 4
      },
      {
        part_name: 'ZMF Verite Cup',
        part_type: 'cup',
        species: 'Padauk',
        specifications: 'OD: 105mm, Height: 28-38mm',
        is_active: true,
        material_cost: 80,
        estimated_labor_hours: 3.5
      },
      {
        part_name: 'ZMF Aeolus Baffle',
        part_type: 'baffle',
        species: 'Cherry',
        specifications: 'OD: 100mm, Thickness: 10-15mm',
        is_active: true,
        material_cost: 40,
        estimated_labor_hours: 2
      },
      {
        part_name: 'ZMF Caldera Cup',
        part_type: 'cup',
        species: 'Walnut',
        specifications: 'OD: 108mm, Height: 32-42mm',
        is_active: true,
        material_cost: 60,
        estimated_labor_hours: 4
      }
    ]

    const { data: insertedParts, error: partsError } = await supabase
      .from('parts_catalog')
      .insert(parts)
      .select()
    
    if (partsError) {
      console.error('Error inserting parts:', partsError)
    } else {
      console.log(`✅ Inserted ${insertedParts.length} parts`)
    }

    // 2. Add wood inventory
    console.log('🌳 Adding wood inventory...')
    const woodInventory = [
      {
        species: 'African Blackwood',
        quantity_in_stock: 25,
        minimum_stock: 10,
        unit_cost: 150,
        supplier: 'Premium Wood Co',
        notes: 'Premium grade for flagship models'
      },
      {
        species: 'Padauk',
        quantity_in_stock: 40,
        minimum_stock: 15,
        unit_cost: 80,
        supplier: 'Exotic Woods Inc',
        notes: 'Vibrant orange color'
      },
      {
        species: 'Walnut',
        quantity_in_stock: 60,
        minimum_stock: 20,
        unit_cost: 60,
        supplier: 'Local Lumber',
        notes: 'Standard grade'
      },
      {
        species: 'Cocobolo',
        quantity_in_stock: 8,
        minimum_stock: 5,
        unit_cost: 200,
        supplier: 'Rare Woods Ltd',
        notes: 'Limited stock - premium grade'
      },
      {
        species: 'Cherry',
        quantity_in_stock: 100,
        minimum_stock: 30,
        unit_cost: 40,
        supplier: 'Local Lumber',
        notes: 'For baffle production'
      }
    ]

    const { data: insertedWood, error: woodError } = await supabase
      .from('wood_inventory')
      .insert(woodInventory)
      .select()
    
    if (woodError) {
      console.error('Error inserting wood inventory:', woodError)
    } else {
      console.log(`✅ Inserted ${insertedWood.length} wood inventory items`)
    }

    // 3. Add machines
    console.log('🏭 Adding machines...')
    const machines = [
      {
        machine_name: 'Haas VF-2SS',
        machine_type: 'CNC Mill',
        serial_number: 'VF2SS-1234',
        status: 'operational',
        notes: 'Primary production mill'
      },
      {
        machine_name: 'Haas ST-10',
        machine_type: 'CNC Lathe',
        serial_number: 'ST10-5678',
        status: 'operational',
        notes: 'For turning operations'
      },
      {
        machine_name: 'DMG Mori NLX 2500',
        machine_type: 'CNC Lathe',
        serial_number: 'NLX-9012',
        status: 'operational',
        notes: 'High precision turning'
      },
      {
        machine_name: 'Haas UMC-750',
        machine_type: '5-Axis Mill',
        serial_number: 'UMC-3456',
        status: 'maintenance',
        last_maintenance: new Date('2024-01-15').toISOString(),
        next_maintenance_due: new Date('2024-07-15').toISOString(),
        notes: 'Complex geometry capabilities'
      }
    ]

    const { data: insertedMachines, error: machinesError } = await supabase
      .from('machines')
      .insert(machines)
      .select()
    
    if (machinesError) {
      console.error('Error inserting machines:', machinesError)
    } else {
      console.log(`✅ Inserted ${insertedMachines.length} machines`)
    }

    // 4. Add production requests
    console.log('📋 Adding production requests...')
    const productionRequests = [
      {
        customer_name: 'John Smith',
        part_id: insertedParts?.[0]?.id,
        quantity_ordered: 2,
        quantity_completed: 0,
        status: 'pending',
        priority: 'high',
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        unit_price: 450,
        notes: 'Rush order - customer traveling next week'
      },
      {
        customer_name: 'Sarah Johnson',
        part_id: insertedParts?.[1]?.id,
        quantity_ordered: 1,
        quantity_completed: 0,
        status: 'in_production',
        priority: 'normal',
        due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        unit_price: 400,
        notes: 'Matched grain pattern requested'
      },
      {
        customer_name: 'Audio Store Inc',
        part_id: insertedParts?.[3]?.id,
        quantity_ordered: 10,
        quantity_completed: 4,
        status: 'in_production',
        priority: 'normal',
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        unit_price: 380,
        notes: 'Bulk order for retail'
      }
    ]

    const { data: insertedRequests, error: requestsError } = await supabase
      .from('production_requests')
      .insert(productionRequests)
      .select()
    
    if (requestsError) {
      console.error('Error inserting production requests:', requestsError)
    } else {
      console.log(`✅ Inserted ${insertedRequests.length} production requests`)
    }

    // 5. Add some daily production records
    console.log('📊 Adding daily production records...')
    const { data: workers } = await supabase
      .from('workers')
      .select('auth_user_id')
      .eq('is_active', true)
      .limit(1)

    if (workers && workers.length > 0) {
      const dailyProduction = [
        {
          production_request_id: insertedRequests?.[1]?.id,
          quantity_produced: 1,
          manufacturing_date: new Date().toISOString().split('T')[0],
          operator_id: workers[0].auth_user_id,
          machine_id: insertedMachines?.[0]?.id,
          shift: 'day',
          production_time_hours: 4.5,
          scrap_count: 0,
          qc_status: 'passed',
          notes: 'First article inspection passed'
        }
      ]

      const { error: productionError } = await supabase
        .from('daily_production')
        .insert(dailyProduction)
      
      if (productionError) {
        console.error('Error inserting daily production:', productionError)
      } else {
        console.log('✅ Inserted daily production record')
      }
    }

    console.log('\n🎉 Machine shop data population complete!')
    
  } catch (error) {
    console.error('Error populating data:', error)
  }
}

// Run the population
populateMachineShopData()