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
    
    if (!worker?.is_active || !['manager', 'supervisor'].includes(worker.role || '')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    // Get query parameters
    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get('limit') || '50')
    const ruleId = searchParams.get('rule_id')
    const status = searchParams.get('status')
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')
    
    // Build query
    let query = supabase
      .from('automation_execution_log')
      .select(`
        *,
        rule:automation_rules(
          id,
          name,
          trigger_type
        )
      `)
      .order('executed_at', { ascending: false })
      .limit(limit)
    
    if (ruleId) {
      query = query.eq('rule_id', ruleId)
    }
    
    if (status) {
      query = query.eq('execution_status', status)
    }
    
    if (startDate) {
      query = query.gte('executed_at', startDate)
    }
    
    if (endDate) {
      query = query.lte('executed_at', endDate)
    }
    
    const { data: logs, error: fetchError } = await query
    
    if (fetchError) {
      console.error('Failed to fetch execution logs:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch logs' }, { status: 500 })
    }
    
    // Get summary statistics
    const { data: stats } = await supabase
      .from('automation_execution_log')
      .select('execution_status')
      .gte('executed_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    
    const summary = {
      total_24h: stats?.length || 0,
      successful_24h: stats?.filter(s => s.execution_status === 'success').length || 0,
      failed_24h: stats?.filter(s => s.execution_status === 'failed').length || 0,
      partial_24h: stats?.filter(s => s.execution_status === 'partial').length || 0
    }
    
    return NextResponse.json({
      logs: logs || [],
      total: logs?.length || 0,
      summary
    })
    
  } catch (error) {
    console.error('Execution Logs API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}