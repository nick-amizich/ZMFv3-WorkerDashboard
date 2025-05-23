import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Get worker details
    const { data: worker, error: workerError } = await supabase
      .from('workers')
      .select('id, name, role, skills, is_active')
      .eq('auth_user_id', user.id)
      .single()
    
    if (workerError || !worker) {
      return NextResponse.json({ error: 'Worker not found' }, { status: 404 })
    }
    
    if (!worker.is_active) {
      return NextResponse.json({ error: 'Worker inactive' }, { status: 403 })
    }
    
    return NextResponse.json({ worker })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}