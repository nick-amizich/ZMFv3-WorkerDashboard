import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logError, logBusiness } from '@/lib/logger'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('resolution_status')
    const severity = searchParams.get('severity')
    const category = searchParams.get('category')
    const location = searchParams.get('location') || 'south'

    // Build query
    let query = supabase
      .from('production_issues')
      .select(`
        *,
        reporter:workers!production_issues_reported_by_fkey (
          name,
          email
        ),
        resolver:workers!production_issues_resolved_by_fkey (
          name,
          email
        )
      `)
      .order('created_at', { ascending: false })

    // Apply filters
    if (status) {
      query = query.eq('resolution_status', status)
    }
    if (severity) {
      query = query.eq('severity', severity)
    }
    if (category) {
      query = query.eq('category', category)
    }
    // Filter by location in the issue data
    if (location) {
      query = query.contains('issue_data', { location })
    }

    const { data: issues, error } = await query

    if (error) {
      logError(error, 'ISSUES_GET', { userId: user.id })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Calculate summary metrics
    const summary = {
      total: issues?.length || 0,
      open: issues?.filter(i => i.resolution_status === 'open').length || 0,
      in_progress: issues?.filter(i => i.resolution_status === 'in_progress').length || 0,
      resolved: issues?.filter(i => i.resolution_status === 'resolved').length || 0,
      critical: issues?.filter(i => i.severity === 'critical').length || 0,
      high: issues?.filter(i => i.severity === 'high').length || 0
    }

    logBusiness('Production issues fetched', 'ISSUES', { 
      userId: user.id,
      count: issues?.length || 0,
      filters: { status, severity, category, location }
    })

    return NextResponse.json({ issues, summary })
  } catch (error) {
    logError(error as Error, 'ISSUES_GET')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get worker info
    const { data: worker } = await supabase
      .from('workers')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    if (!worker) {
      return NextResponse.json({ error: 'Worker not found' }, { status: 404 })
    }

    // Get request body
    const body = await request.json()
    const { 
      title,
      description,
      category,
      severity,
      machine_id,
      production_request_id,
      part_id,
      quantity_affected
    } = body

    // Validate required fields
    if (!title || !description || !category || !severity) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Build issue data object
    const issueData = {
      location: 'south',
      machine_id,
      production_request_id,
      part_id,
      quantity_affected: quantity_affected || 0
    }

    // Create issue
    const { data: issue, error } = await supabase
      .from('production_issues')
      .insert({
        title,
        description,
        category,
        severity,
        resolution_status: 'open',
        reported_by: worker.id,
        issue_data: issueData
      })
      .select(`
        *,
        reporter:workers!production_issues_reported_by_fkey (
          name,
          email
        )
      `)
      .single()

    if (error) {
      logError(error, 'ISSUES_CREATE', { userId: user.id })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    logBusiness('Production issue created', 'ISSUES', { 
      userId: user.id,
      issueId: issue.id,
      title,
      category,
      severity
    })

    return NextResponse.json({ issue }, { status: 201 })
  } catch (error) {
    logError(error as Error, 'ISSUES_CREATE')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get worker info
    const { data: worker } = await supabase
      .from('workers')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    if (!worker) {
      return NextResponse.json({ error: 'Worker not found' }, { status: 404 })
    }

    // Get request body
    const body = await request.json()
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json({ error: 'Issue ID required' }, { status: 400 })
    }

    // If resolving the issue, add resolver info
    if (updates.resolution_status === 'resolved') {
      updates.resolved_by = worker.id
      updates.resolved_at = new Date().toISOString()
    }

    // Update issue
    const { data: issue, error } = await supabase
      .from('production_issues')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        reporter:workers!production_issues_reported_by_fkey (
          name,
          email
        ),
        resolver:workers!production_issues_resolved_by_fkey (
          name,
          email
        )
      `)
      .single()

    if (error) {
      logError(error, 'ISSUES_UPDATE', { userId: user.id, issueId: id })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    logBusiness('Production issue updated', 'ISSUES', { 
      userId: user.id,
      issueId: id,
      updates
    })

    return NextResponse.json({ issue })
  } catch (error) {
    logError(error as Error, 'ISSUES_UPDATE')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Add comment to issue
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get worker info
    const { data: worker } = await supabase
      .from('workers')
      .select('id, name')
      .eq('auth_user_id', user.id)
      .single()

    if (!worker) {
      return NextResponse.json({ error: 'Worker not found' }, { status: 404 })
    }

    // Get request body
    const body = await request.json()
    const { issue_id, comment } = body

    if (!issue_id || !comment) {
      return NextResponse.json({ error: 'Issue ID and comment required' }, { status: 400 })
    }

    // Get current issue to append comment
    const { data: issue } = await supabase
      .from('production_issues')
      .select('resolution_notes')
      .eq('id', issue_id)
      .single()

    if (!issue) {
      return NextResponse.json({ error: 'Issue not found' }, { status: 404 })
    }

    // Build comment entry
    const commentEntry = {
      author: worker.name,
      author_id: worker.id,
      comment,
      timestamp: new Date().toISOString()
    }

    // Append to existing notes
    const existingNotes = issue.resolution_notes || []
    const updatedNotes = [...existingNotes, commentEntry]

    // Update issue with new comment
    const { error: updateError } = await supabase
      .from('production_issues')
      .update({ resolution_notes: updatedNotes })
      .eq('id', issue_id)

    if (updateError) {
      logError(updateError, 'ISSUES_ADD_COMMENT', { userId: user.id, issueId: issue_id })
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    logBusiness('Comment added to issue', 'ISSUES', { 
      userId: user.id,
      issueId: issue_id,
      comment: comment.substring(0, 50) + '...'
    })

    return NextResponse.json({ success: true, comment: commentEntry })
  } catch (error) {
    logError(error as Error, 'ISSUES_ADD_COMMENT')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}