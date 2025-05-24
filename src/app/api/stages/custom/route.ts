import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Validate worker status
    const { data: worker } = await supabase
      .from('workers')
      .select('role, is_active')
      .eq('auth_user_id', user.id)
      .single()
    
    if (!worker?.is_active) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    // Get custom stages
    const { data: customStages, error: stagesError } = await supabase
      .from('custom_stages')
      .select(`
        *,
        created_by:workers!custom_stages_created_by_id_fkey(
          id,
          name
        )
      `)
      .eq('is_active', true)
      .order('stage_name', { ascending: true })
    
    if (stagesError) {
      console.error('Error fetching custom stages:', stagesError)
      return NextResponse.json({ error: 'Failed to fetch custom stages' }, { status: 500 })
    }
    
    return NextResponse.json(customStages || [])
  } catch (error) {
    console.error('API Error:', error)
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
    
    // Validate worker status and role
    const { data: worker } = await supabase
      .from('workers')
      .select('id, role, is_active')
      .eq('auth_user_id', user.id)
      .single()
    
    if (!worker?.is_active) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    // Only managers can create custom stages
    if (!['manager', 'supervisor'].includes(worker.role || '')) {
      return NextResponse.json({ error: 'Forbidden: Only managers can create custom stages' }, { status: 403 })
    }
    
    const body = await request.json()
    const { 
      stage_code,
      stage_name,
      description,
      default_estimated_hours,
      required_skills = []
    } = body
    
    // Validate required fields
    if (!stage_code || !stage_name) {
      return NextResponse.json({ 
        error: 'Missing required fields: stage_code and stage_name are required' 
      }, { status: 400 })
    }
    
    // Validate stage_code format (alphanumeric and underscores only)
    if (!/^[a-zA-Z0-9_]+$/.test(stage_code)) {
      return NextResponse.json({ 
        error: 'stage_code must contain only letters, numbers, and underscores' 
      }, { status: 400 })
    }
    
    // Check if stage_code already exists
    const { data: existingStage } = await supabase
      .from('custom_stages')
      .select('id')
      .eq('stage_code', stage_code)
      .single()
    
    if (existingStage) {
      return NextResponse.json({ 
        error: 'A stage with this code already exists' 
      }, { status: 400 })
    }
    
    // Create the custom stage
    const { data: customStage, error: createError } = await supabase
      .from('custom_stages')
      .insert({
        stage_code,
        stage_name,
        description,
        default_estimated_hours,
        required_skills,
        created_by_id: worker.id,
        is_active: true
      })
      .select(`
        *,
        created_by:workers!custom_stages_created_by_id_fkey(
          id,
          name
        )
      `)
      .single()
    
    if (createError) {
      console.error('Error creating custom stage:', createError)
      return NextResponse.json({ error: 'Failed to create custom stage' }, { status: 500 })
    }
    
    return NextResponse.json(customStage)
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 