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
    
    // Get query parameters
    const { searchParams } = new URL(request.url)
    const stage = searchParams.get('stage')
    const checkpointType = searchParams.get('type')
    const workflowTemplateId = searchParams.get('workflow_template_id')
    
    if (!stage || !checkpointType) {
      return NextResponse.json({ error: 'Stage and type are required' }, { status: 400 })
    }
    
    // First try to get checkpoint for specific workflow template
    let query = supabase
      .from('quality_checkpoints')
      .select('*')
      .eq('stage', stage)
      .eq('checkpoint_type', checkpointType)
      .eq('is_active', true)
    
    if (workflowTemplateId) {
      query = query.eq('workflow_template_id', workflowTemplateId)
    }
    
    const { data: checkpoint, error: checkpointError } = await query.single()
    
    if (checkpointError && checkpointError.code !== 'PGRST116') {
      throw checkpointError
    }
    
    // If no specific checkpoint found, try to get from templates
    if (!checkpoint) {
      const { data: template, error: templateError } = await supabase
        .from('quality_checkpoint_templates')
        .select('*')
        .eq('stage_name', stage)
        .eq('checkpoint_type', checkpointType)
        .eq('is_default', true)
        .single()
      
      if (templateError && templateError.code !== 'PGRST116') {
        throw templateError
      }
      
      if (!template) {
        return NextResponse.json({ 
          error: 'No quality checkpoint found for this stage and type' 
        }, { status: 404 })
      }
      
      // Return template as checkpoint format
      return NextResponse.json({
        id: template.id,
        stage: stage,
        checkpoint_type: checkpointType,
        severity: 'major', // Default severity
        checks: template.checks,
        on_failure: 'block_progress' // Default behavior
      })
    }
    
    return NextResponse.json(checkpoint)
    
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Create or update quality checkpoint
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Only managers can create/update checkpoints
    const { data: employee } = await supabase
      .from('employees')
      .select('id, role, active')
      .eq('auth_user_id', user.id)
      .single()
    
    if (!employee?.active || employee.role !== 'manager') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    const body = await request.json()
    const { 
      workflow_template_id,
      stage,
      checkpoint_type,
      severity,
      checks,
      on_failure
    } = body
    
    // Validate required fields
    if (!workflow_template_id || !stage || !checkpoint_type || !checks) {
      return NextResponse.json({ 
        error: 'Missing required fields' 
      }, { status: 400 })
    }
    
    // Upsert checkpoint
    const { data, error } = await supabase
      .from('quality_checkpoints')
      .upsert({
        workflow_template_id,
        stage,
        checkpoint_type,
        severity: severity || 'major',
        checks,
        on_failure: on_failure || 'block_progress',
        is_active: true,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'workflow_template_id,stage,checkpoint_type'
      })
      .select()
      .single()
    
    if (error) throw error
    
    return NextResponse.json({ 
      success: true,
      checkpoint: data 
    }, { status: 201 })
    
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}