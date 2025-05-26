import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const holdSchema = z.object({
  batch_id: z.string().uuid().optional(),
  component_tracking_id: z.string().uuid().optional(),
  hold_reason: z.string(),
  severity: z.enum(['critical', 'major', 'minor'])
})

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { data: worker } = await supabase
      .from('workers')
      .select('role, is_active')
      .eq('auth_user_id', user.id)
      .single()
    
    if (!worker?.is_active) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status') || 'active'
    const severity = searchParams.get('severity')
    
    let query = supabase
      .from('quality_holds')
      .select(`
        *,
        batch:work_batches(
          id,
          name,
          order_item_ids
        ),
        component:component_tracking(
          cup_pair_id,
          left_cup_serial,
          right_cup_serial,
          grade,
          specifications
        ),
        reported_by:workers!quality_holds_reported_by_fkey(
          id,
          name
        ),
        assigned_to:workers!quality_holds_assigned_to_fkey(
          id,
          name
        )
      `)
      .order('created_at', { ascending: false })
    
    if (status !== 'all') {
      query = query.eq('status', status)
    }
    
    if (severity) {
      query = query.eq('severity', severity)
    }
    
    const { data: holds, error: fetchError } = await query
    
    if (fetchError) {
      console.error('Error fetching holds:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch quality holds' }, { status: 500 })
    }
    
    return NextResponse.json({ holds })
    
  } catch (error) {
    console.error('Quality Holds API Error:', error)
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
    
    if (!worker?.is_active) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    const body = await request.json()
    const validatedData = holdSchema.parse(body)
    
    // Create quality hold
    const { data: hold, error: createError } = await supabase
      .from('quality_holds')
      .insert({
        ...validatedData,
        reported_by: worker.id,
        status: 'active'
      })
      .select()
      .single()
    
    if (createError) {
      console.error('Error creating hold:', createError)
      return NextResponse.json({ error: 'Failed to create quality hold' }, { status: 500 })
    }
    
    // If batch_id provided, update batch with hold reference
    if (validatedData.batch_id && hold) {
      await supabase
        .from('work_batches')
        .update({ 
          quality_hold_id: hold.id,
          status: 'on_hold'
        })
        .eq('id', validatedData.batch_id)
    }
    
    // Send Slack notification for critical holds
    if (validatedData.severity === 'critical') {
      // TODO: Implement Slack notification
    }
    
    return NextResponse.json({ hold })
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error('Hold Creation Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}