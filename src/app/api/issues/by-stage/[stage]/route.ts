import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ stage: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Validate worker status
    const { data: worker } = await supabase
      .from('workers')
      .select('id, role, is_active')
      .eq('auth_user_id', user.id)
      .single()
    
    if (!worker?.is_active) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    const { stage } = await params
    
    // Get URL parameters
    const url = new URL(request.url)
    const status = url.searchParams.get('status')
    const severity = url.searchParams.get('severity')
    const limit = parseInt(url.searchParams.get('limit') || '50')
    
    // Build query
    let query = supabase
      .from('production_issues')
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
      .eq('stage', stage)
      .order('created_at', { ascending: false })
      .limit(limit)
    
    // Apply filters
    if (status) {
      query = query.eq('resolution_status', status)
    }
    
    if (severity) {
      query = query.eq('severity', severity)
    }
    
    const { data: issues, error: issuesError } = await query
    
    if (issuesError) {
      console.error('Error fetching issues by stage:', issuesError)
      return NextResponse.json({ error: 'Failed to fetch issues' }, { status: 500 })
    }
    
    // Calculate summary statistics
    const openIssues = issues?.filter(issue => issue.resolution_status === 'open') || []
    const criticalIssues = issues?.filter(issue => issue.severity === 'critical') || []
    const recentIssues = issues?.filter(issue => {
      if (!issue.created_at) return false
      const createdAt = new Date(issue.created_at)
      const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
      return createdAt > dayAgo
    }) || []
    
    const summary = {
      total_issues: issues?.length || 0,
      open_issues: openIssues.length,
      critical_issues: criticalIssues.length,
      recent_issues: recentIssues.length,
      stage: stage,
      by_severity: {
        low: issues?.filter(i => i.severity === 'low').length || 0,
        medium: issues?.filter(i => i.severity === 'medium').length || 0,
        high: issues?.filter(i => i.severity === 'high').length || 0,
        critical: issues?.filter(i => i.severity === 'critical').length || 0
      },
      by_status: {
        open: issues?.filter(i => i.resolution_status === 'open').length || 0,
        investigating: issues?.filter(i => i.resolution_status === 'investigating').length || 0,
        resolved: issues?.filter(i => i.resolution_status === 'resolved').length || 0,
        wont_fix: issues?.filter(i => i.resolution_status === 'wont_fix').length || 0
      }
    }
    
    return NextResponse.json({
      issues: issues || [],
      summary
    })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 