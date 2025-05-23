import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const assignTaskSchema = z.object({
  taskId: z.string().uuid(),
  workerId: z.string().uuid().nullable(),
})

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Validate manager role
    const { data: manager } = await supabase
      .from('workers')
      .select('id, role, is_active')
      .eq('auth_user_id', user.id)
      .single()
    
    if (!manager?.is_active || !['manager', 'supervisor'].includes(manager.role || '')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    // Validate request body
    const body = await request.json()
    const { taskId, workerId } = assignTaskSchema.parse(body)
    
    // Update task assignment (RLS will handle permissions)
    const updateData: any = {
      assigned_by_id: manager.id,
      status: workerId ? 'assigned' : 'pending',
      updated_at: new Date().toISOString()
    }
    
    if (workerId) {
      updateData.assigned_to_id = workerId
    } else {
      updateData.assigned_to_id = null
    }
    
    const { data, error: updateError } = await supabase
      .from('work_tasks')
      .update(updateData)
      .eq('id', taskId)
      .select()
      .single()
    
    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 })
    }
    
    return NextResponse.json({ task: data })
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request data', details: error.errors }, { status: 400 })
    }
    console.error('Task assignment error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}