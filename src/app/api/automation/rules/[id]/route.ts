import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
    
    const { id } = await params
    
    // Get automation rule with related data
    const { data: rule, error: ruleError } = await (supabase as any)
      .from('automation_rules')
      .select(`
        *,
        workflow_template:workflow_templates(id, name, description),
        created_by:workers!automation_rules_created_by_id_fkey(id, name),
        updated_by:workers!automation_rules_updated_by_id_fkey(id, name)
      `)
      .eq('id', id)
      .single()
    
    if (ruleError || !rule) {
      return NextResponse.json({ error: 'Automation rule not found' }, { status: 404 })
    }
    
    return NextResponse.json(rule)
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
    
    const { id } = await params
    const body = await request.json()
    
    // Check if rule exists
    const { data: existingRule, error: checkError } = await (supabase as any)
      .from('automation_rules')
      .select('id, name')
      .eq('id', id)
      .single()
    
    if (checkError || !existingRule) {
      return NextResponse.json({ error: 'Automation rule not found' }, { status: 404 })
    }
    
    // Build update object
    const updateData: any = {
      updated_by_id: worker.id,
      updated_at: new Date().toISOString()
    }
    
    const allowedFields = [
      'name', 'description', 'trigger_config', 'conditions', 'actions',
      'priority', 'execution_order', 'is_active'
    ]
    
    allowedFields.forEach(field => {
      if (body[field] !== undefined) {
        updateData[field] = body[field]
      }
    })
    
    // Validate trigger config if provided
    if (body.trigger_config) {
      const validTriggerTypes = ['stage_complete', 'time_elapsed', 'manual', 'schedule', 'batch_size', 'bottleneck_detected']
      if (!body.trigger_config.type || !validTriggerTypes.includes(body.trigger_config.type)) {
        return NextResponse.json({ 
          error: 'Invalid trigger_config.type. Must be one of: ' + validTriggerTypes.join(', ')
        }, { status: 400 })
      }
    }
    
    // Validate actions array if provided
    if (body.actions && (!Array.isArray(body.actions) || body.actions.length === 0)) {
      return NextResponse.json({ 
        error: 'actions must be a non-empty array' 
      }, { status: 400 })
    }
    
    // Update automation rule
    const { data: rule, error: updateError } = await (supabase as any)
      .from('automation_rules')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        workflow_template:workflow_templates(id, name),
        updated_by:workers!automation_rules_updated_by_id_fkey(id, name)
      `)
      .single()
    
    if (updateError) {
      console.error('Error updating automation rule:', updateError)
      return NextResponse.json({ error: 'Failed to update automation rule' }, { status: 500 })
    }
    
    return NextResponse.json({ 
      message: 'Automation rule updated successfully',
      rule
    })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
    
    const { id } = await params
    
    // Check if rule exists and get its details for logging
    const { data: existingRule, error: checkError } = await (supabase as any)
      .from('automation_rules')
      .select('id, name, execution_count')
      .eq('id', id)
      .single()
    
    if (checkError || !existingRule) {
      return NextResponse.json({ error: 'Automation rule not found' }, { status: 404 })
    }
    
    // Instead of hard delete, we could deactivate if it has executions
    if (existingRule.execution_count > 0) {
      // Soft delete by deactivating
      const { error: deactivateError } = await (supabase as any)
        .from('automation_rules')
        .update({ 
          is_active: false,
          updated_by_id: worker.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
      
      if (deactivateError) {
        console.error('Error deactivating automation rule:', deactivateError)
        return NextResponse.json({ error: 'Failed to deactivate automation rule' }, { status: 500 })
      }
      
      return NextResponse.json({ 
        message: 'Automation rule deactivated successfully (has execution history)',
        deactivated: true
      })
    }
    
    // Hard delete if no executions
    const { error: deleteError } = await (supabase as any)
      .from('automation_rules')
      .delete()
      .eq('id', id)
    
    if (deleteError) {
      console.error('Error deleting automation rule:', deleteError)
      return NextResponse.json({ error: 'Failed to delete automation rule' }, { status: 500 })
    }
    
    return NextResponse.json({ 
      message: 'Automation rule deleted successfully',
      deleted: true
    })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 