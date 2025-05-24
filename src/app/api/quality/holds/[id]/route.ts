import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// Update hold status
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Only managers and supervisors can update holds
    const { data: employee } = await supabase
      .from('employees')
      .select('id, role, active')
      .eq('auth_user_id', user.id)
      .single()
    
    if (!employee?.active || !['manager', 'supervisor'].includes(employee.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    const holdId = params.id
    const body = await request.json()
    const {
      status,
      resolution_notes,
      assigned_to
    } = body
    
    // Build update object
    const updateData: any = {
      updated_at: new Date().toISOString()
    }
    
    if (status) {
      updateData.status = status
      
      // Set timestamps based on status
      if (status === 'resolved') {
        updateData.resolved_at = new Date().toISOString()
      } else if (status === 'escalated') {
        updateData.escalated_at = new Date().toISOString()
      }
    }
    
    if (resolution_notes !== undefined) {
      updateData.resolution_notes = resolution_notes
    }
    
    if (assigned_to !== undefined) {
      updateData.assigned_to = assigned_to
    }
    
    // Update hold
    const { data: hold, error } = await supabase
      .from('quality_holds')
      .update(updateData)
      .eq('id', holdId)
      .select(`
        *,
        batch:work_batches(
          id,
          name
        ),
        component:component_tracking(
          id,
          left_cup_serial,
          right_cup_serial
        )
      `)
      .single()
    
    if (error) throw error
    
    // If resolved, update batch status if needed
    if (status === 'resolved' && hold.batch_id) {
      // Check if there are other active holds on this batch
      const { data: otherHolds } = await supabase
        .from('quality_holds')
        .select('id')
        .eq('batch_id', hold.batch_id)
        .eq('status', 'active')
        .neq('id', holdId)
      
      // If no other active holds, remove quality_hold_id from batch
      if (!otherHolds || otherHolds.length === 0) {
        await supabase
          .from('work_batches')
          .update({ quality_hold_id: null })
          .eq('id', hold.batch_id)
      }
    }
    
    return NextResponse.json({ 
      success: true,
      hold 
    })
    
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Get hold details
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Validate employee status
    const { data: employee } = await supabase
      .from('employees')
      .select('id, active')
      .eq('auth_user_id', user.id)
      .single()
    
    if (!employee?.active) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    const holdId = params.id
    
    const { data: hold, error } = await supabase
      .from('quality_holds')
      .select(`
        *,
        batch:work_batches(
          id,
          name,
          current_stage,
          items_count,
          workflow_template:workflow_templates(
            id,
            name
          )
        ),
        component:component_tracking(
          id,
          left_cup_serial,
          right_cup_serial,
          specifications,
          journey,
          final_metrics
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
      .eq('id', holdId)
      .single()
    
    if (error) throw error
    
    return NextResponse.json(hold)
    
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}