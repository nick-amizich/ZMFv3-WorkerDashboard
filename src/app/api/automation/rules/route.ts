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
    const { data: worker } = await supabase
      .from('workers')
      .select('id, role, is_active')
      .eq('auth_user_id', user.id)
      .single()
    
    if (!worker?.is_active) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    const url = new URL(request.url)
    const workflowId = url.searchParams.get('workflow_id')
    const isActive = url.searchParams.get('active')
    const limit = parseInt(url.searchParams.get('limit') || '50')
    
    // Build query
    let query = (supabase as any)
      .from('automation_rules')
      .select(`
        *,
        workflow_template:workflow_templates(id, name),
        created_by:workers!automation_rules_created_by_id_fkey(id, name),
        updated_by:workers!automation_rules_updated_by_id_fkey(id, name)
      `)
      .order('priority', { ascending: false })
      .order('execution_order', { ascending: true })
      .limit(limit)
    
    // Apply filters
    if (workflowId) {
      query = query.eq('workflow_template_id', workflowId)
    }
    
    if (isActive !== null) {
      query = query.eq('is_active', isActive === 'true')
    }
    
    const { data: rules, error: rulesError } = await query
    
    if (rulesError) {
      console.error('Error fetching automation rules:', rulesError)
      return NextResponse.json({ error: 'Failed to fetch automation rules' }, { status: 500 })
    }
    
    return NextResponse.json({
      rules: rules || [],
      total: rules?.length || 0,
      filters: {
        workflow_id: workflowId,
        active: isActive,
        limit
      }
    })
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
    
    // ALWAYS validate employee status
    const { data: worker } = await supabase
      .from('workers')
      .select('id, role, is_active')
      .eq('auth_user_id', user.id)
      .single()
    
    if (!worker?.is_active || !['manager', 'supervisor'].includes(worker.role || '')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    const body = await request.json()
    const {
      workflow_template_id,
      name,
      description,
      trigger_config,
      conditions = [],
      actions,
      priority = 0,
      execution_order = 0,
      is_active = true
    } = body
    
    // Validate required fields
    if (!name || !trigger_config || !actions || !Array.isArray(actions) || actions.length === 0) {
      return NextResponse.json({ 
        error: 'name, trigger_config, and actions are required' 
      }, { status: 400 })
    }
    
    // Validate trigger config structure
    const validTriggerTypes = ['stage_complete', 'time_elapsed', 'manual', 'schedule', 'batch_size', 'bottleneck_detected']
    if (!trigger_config.type || !validTriggerTypes.includes(trigger_config.type)) {
      return NextResponse.json({ 
        error: 'Invalid trigger_config.type. Must be one of: ' + validTriggerTypes.join(', ')
      }, { status: 400 })
    }
    
    // Validate workflow exists if specified
    if (workflow_template_id) {
      const { data: workflow, error: workflowError } = await supabase
        .from('workflow_templates')
        .select('id, name')
        .eq('id', workflow_template_id)
        .single()
      
      if (workflowError || !workflow) {
        return NextResponse.json({ 
          error: 'Invalid workflow_template_id' 
        }, { status: 400 })
      }
    }
    
    // Create automation rule
    const { data: rule, error: createError } = await (supabase as any)
      .from('automation_rules')
      .insert({
        workflow_template_id,
        name,
        description,
        trigger_config,
        conditions,
        actions,
        priority,
        execution_order,
        is_active,
        created_by_id: worker.id,
        updated_by_id: worker.id
      })
      .select(`
        *,
        workflow_template:workflow_templates(id, name),
        created_by:workers!automation_rules_created_by_id_fkey(id, name)
      `)
      .single()
    
    if (createError) {
      console.error('Error creating automation rule:', createError)
      return NextResponse.json({ error: 'Failed to create automation rule' }, { status: 500 })
    }
    
    return NextResponse.json({ 
      message: 'Automation rule created successfully',
      rule
    })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 