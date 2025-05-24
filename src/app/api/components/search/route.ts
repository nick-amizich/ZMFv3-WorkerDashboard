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
    
    // Get search parameter
    const { searchParams } = new URL(request.url)
    const serial = searchParams.get('serial')
    
    if (!serial) {
      return NextResponse.json({ 
        error: 'Serial number is required' 
      }, { status: 400 })
    }
    
    // Search for component by either left or right serial
    const { data: component, error } = await supabase
      .from('component_tracking')
      .select('*')
      .or(`left_cup_serial.eq.${serial},right_cup_serial.eq.${serial}`)
      .single()
    
    if (error && error.code === 'PGRST116') {
      return NextResponse.json({ 
        error: 'Component not found' 
      }, { status: 404 })
    }
    
    if (error) throw error
    
    // Enhance journey data with worker names if possible
    if (component && component.journey) {
      const workerIds = component.journey
        .map((j: any) => j.worker)
        .filter((id: string) => id)
      
      if (workerIds.length > 0) {
        const { data: workers } = await supabase
          .from('workers')
          .select('id, name')
          .in('id', workerIds)
        
        const workerMap = new Map(workers?.map(w => [w.id, w.name]) || [])
        
        component.journey = component.journey.map((step: any) => ({
          ...step,
          worker: workerMap.get(step.worker) || step.worker
        }))
      }
    }
    
    return NextResponse.json(component)
    
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}