import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const releaseHoldSchema = z.object({
  resolution_notes: z.string().min(1)
})

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is supervisor or manager
    const { data: worker } = await supabase
      .from('workers')
      .select('id, role')
      .eq('auth_user_id', user.id)
      .single()

    if (!worker || !['supervisor', 'manager'].includes(worker.role)) {
      return NextResponse.json({ error: 'Only supervisors and managers can release holds' }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = releaseHoldSchema.parse(body)
    
    // Await params
    const { id } = await params

    // Get the hold
    const { data: hold } = await supabase
      .from('quality_holds')
      .select('id, order_item_id, released_at')
      .eq('id', id)
      .single()

    if (!hold) {
      return NextResponse.json({ error: 'Hold not found' }, { status: 404 })
    }

    if (hold.released_at) {
      return NextResponse.json({ error: 'Hold already released' }, { status: 400 })
    }

    // Release the hold
    const { data: updatedHold, error: updateError } = await supabase
      .from('quality_holds')
      .update({
        released_at: new Date().toISOString(),
        released_by: worker.id,
        resolution_notes: validatedData.resolution_notes
      })
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Error releasing hold:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // Update order item status back to previous state
    await supabase
      .from('order_items')
      .update({
        status: 'in_production',
        updated_at: new Date().toISOString()
      })
      .eq('id', hold.order_item_id)

    return NextResponse.json({ data: updatedHold })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}