import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Validate employee status
    const { data: employee } = await supabase
      .from('employees')
      .select('id, role, active')
      .eq('auth_user_id', user.id)
      .single()
    
    if (!employee?.active) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    // Get query parameters
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const grade = searchParams.get('grade')
    const model = searchParams.get('model')
    const woodType = searchParams.get('wood_type')
    
    // Build query
    let query = supabase
      .from('component_tracking')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)
    
    if (grade) {
      query = query.eq('grade', grade)
    }
    
    if (model) {
      query = query.ilike('specifications->model', `%${model}%`)
    }
    
    if (woodType) {
      query = query.ilike('specifications->wood_type', `%${woodType}%`)
    }
    
    const { data: components, error } = await query
    
    if (error) throw error
    
    return NextResponse.json(components || [])
    
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Create new component tracking record
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Only managers can create component records
    const { data: employee } = await supabase
      .from('employees')
      .select('id, role, active')
      .eq('auth_user_id', user.id)
      .single()
    
    if (!employee?.active || !['manager', 'supervisor'].includes(employee.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    const body = await request.json()
    const { 
      grade,
      wood_batch_id,
      source_tracking,
      specifications
    } = body
    
    // Validate required fields
    if (!grade || !specifications?.model || !specifications?.wood_type) {
      return NextResponse.json({ 
        error: 'Missing required fields' 
      }, { status: 400 })
    }
    
    // Generate unique serial numbers using the function
    const { data: leftSerial } = await supabase
      .rpc('generate_serial_number', { 
        model: specifications.model 
      })
    
    const { data: rightSerial } = await supabase
      .rpc('generate_serial_number', { 
        model: specifications.model 
      })
    
    // Create component tracking record
    const { data: component, error } = await supabase
      .from('component_tracking')
      .insert({
        cup_pair_id: crypto.randomUUID(),
        left_cup_serial: leftSerial || `L-${Date.now()}`,
        right_cup_serial: rightSerial || `R-${Date.now()}`,
        grade,
        wood_batch_id,
        source_tracking: source_tracking || {},
        specifications,
        journey: [],
        final_metrics: {}
      })
      .select()
      .single()
    
    if (error) throw error
    
    return NextResponse.json({ 
      success: true,
      component 
    }, { status: 201 })
    
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}