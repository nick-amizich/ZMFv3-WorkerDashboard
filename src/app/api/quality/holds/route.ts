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
    const status = searchParams.get('status')
    const severity = searchParams.get('severity')
    const search = searchParams.get('search')
    
    // Build query
    let query = supabase
      .from('quality_holds')
      .select(`
        *,
        batch:work_batches(
          id,
          name,
          current_stage,
          items_count
        ),
        component:component_tracking(
          id,
          left_cup_serial,
          right_cup_serial,
          specifications
        ),
        reporter:employees!quality_holds_reported_by_fkey(
          id,
          name
        ),
        assignee:employees!quality_holds_assigned_to_fkey(
          id,
          name
        )
      `)
      .order('created_at', { ascending: false })
    
    if (status && status !== 'all') {
      query = query.eq('status', status)
    }
    
    if (severity && severity !== 'all') {
      query = query.eq('severity', severity)
    }
    
    if (search) {
      query = query.or(`hold_reason.ilike.%${search}%`)
    }
    
    const { data: holds, error } = await query
    
    if (error) throw error
    
    return NextResponse.json(holds || [])
    
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Create new quality hold
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Get employee record
    const { data: employee } = await supabase
      .from('employees')
      .select('id, active')
      .eq('auth_user_id', user.id)
      .single()
    
    if (!employee?.active) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    const body = await request.json()
    const {
      batch_id,
      component_tracking_id,
      hold_reason,
      severity
    } = body
    
    // Validate required fields
    if (!hold_reason || !severity) {
      return NextResponse.json({ 
        error: 'Hold reason and severity are required' 
      }, { status: 400 })
    }
    
    if (!batch_id && !component_tracking_id) {
      return NextResponse.json({ 
        error: 'Either batch_id or component_tracking_id is required' 
      }, { status: 400 })
    }
    
    // Create hold
    const { data: hold, error } = await supabase
      .from('quality_holds')
      .insert({
        batch_id,
        component_tracking_id,
        hold_reason,
        severity,
        reported_by: employee.id,
        status: 'active'
      })
      .select()
      .single()
    
    if (error) throw error
    
    // TODO: Send notifications to relevant stakeholders
    
    return NextResponse.json({ 
      success: true,
      hold 
    }, { status: 201 })
    
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}