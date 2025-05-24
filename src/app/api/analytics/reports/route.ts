import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

interface ReportConfig {
  title: string
  description: string
  sections: ReportSection[]
  format: 'json' | 'csv' | 'pdf'
  filters: ReportFilters
}

interface ReportSection {
  type: 'summary' | 'timeSeries' | 'breakdown' | 'comparison' | 'list'
  title: string
  metrics: string[]
  groupBy?: string
  sortBy?: string
  limit?: number
}

interface ReportFilters {
  dateRange: {
    start: string
    end: string
  }
  stages?: string[]
  workers?: string[]
  products?: string[]
  workflows?: string[]
  severity?: string[]
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
      .select('role, is_active')
      .eq('auth_user_id', user.id)
      .single()
    
    if (!worker?.is_active || !['manager', 'supervisor'].includes(worker.role || '')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    // Parse report configuration
    const config: ReportConfig = await request.json()
    
    // Validate configuration
    if (!config.title || !config.sections || config.sections.length === 0) {
      return NextResponse.json({ 
        error: 'Invalid report configuration' 
      }, { status: 400 })
    }
    
    // Generate report data
    const reportData: any = {
      metadata: {
        title: config.title,
        description: config.description,
        generatedAt: new Date().toISOString(),
        generatedBy: user.email,
        filters: config.filters
      },
      sections: []
    }
    
    // Process each section
    for (const section of config.sections) {
      const sectionData = await generateReportSection(
        supabase,
        section,
        config.filters
      )
      
      reportData.sections.push({
        title: section.title,
        type: section.type,
        data: sectionData
      })
    }
    
    // Format output based on requested format
    switch (config.format) {
      case 'csv':
        return generateCSVResponse(reportData)
      case 'pdf':
        // PDF generation would require additional libraries
        return NextResponse.json({ 
          error: 'PDF format not yet implemented' 
        }, { status: 501 })
      default:
        return NextResponse.json(reportData)
    }
    
  } catch (error) {
    console.error('Report Generation API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET endpoint for predefined reports
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
    
    // Get report type
    const searchParams = request.nextUrl.searchParams
    const reportType = searchParams.get('type') || 'daily'
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0]
    
    let reportConfig: ReportConfig
    
    switch (reportType) {
      case 'daily':
        reportConfig = getDailyReportConfig(date)
        break
      case 'weekly':
        reportConfig = getWeeklyReportConfig(date)
        break
      case 'worker-performance':
        reportConfig = getWorkerPerformanceReportConfig(date)
        break
      case 'stage-efficiency':
        reportConfig = getStageEfficiencyReportConfig(date)
        break
      case 'issue-analysis':
        reportConfig = getIssueAnalysisReportConfig(date)
        break
      default:
        return NextResponse.json({ 
          error: 'Invalid report type' 
        }, { status: 400 })
    }
    
    // Generate the report
    const reportData: any = {
      metadata: {
        title: reportConfig.title,
        description: reportConfig.description,
        generatedAt: new Date().toISOString(),
        generatedBy: user.email,
        filters: reportConfig.filters
      },
      sections: []
    }
    
    for (const section of reportConfig.sections) {
      const sectionData = await generateReportSection(
        supabase,
        section,
        reportConfig.filters
      )
      
      reportData.sections.push({
        title: section.title,
        type: section.type,
        data: sectionData
      })
    }
    
    return NextResponse.json(reportData)
    
  } catch (error) {
    console.error('Report Generation API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Helper function to generate report sections
async function generateReportSection(
  supabase: any,
  section: ReportSection,
  filters: ReportFilters
): Promise<any> {
  const { dateRange, stages, workers, products, workflows } = filters
  
  switch (section.type) {
    case 'summary':
      return generateSummarySection(supabase, section, filters)
    
    case 'timeSeries':
      return generateTimeSeriesSection(supabase, section, filters)
    
    case 'breakdown':
      return generateBreakdownSection(supabase, section, filters)
    
    case 'comparison':
      return generateComparisonSection(supabase, section, filters)
    
    case 'list':
      return generateListSection(supabase, section, filters)
    
    default:
      return { error: 'Unknown section type' }
  }
}

async function generateSummarySection(
  supabase: any,
  section: ReportSection,
  filters: ReportFilters
): Promise<any> {
  const summary: any = {}
  
  for (const metric of section.metrics) {
    switch (metric) {
      case 'totalOrders':
        const orders = await supabase
          .from('orders')
          .select('id')
          .gte('created_at', filters.dateRange.start)
          .lte('created_at', filters.dateRange.end)
        summary.totalOrders = orders.data?.length || 0
        break
      
      case 'completedTasks':
        const tasks = await supabase
          .from('work_tasks')
          .select('id')
          .eq('status', 'completed')
          .gte('completed_at', filters.dateRange.start)
          .lte('completed_at', filters.dateRange.end)
        summary.completedTasks = tasks.data?.length || 0
        break
      
      case 'activeWorkers':
        const workers = await supabase
          .from('time_logs')
          .select('worker_id')
          .gte('start_time', filters.dateRange.start)
          .lte('start_time', filters.dateRange.end)
        const uniqueWorkers = new Set(workers.data?.map((w: any) => w.worker_id))
        summary.activeWorkers = uniqueWorkers.size
        break
      
      case 'avgCompletionTime':
        const completedTasks = await supabase
          .from('work_tasks')
          .select('created_at, completed_at')
          .eq('status', 'completed')
          .gte('completed_at', filters.dateRange.start)
          .lte('completed_at', filters.dateRange.end)
          .not('completed_at', 'is', null)
        
        if (completedTasks.data && completedTasks.data.length > 0) {
          const totalTime = completedTasks.data.reduce((sum: number, task: any) => {
            const created = new Date(task.created_at)
            const completed = new Date(task.completed_at)
            return sum + (completed.getTime() - created.getTime())
          }, 0)
          summary.avgCompletionTime = Math.round(totalTime / completedTasks.data.length / (1000 * 60 * 60))
        } else {
          summary.avgCompletionTime = 0
        }
        break
      
      case 'issueRate':
        const issues = await supabase
          .from('production_issues')
          .select('id')
          .gte('created_at', filters.dateRange.start)
          .lte('created_at', filters.dateRange.end)
        
        const allTasks = await supabase
          .from('work_tasks')
          .select('id')
          .gte('created_at', filters.dateRange.start)
          .lte('created_at', filters.dateRange.end)
        
        summary.issueRate = allTasks.data?.length > 0 
          ? ((issues.data?.length || 0) / allTasks.data.length * 100).toFixed(2)
          : 0
        break
    }
  }
  
  return summary
}

async function generateTimeSeriesSection(
  supabase: any,
  section: ReportSection,
  filters: ReportFilters
): Promise<any> {
  // Implementation would generate time series data
  // This is a simplified version
  const data = []
  const startDate = new Date(filters.dateRange.start)
  const endDate = new Date(filters.dateRange.end)
  
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const dayStart = new Date(d)
    const dayEnd = new Date(d)
    dayEnd.setDate(dayEnd.getDate() + 1)
    
    const dayData: any = {
      date: dayStart.toISOString().split('T')[0]
    }
    
    for (const metric of section.metrics) {
      switch (metric) {
        case 'tasksCompleted':
          const tasks = await supabase
            .from('work_tasks')
            .select('id')
            .eq('status', 'completed')
            .gte('completed_at', dayStart.toISOString())
            .lt('completed_at', dayEnd.toISOString())
          dayData.tasksCompleted = tasks.data?.length || 0
          break
        
        case 'hoursWorked':
          const timeLogs = await supabase
            .from('time_logs')
            .select('duration_minutes')
            .gte('start_time', dayStart.toISOString())
            .lt('start_time', dayEnd.toISOString())
            .not('duration_minutes', 'is', null)
          
          const totalMinutes = timeLogs.data?.reduce((sum: number, log: any) => 
            sum + (log.duration_minutes || 0), 0) || 0
          dayData.hoursWorked = (totalMinutes / 60).toFixed(1)
          break
      }
    }
    
    data.push(dayData)
  }
  
  return data
}

async function generateBreakdownSection(
  supabase: any,
  section: ReportSection,
  filters: ReportFilters
): Promise<any> {
  const breakdownData: any = {}
  
  if (section.groupBy === 'stage') {
    const stages = await supabase
      .from('work_tasks')
      .select('stage, status')
      .gte('created_at', filters.dateRange.start)
      .lte('created_at', filters.dateRange.end)
    
    stages.data?.forEach((task: any) => {
      if (!task.stage) return
      
      if (!breakdownData[task.stage]) {
        breakdownData[task.stage] = {
          total: 0,
          completed: 0,
          inProgress: 0,
          assigned: 0
        }
      }
      
      breakdownData[task.stage].total++
      breakdownData[task.stage][task.status]++
    })
  }
  
  return Object.entries(breakdownData).map(([key, value]) => ({
    [section.groupBy || 'key']: key,
    ...(typeof value === 'object' && value !== null ? value : { value })
  }))
}

async function generateComparisonSection(
  supabase: any,
  section: ReportSection,
  filters: ReportFilters
): Promise<any> {
  // Compare metrics across different dimensions
  return {
    message: 'Comparison section implementation pending'
  }
}

async function generateListSection(
  supabase: any,
  section: ReportSection,
  filters: ReportFilters
): Promise<any> {
  // Return detailed list data
  const limit = section.limit || 100
  
  switch (section.metrics[0]) {
    case 'topWorkers':
      const workers = await supabase
        .from('time_logs')
        .select(`
          worker_id,
          duration_minutes,
          worker:workers(name)
        `)
        .gte('start_time', filters.dateRange.start)
        .lte('start_time', filters.dateRange.end)
        .not('duration_minutes', 'is', null)
      
      const workerTotals: any = {}
      workers.data?.forEach((log: any) => {
        const id = log.worker_id
        if (!workerTotals[id]) {
          workerTotals[id] = {
            name: log.worker?.name || 'Unknown',
            totalMinutes: 0,
            totalHours: 0
          }
        }
        workerTotals[id].totalMinutes += log.duration_minutes
      })
      
      return Object.entries(workerTotals)
        .map(([id, data]: [string, any]) => ({
          workerId: id,
          name: data.name,
          totalHours: (data.totalMinutes / 60).toFixed(1)
        }))
        .sort((a, b) => parseFloat(b.totalHours) - parseFloat(a.totalHours))
        .slice(0, limit)
    
    default:
      return []
  }
}

// Predefined report configurations
function getDailyReportConfig(date: string): ReportConfig {
  return {
    title: `Daily Production Report - ${date}`,
    description: 'Comprehensive daily production metrics and analysis',
    format: 'json',
    filters: {
      dateRange: {
        start: `${date}T00:00:00Z`,
        end: `${date}T23:59:59Z`
      }
    },
    sections: [
      {
        type: 'summary',
        title: 'Daily Summary',
        metrics: ['totalOrders', 'completedTasks', 'activeWorkers', 'avgCompletionTime', 'issueRate']
      },
      {
        type: 'breakdown',
        title: 'Tasks by Stage',
        metrics: ['taskCount'],
        groupBy: 'stage'
      },
      {
        type: 'list',
        title: 'Top Performers',
        metrics: ['topWorkers'],
        limit: 10
      }
    ]
  }
}

function getWeeklyReportConfig(date: string): ReportConfig {
  const endDate = new Date(date)
  const startDate = new Date(date)
  startDate.setDate(startDate.getDate() - 7)
  
  return {
    title: `Weekly Production Report - Week ending ${date}`,
    description: 'Weekly production trends and performance analysis',
    format: 'json',
    filters: {
      dateRange: {
        start: startDate.toISOString(),
        end: endDate.toISOString()
      }
    },
    sections: [
      {
        type: 'summary',
        title: 'Weekly Summary',
        metrics: ['totalOrders', 'completedTasks', 'activeWorkers', 'avgCompletionTime', 'issueRate']
      },
      {
        type: 'timeSeries',
        title: 'Daily Trends',
        metrics: ['tasksCompleted', 'hoursWorked']
      },
      {
        type: 'breakdown',
        title: 'Stage Performance',
        metrics: ['taskCount', 'avgCompletionTime'],
        groupBy: 'stage'
      }
    ]
  }
}

function getWorkerPerformanceReportConfig(date: string): ReportConfig {
  const endDate = new Date(date)
  const startDate = new Date(date)
  startDate.setDate(startDate.getDate() - 30)
  
  return {
    title: 'Worker Performance Report',
    description: '30-day worker performance analysis',
    format: 'json',
    filters: {
      dateRange: {
        start: startDate.toISOString(),
        end: endDate.toISOString()
      }
    },
    sections: [
      {
        type: 'list',
        title: 'Worker Rankings',
        metrics: ['topWorkers'],
        limit: 50
      }
    ]
  }
}

function getStageEfficiencyReportConfig(date: string): ReportConfig {
  const endDate = new Date(date)
  const startDate = new Date(date)
  startDate.setDate(startDate.getDate() - 7)
  
  return {
    title: 'Stage Efficiency Report',
    description: 'Analysis of production stage performance',
    format: 'json',
    filters: {
      dateRange: {
        start: startDate.toISOString(),
        end: endDate.toISOString()
      }
    },
    sections: [
      {
        type: 'breakdown',
        title: 'Stage Metrics',
        metrics: ['taskCount', 'avgWaitTime', 'throughput'],
        groupBy: 'stage'
      }
    ]
  }
}

function getIssueAnalysisReportConfig(date: string): ReportConfig {
  const endDate = new Date(date)
  const startDate = new Date(date)
  startDate.setDate(startDate.getDate() - 30)
  
  return {
    title: 'Production Issue Analysis',
    description: '30-day analysis of production issues',
    format: 'json',
    filters: {
      dateRange: {
        start: startDate.toISOString(),
        end: endDate.toISOString()
      }
    },
    sections: [
      {
        type: 'breakdown',
        title: 'Issues by Stage',
        metrics: ['issueCount', 'severity'],
        groupBy: 'stage'
      }
    ]
  }
}

// CSV generation helper
function generateCSVResponse(reportData: any): NextResponse {
  // Simple CSV generation - would be more sophisticated in production
  let csv = `${reportData.metadata.title}\n`
  csv += `Generated: ${reportData.metadata.generatedAt}\n\n`
  
  reportData.sections.forEach((section: any) => {
    csv += `${section.title}\n`
    
    if (Array.isArray(section.data) && section.data.length > 0) {
      // Get headers from first item
      const headers = Object.keys(section.data[0])
      csv += headers.join(',') + '\n'
      
      // Add data rows
      section.data.forEach((item: any) => {
        csv += headers.map(h => item[h]).join(',') + '\n'
      })
    } else if (typeof section.data === 'object') {
      // Handle object data
      Object.entries(section.data).forEach(([key, value]) => {
        csv += `${key},${value}\n`
      })
    }
    
    csv += '\n'
  })
  
  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="${reportData.metadata.title.replace(/\s+/g, '_')}.csv"`
    }
  })
}