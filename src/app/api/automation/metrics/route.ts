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
    
    if (!worker?.is_active || !['manager', 'supervisor'].includes(worker.role || '')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    const url = new URL(request.url)
    const ruleId = url.searchParams.get('rule_id')
    const workflowId = url.searchParams.get('workflow_id')
    const days = parseInt(url.searchParams.get('days') || '30')
    const aggregation = url.searchParams.get('aggregation') || 'daily' // daily, weekly, monthly
    
    // Get automation rule performance summary
    const { data: rulesSummary, error: summaryError } = await (supabase as any)
      .from('automation_rules')
      .select(`
        id,
        name,
        execution_count,
        last_executed_at,
        average_execution_time_ms,
        is_active,
        workflow_template:workflow_templates(id, name)
      `)
      .order('execution_count', { ascending: false })
      .limit(20)
    
    if (summaryError) {
      console.error('Error fetching automation rules summary:', summaryError)
      return NextResponse.json({ error: 'Failed to fetch automation summary' }, { status: 500 })
    }
    
    // Get detailed execution metrics
    let metricsQuery = (supabase as any)
      .from('automation_metrics')
      .select('*')
      .gte('date', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      .order('date', { ascending: false })
    
    if (ruleId) {
      metricsQuery = metricsQuery.eq('automation_rule_id', ruleId)
    }
    
    const { data: detailedMetrics, error: metricsError } = await metricsQuery
    
    if (metricsError) {
      console.error('Error fetching automation metrics:', metricsError)
      return NextResponse.json({ error: 'Failed to fetch automation metrics' }, { status: 500 })
    }
    
    // Get recent executions for analysis
    let executionsQuery = (supabase as any)
      .from('automation_executions')
      .select(`
        id,
        automation_rule_id,
        execution_status,
        execution_time_ms,
        executed_at,
        automation_rule:automation_rules(name),
        workflow_template:workflow_templates(name)
      `)
      .gte('executed_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
      .order('executed_at', { ascending: false })
      .limit(100)
    
    if (ruleId) {
      executionsQuery = executionsQuery.eq('automation_rule_id', ruleId)
    }
    
    if (workflowId) {
      executionsQuery = executionsQuery.eq('workflow_template_id', workflowId)
    }
    
    const { data: recentExecutions, error: executionsError } = await executionsQuery
    
    if (executionsError) {
      console.error('Error fetching automation executions:', executionsError)
      return NextResponse.json({ error: 'Failed to fetch executions data' }, { status: 500 })
    }
    
    // Calculate aggregated statistics
    const aggregatedStats = calculateAggregatedStats(recentExecutions || [], detailedMetrics || [], aggregation)
    
    // Calculate performance insights
    const insights = calculatePerformanceInsights(rulesSummary || [], recentExecutions || [])
    
    return NextResponse.json({
      summary: {
        total_rules: rulesSummary?.length || 0,
        active_rules: rulesSummary?.filter((r: any) => r.is_active).length || 0,
        total_executions: recentExecutions?.length || 0,
        successful_executions: recentExecutions?.filter((e: any) => e.execution_status === 'success').length || 0,
        failed_executions: recentExecutions?.filter((e: any) => e.execution_status === 'failed').length || 0,
        average_execution_time: recentExecutions?.length > 0 
          ? Math.round(recentExecutions.reduce((sum: number, e: any) => sum + (e.execution_time_ms || 0), 0) / recentExecutions.length)
          : 0
      },
      rules_performance: rulesSummary || [],
      detailed_metrics: detailedMetrics || [],
      recent_executions: recentExecutions || [],
      aggregated_stats: aggregatedStats,
      insights,
      filters: {
        rule_id: ruleId,
        workflow_id: workflowId,
        days,
        aggregation
      }
    })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Helper function to calculate aggregated statistics
function calculateAggregatedStats(executions: any[], metrics: any[], aggregation: string) {
  const stats: any = {}
  
  // Group executions by time period
  const groupedExecutions = executions.reduce((groups, execution) => {
    const date = new Date(execution.executed_at)
    let key: string
    
    switch (aggregation) {
      case 'weekly':
        const weekStart = new Date(date)
        weekStart.setDate(date.getDate() - date.getDay())
        key = weekStart.toISOString().split('T')[0]
        break
      case 'monthly':
        key = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`
        break
      default: // daily
        key = date.toISOString().split('T')[0]
    }
    
    if (!groups[key]) {
      groups[key] = []
    }
    groups[key].push(execution)
    return groups
  }, {} as { [key: string]: any[] })
  
  // Calculate statistics for each period
  Object.entries(groupedExecutions).forEach(([period, periodExecutions]) => {
    const executions = periodExecutions as any[]
    const successful = executions.filter((e: any) => e.execution_status === 'success').length
    const failed = executions.filter((e: any) => e.execution_status === 'failed').length
    const avgTime = executions.length > 0 
      ? Math.round(executions.reduce((sum: number, e: any) => sum + (e.execution_time_ms || 0), 0) / executions.length)
      : 0
    
    stats[period] = {
      total: executions.length,
      successful,
      failed,
      success_rate: executions.length > 0 ? (successful / executions.length) * 100 : 0,
      average_execution_time: avgTime
    }
  })
  
  return stats
}

// Helper function to calculate performance insights
function calculatePerformanceInsights(rules: any[], executions: any[]) {
  const insights = {
    top_performing_rules: [] as any[],
    slow_rules: [] as any[],
    frequently_failing_rules: [] as any[],
    recommendations: [] as string[]
  }
  
  // Top performing rules (high execution count, low failure rate)
  insights.top_performing_rules = rules
    .filter(rule => rule.execution_count > 0)
    .sort((a, b) => b.execution_count - a.execution_count)
    .slice(0, 5)
    .map(rule => {
      const ruleExecutions = executions.filter(e => e.automation_rule_id === rule.id)
      const failureRate = ruleExecutions.length > 0 
        ? (ruleExecutions.filter(e => e.execution_status === 'failed').length / ruleExecutions.length) * 100
        : 0
      
      return {
        ...rule,
        recent_executions: ruleExecutions.length,
        failure_rate: Math.round(failureRate)
      }
    })
  
  // Slow rules (high average execution time)
  insights.slow_rules = rules
    .filter(rule => rule.average_execution_time_ms > 1000) // > 1 second
    .sort((a, b) => b.average_execution_time_ms - a.average_execution_time_ms)
    .slice(0, 5)
  
  // Frequently failing rules
  const ruleFailureRates = rules.map(rule => {
    const ruleExecutions = executions.filter(e => e.automation_rule_id === rule.id)
    const failureRate = ruleExecutions.length > 0 
      ? (ruleExecutions.filter(e => e.execution_status === 'failed').length / ruleExecutions.length) * 100
      : 0
    
    return {
      ...rule,
      failure_rate: failureRate,
      recent_executions: ruleExecutions.length
    }
  })
  
  insights.frequently_failing_rules = ruleFailureRates
    .filter(rule => rule.failure_rate > 20 && rule.recent_executions > 5) // > 20% failure rate
    .sort((a, b) => b.failure_rate - a.failure_rate)
    .slice(0, 5)
  
  // Generate recommendations
  if (insights.slow_rules.length > 0) {
    insights.recommendations.push(`${insights.slow_rules.length} rules have execution times > 1 second. Consider optimizing their conditions.`)
  }
  
  if (insights.frequently_failing_rules.length > 0) {
    insights.recommendations.push(`${insights.frequently_failing_rules.length} rules have high failure rates. Review their conditions and actions.`)
  }
  
  const inactiveRules = rules.filter(rule => !rule.is_active).length
  if (inactiveRules > 0) {
    insights.recommendations.push(`${inactiveRules} rules are inactive. Consider removing unused rules.`)
  }
  
  const totalSuccess = executions.filter(e => e.execution_status === 'success').length
  const totalExecutions = executions.length
  const overallSuccessRate = totalExecutions > 0 ? (totalSuccess / totalExecutions) * 100 : 0
  
  if (overallSuccessRate < 90) {
    insights.recommendations.push(`Overall success rate is ${Math.round(overallSuccessRate)}%. Review failing automations.`)
  }
  
  return insights
} 