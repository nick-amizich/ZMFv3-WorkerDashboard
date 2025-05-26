import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

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
    const serial = searchParams.get('serial')
    
    if (!serial) {
      return NextResponse.json({ error: 'Serial number required' }, { status: 400 })
    }
    
    // Search for component by serial number (could be left or right)
    const { data: component, error: searchError } = await supabase
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
      .or(`left_cup_serial.eq.${serial},right_cup_serial.eq.${serial}`)
      .single()
    
    if (searchError || !component) {
      return NextResponse.json({ error: 'Component not found' }, { status: 404 })
    }
    
    return NextResponse.json(component)
    
  } catch (error) {
    console.error('Component Search Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}