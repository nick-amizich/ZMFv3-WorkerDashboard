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
      console.log('Auth error:', error)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Validate manager role
    const { data: manager } = await supabase
      .from('workers')
      .select('id, role, is_active, approval_status')
      .eq('auth_user_id', user.id)
      .single()
    
    console.log('Task assignment - Manager check:', {
      userId: user.id,
      manager,
      isActive: manager?.is_active,
      role: manager?.role,
      approvalStatus: manager?.approval_status
    })
    
    if (!manager?.is_active || !['manager', 'supervisor'].includes(manager.role || '')) {
      console.log('Permission denied - Manager check failed:', {
        isActive: manager?.is_active,
        role: manager?.role,
        hasValidRole: ['manager', 'supervisor'].includes(manager?.role || '')
      })
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    // Validate request body
    const body = await request.json()
    console.log('Request body:', body)
    
    const { taskId, workerId } = assignTaskSchema.parse(body)
    console.log('Parsed data:', { taskId, workerId })
    
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
    
    console.log('Update data:', updateData)
    
    const { data, error: updateError } = await supabase
      .from('work_tasks')
      .update(updateData)
      .eq('id', taskId)
      .select()
      .single()
    
    console.log('Update result:', { data, updateError })
    
    if (updateError) {
      console.error('Database update error:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 400 })
    }
    
    return NextResponse.json({ task: data })
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Zod validation error:', error.errors)
      return NextResponse.json({ error: 'Invalid request data', details: error.errors }, { status: 400 })
    }
    console.error('Task assignment error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}