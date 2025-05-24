import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Get worker details
    const { data: worker } = await supabase
      .from('workers')
      .select('id, is_active, name')
      .eq('auth_user_id', user.id)
      .single()
    
    if (!worker?.is_active) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    const body = await request.json()
    const { 
      task_id,
      batch_id,
      order_item_id,
      stage,
      issue_type,
      severity,
      title,
      description,
      image_urls = []
    } = body
    
    // Validate required fields
    if (!stage || !issue_type || !severity || !title || !description) {
      return NextResponse.json({ 
        error: 'Missing required fields: stage, issue_type, severity, title, and description are required' 
      }, { status: 400 })
    }
    
    // Validate enums
    const validIssueTypes = ['defect', 'material', 'tooling', 'process', 'other']
    const validSeverities = ['low', 'medium', 'high', 'critical']
    
    if (!validIssueTypes.includes(issue_type)) {
      return NextResponse.json({ 
        error: `Invalid issue_type. Must be one of: ${validIssueTypes.join(', ')}` 
      }, { status: 400 })
    }
    
    if (!validSeverities.includes(severity)) {
      return NextResponse.json({ 
        error: `Invalid severity. Must be one of: ${validSeverities.join(', ')}` 
      }, { status: 400 })
    }
    
    // Verify referenced entities exist if provided
    if (task_id) {
      const { data: task } = await supabase
        .from('work_tasks')
        .select('id')
        .eq('id', task_id)
        .single()
      
      if (!task) {
        return NextResponse.json({ 
          error: 'Task not found' 
        }, { status: 404 })
      }
    }
    
    if (batch_id) {
      const { data: batch } = await supabase
        .from('work_batches')
        .select('id')
        .eq('id', batch_id)
        .single()
      
      if (!batch) {
        return NextResponse.json({ 
          error: 'Batch not found' 
        }, { status: 404 })
      }
    }
    
    if (order_item_id) {
      const { data: orderItem } = await supabase
        .from('order_items')
        .select('id')
        .eq('id', order_item_id)
        .single()
      
      if (!orderItem) {
        return NextResponse.json({ 
          error: 'Order item not found' 
        }, { status: 404 })
      }
    }
    
    // Create the production issue
    const { data: issue, error: createError } = await supabase
      .from('production_issues')
      .insert({
        reported_by_id: worker.id,
        task_id,
        batch_id,
        order_item_id,
        stage,
        issue_type,
        severity,
        title,
        description,
        image_urls,
        resolution_status: 'open'
      })
      .select(`
        *,
        reported_by:workers!production_issues_reported_by_id_fkey(
          id,
          name
        ),
        task:work_tasks(
          id,
          task_description,
          order_item:order_items(
            product_name,
            order:orders(order_number)
          )
        ),
        batch:work_batches(
          id,
          name
        ),
        order_item:order_items(
          id,
          product_name,
          order:orders(order_number)
        )
      `)
      .single()
    
    if (createError) {
      console.error('Error creating issue:', createError)
      return NextResponse.json({ error: 'Failed to create issue' }, { status: 500 })
    }
    
    // TODO: Update quality patterns when table is added to database types
    // This will track issue frequency and patterns for analytics
    
    // TODO: Create quality hold for critical issues when table is added to database types
    // This will prevent batches with critical issues from proceeding
    
    // Slack notification would be sent here if configured
    // The slack_thread_id in the response can be used for future updates
    
    return NextResponse.json(issue)
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 