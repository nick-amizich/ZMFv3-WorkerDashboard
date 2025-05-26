import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // ALWAYS validate employee status
    const { data: worker } = await supabase
      .from('workers')
      .select('role, is_active')
      .eq('auth_user_id', user.id)
      .single()
    
    if (!worker?.is_active) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    const searchParams = request.nextUrl.searchParams
    const cupPairId = searchParams.get('cup_pair_id')
    const grade = searchParams.get('grade')
    const serialNumber = searchParams.get('serial')
    
    let query = supabase
      .from('component_tracking')
      .select(`
        *,
        current_task:work_tasks(
          id,
          stage,
          status,
          assigned_to:workers(name)
        )
      `)
      .order('created_at', { ascending: false })
    
    if (cupPairId) {
      query = query.eq('cup_pair_id', cupPairId)
    }
    
    if (grade) {
      query = query.eq('grade', grade)
    }
    
    if (serialNumber) {
      query = query.or(`left_cup_serial.eq.${serialNumber},right_cup_serial.eq.${serialNumber}`)
    }
    
    const { data: components, error: fetchError } = await query
    
    if (fetchError) {
      console.error('Error fetching components:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch components' }, { status: 500 })
    }
    
    return NextResponse.json({ components })
    
  } catch (error) {
    console.error('Component Tracking API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { data: worker } = await supabase
      .from('workers')
      .select('id, role, is_active')
      .eq('auth_user_id', user.id)
      .single()
    
    if (!worker?.is_active || !['manager', 'supervisor'].includes(worker.role || '')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    const body = await request.json()
    const {
      order_item_id,
      model,
      wood_type,
      finish_type,
      grade,
      wood_batch_id,
      source_tracking,
      custom_requirements = []
    } = body
    
    // Generate serial numbers
    const { data: leftSerial } = await supabase
      .rpc('generate_serial_number', { model })
    
    const { data: rightSerial } = await supabase  
      .rpc('generate_serial_number', { model })
    
    // Create component tracking record
    const { data: component, error: createError } = await supabase
      .from('component_tracking')
      .insert({
        cup_pair_id: crypto.randomUUID(),
        left_cup_serial: leftSerial,
        right_cup_serial: rightSerial,
        grade,
        wood_batch_id,
        source_tracking,
        specifications: {
          model,
          wood_type,
          finish_type,
          customer_order_id: order_item_id,
          custom_requirements
        },
        journey: [{
          stage: 'created',
          worker: worker.id,
          timestamp: new Date().toISOString(),
          duration_minutes: 0,
          checks_passed: [],
          issues: [],
          photos: []
        }]
      })
      .select()
      .single()
    
    if (createError) {
      console.error('Error creating component:', createError)
      return NextResponse.json({ error: 'Failed to create component' }, { status: 500 })
    }
    
    return NextResponse.json({ component })
    
  } catch (error) {
    console.error('Component Creation Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}