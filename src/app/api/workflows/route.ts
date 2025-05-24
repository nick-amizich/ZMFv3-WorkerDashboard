import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Validate employee status
    const { data: worker } = await supabase
      .from('workers')
      .select('role, is_active')
      .eq('auth_user_id', user.id)
      .single()
    
    if (!worker?.is_active) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    // Fetch all active workflow templates
    const { data: workflows, error: workflowsError } = await supabase
      .from('workflow_templates')
      .select(`
        *,
        created_by:workers!workflow_templates_created_by_id_fkey(
          id,
          name
        )
      `)
      .eq('is_active', true)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false })
    
    if (workflowsError) {
      console.error('Error fetching workflows:', workflowsError)
      return NextResponse.json({ error: 'Failed to fetch workflows' }, { status: 500 })
    }
    
    return NextResponse.json(workflows || [])
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
    
    // Validate employee status and role
    const { data: worker } = await supabase
      .from('workers')
      .select('id, role, is_active')
      .eq('auth_user_id', user.id)
      .single()
    
    if (!worker?.is_active) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    // Only managers can create workflows
    if (!['manager', 'supervisor'].includes(worker.role || '')) {
      return NextResponse.json({ error: 'Forbidden: Only managers can create workflows' }, { status: 403 })
    }
    
    const body = await request.json()
    const { 
      name,
      description,
      trigger_rules = { manual_only: true },
      stages,
      stage_transitions 
    } = body
    
    // Validate required fields
    if (!name || !stages || !stage_transitions) {
      return NextResponse.json({ 
        error: 'Missing required fields: name, stages, and stage_transitions are required' 
      }, { status: 400 })
    }
    
    // Validate stages structure
    if (!Array.isArray(stages) || stages.length === 0) {
      return NextResponse.json({ 
        error: 'Stages must be a non-empty array' 
      }, { status: 400 })
    }
    
    // Validate each stage has required fields
    for (const stage of stages) {
      if (!stage.stage || !stage.name) {
        return NextResponse.json({ 
          error: 'Each stage must have stage and name fields' 
        }, { status: 400 })
      }
    }
    
    // Create the workflow
    const { data: workflow, error: createError } = await supabase
      .from('workflow_templates')
      .insert({
        name,
        description,
        trigger_rules,
        stages,
        stage_transitions,
        created_by_id: worker.id,
        is_active: true
      })
      .select(`
        *,
        created_by:workers!workflow_templates_created_by_id_fkey(
          id,
          name
        )
      `)
      .single()
    
    if (createError) {
      console.error('Error creating workflow:', createError)
      return NextResponse.json({ error: 'Failed to create workflow' }, { status: 500 })
    }
    
    return NextResponse.json(workflow)
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 