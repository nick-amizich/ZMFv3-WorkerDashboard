import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Get worker details
    const { data: worker } = await supabase
      .from('workers')
      .select('id, is_active, role')
      .eq('auth_user_id', user.id)
      .single()
    
    if (!worker?.is_active) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    const { id: issueId } = await params
    const body = await request.json()
    const { resolution_notes, resolution_status } = body
    
    // Validate required fields
    if (!resolution_notes || !resolution_status) {
      return NextResponse.json({ 
        error: 'Missing required fields: resolution_notes and resolution_status are required' 
      }, { status: 400 })
    }
    
    // Validate resolution_status
    const validStatuses = ['resolved', 'wont_fix']
    if (!validStatuses.includes(resolution_status)) {
      return NextResponse.json({ 
        error: `Invalid resolution_status. Must be one of: ${validStatuses.join(', ')}` 
      }, { status: 400 })
    }
    
    // Get the issue to verify it exists
    const { data: issue } = await supabase
      .from('production_issues')
      .select('id, resolution_status, reported_by_id, title')
      .eq('id', issueId)
      .single()
    
    if (!issue) {
      return NextResponse.json({ 
        error: 'Issue not found' 
      }, { status: 404 })
    }
    
    // Check if issue is already resolved
    if (issue.resolution_status === 'resolved' || issue.resolution_status === 'wont_fix') {
      return NextResponse.json({ 
        error: 'Issue is already resolved' 
      }, { status: 400 })
    }
    
    // Update the issue
    const { data: updatedIssue, error: updateError } = await supabase
      .from('production_issues')
      .update({
        resolution_status,
        resolution_notes,
        resolved_by_id: worker.id,
        resolved_at: new Date().toISOString()
      })
      .eq('id', issueId)
      .select(`
        *,
        reported_by:workers!production_issues_reported_by_id_fkey(
          id,
          name
        ),
        resolved_by:workers!production_issues_resolved_by_id_fkey(
          id,
          name
        ),
        task:work_tasks(
          id,
          task_description,
          order_item:order_items(
            product_name,
            order:orders(order_number, customer_name)
          )
        ),
        batch:work_batches(
          id,
          name,
          workflow_template:workflow_templates(name)
        )
      `)
      .single()
    
    if (updateError) {
      console.error('Error resolving issue:', updateError)
      return NextResponse.json({ error: 'Failed to resolve issue' }, { status: 500 })
    }
    
    // Slack update would be posted here if slack_thread_id exists
    
    return NextResponse.json(updatedIssue)
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 