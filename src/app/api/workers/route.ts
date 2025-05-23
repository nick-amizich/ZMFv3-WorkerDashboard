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
    const { data: currentWorker } = await supabase
      .from('workers')
      .select('role, is_active')
      .eq('auth_user_id', user.id)
      .single()
    
    if (!currentWorker?.is_active || !['manager', 'supervisor'].includes(currentWorker.role || '')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    // Fetch all active workers
    const { data: workers, error: workersError } = await supabase
      .from('workers')
      .select('*')
      .eq('is_active', true)
      .order('name')
    
    if (workersError) {
      console.error('Error fetching workers:', workersError)
      return NextResponse.json({ error: 'Failed to fetch workers' }, { status: 500 })
    }
    
    return NextResponse.json(workers || [])
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}