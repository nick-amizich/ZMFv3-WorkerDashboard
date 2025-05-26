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
      .select('role, is_active')
      .eq('auth_user_id', user.id)
      .single()
    
    if (!worker?.is_active) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    // Parse query parameters
    const url = new URL(request.url)
    const batchId = url.searchParams.get('batch_id')
    const assignedToId = url.searchParams.get('assigned_to_id')
    const status = url.searchParams.get('status')
    const stage = url.searchParams.get('stage')
    
    // Build query with optional filters - focus on headphone tasks only
    let query = supabase
      .from('work_tasks')
      .select(`
        *,
        order_item:order_items(
          product_name,
          variant_title,
          product_data,
          order:orders(
            order_number,
            customer_name
          )
        ),
        assigned_to:workers!work_tasks_assigned_to_id_fkey(
          id,
          name,
          role
        )
      `)
      .in('task_type', ['sanding', 'assembly', 'qc', 'packaging']) // Only headphone production tasks
    
    // Apply filters
    if (batchId) {
      query = query.eq('batch_id', batchId)
    }
    if (assignedToId) {
      query = query.eq('assigned_to_id', assignedToId)
    }
    if (status) {
      query = query.eq('status', status)
    }
    if (stage) {
      query = query.eq('stage', stage)
    }
    
    // Order results
    query = query.order('created_at', { ascending: false })
    
    const { data: tasks, error: tasksError } = await query
    
    if (tasksError) {
      console.error('Error fetching tasks:', tasksError)
      return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 })
    }
    
    return NextResponse.json({ 
      tasks: tasks || [],
      filters: {
        batch_id: batchId,
        assigned_to_id: assignedToId,
        status,
        stage
      },
      total: tasks?.length || 0
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
    
    if (!worker?.is_active) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    // Only managers can create tasks
    if (!['manager', 'supervisor'].includes(worker.role || '')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    const body = await request.json()
    const { 
      task_type, 
      priority, 
      task_description, 
      estimated_hours, 
      order_item_id,
      assigned_to_id 
    } = body
    
    // Validate required fields
    if (!task_type || !order_item_id) {
      return NextResponse.json({ 
        error: 'Missing required fields: task_type and order_item_id are required' 
      }, { status: 400 })
    }
    
    // Create the task
    const { data: task, error: createError } = await supabase
      .from('work_tasks')
      .insert({
        task_type,
        priority: priority || 'normal',
        task_description,
        estimated_hours: estimated_hours || null,
        order_item_id,
        assigned_to_id: assigned_to_id || null,
        assigned_by_id: worker.id,
        status: 'pending'
      })
      .select(`
        *,
        order_item:order_items(
          product_name,
          order:orders(
            order_number,
            customer_name
          )
        ),
        assigned_to:workers!work_tasks_assigned_to_id_fkey(
          id,
          name
        )
      `)
      .single()
    
    if (createError) {
      console.error('Error creating task:', createError)
      return NextResponse.json({ error: 'Failed to create task' }, { status: 500 })
    }
    
    return NextResponse.json(task)
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}