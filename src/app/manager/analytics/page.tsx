'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { 
  Activity, 
  AlertTriangle, 
  BarChart3, 
  Clock, 
  Download, 
  Filter,
  Package,
  TrendingUp,
  Users,
  Zap,
  AlertCircle,
  CheckCircle,
  XCircle
} from 'lucide-react'

interface ProductionMetrics {
  summary: {
    kpis: {
      totalOrders: number
      completedOrders: number
      orderCompletionRate: string
      totalTasks: number
      completedTasks: number
      taskCompletionRate: string
      avgTaskEfficiency: string
      totalIssues: number
      resolvedIssues: number
      issueResolutionRate: string
    }
  }
  stageMetrics: Array<{
    stage: string
    totalTransitions: number
    automationRate: string
    autoTransitions: number
    manualTransitions: number
  }>
  topWorkers: Array<{
    id: string
    name: string
    totalHours: string
    taskCount: number
    avgMinutesPerTask: string
  }>
  timeSeriesData: Array<{
    date: string
    created: number
    completed: number
    inProgress: number
  }>
  issuesByStage: Array<{
    stage: string
    total: number
    critical: number
    high: number
    medium: number
    low: number
    resolved: number
  }>
}

interface RealTimeMetrics {
  liveMetrics: {
    activeWorkers: number
    activeTasks: number
    todayCreated: number
    todayCompleted: number
    todayInProgress: number
    throughputPerHour: string
  }
  activeWorkers: Array<{
    workerId: string
    workerName: string
    currentStage: string
    minutesActive: number
  }>
  tasksByStage: Array<{
    stage: string
    count: number
    assigned: number
    inProgress: number
    highPriority: number
  }>
  bottlenecks: Array<{
    stage: string
    waitingTasks: number
    avgWaitMinutes: number
    maxWaitMinutes: number
    severity: string
  }>
  systemHealth: {
    workersUtilization: string
    taskBacklog: string
    bottleneckSeverity: string
    issueRate: string
  }
}

export default function AnalyticsPage() {
  const [productionMetrics, setProductionMetrics] = useState<ProductionMetrics | null>(null)
  const [realTimeMetrics, setRealTimeMetrics] = useState<RealTimeMetrics | null>(null)
  const [bottlenecks, setBottlenecks] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState('7d')
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null)
  const { toast } = useToast()

  const fetchAnalytics = async () => {
    try {
      const [production, realTime, bottleneckData] = await Promise.all([
        fetch(`/api/analytics/production?period=${period}`).then(r => r.json()),
        fetch('/api/analytics/real-time').then(r => r.json()),
        fetch('/api/analytics/bottlenecks?window=4h').then(r => r.json())
      ])

      setProductionMetrics(production)
      setRealTimeMetrics(realTime)
      setBottlenecks(bottleneckData)
    } catch (error) {
      toast({
        title: 'Failed to load analytics',
        description: 'Unable to fetch analytics data',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAnalytics()
    
    // Set up real-time refresh every 30 seconds
    const interval = setInterval(fetchAnalytics, 30000)
    setRefreshInterval(interval)
    
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [period])

  const generateReport = async (reportType: string) => {
    try {
      const response = await fetch(`/api/analytics/reports?type=${reportType}`)
      const data = await response.json()
      
      // Download as JSON (in production, could offer CSV/PDF options)
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${reportType}-report-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
      toast({
        title: 'Report generated',
        description: `${reportType} report has been downloaded`
      })
    } catch (error) {
      toast({
        title: 'Report generation failed',
        description: 'Unable to generate report',
        variant: 'destructive'
      })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[600px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading analytics...</p>
        </div>
      </div>
    )
  }

  const getHealthColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600'
      case 'warning': return 'text-yellow-600'
      case 'critical': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical': return <Badge variant="destructive">Critical</Badge>
      case 'high': return <Badge variant="default">High</Badge>
      case 'medium': return <Badge variant="secondary">Medium</Badge>
      case 'low': return <Badge variant="outline">Low</Badge>
      default: return <Badge>{severity}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Production Analytics</h2>
          <p className="text-muted-foreground">
            Real-time production metrics and performance analysis
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => fetchAnalytics()}>
            <Activity className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* System Health Overview */}
      {realTimeMetrics && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              System Health
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-sm text-muted-foreground">Worker Utilization</div>
                <div className={`text-lg font-semibold ${getHealthColor(realTimeMetrics.systemHealth.workersUtilization)}`}>
                  {realTimeMetrics.systemHealth.workersUtilization.toUpperCase()}
                </div>
              </div>
              <div className="text-center">
                <div className="text-sm text-muted-foreground">Task Backlog</div>
                <div className={`text-lg font-semibold ${getHealthColor(realTimeMetrics.systemHealth.taskBacklog)}`}>
                  {realTimeMetrics.systemHealth.taskBacklog.toUpperCase()}
                </div>
              </div>
              <div className="text-center">
                <div className="text-sm text-muted-foreground">Bottlenecks</div>
                <div className={`text-lg font-semibold ${getHealthColor(realTimeMetrics.systemHealth.bottleneckSeverity)}`}>
                  {realTimeMetrics.systemHealth.bottleneckSeverity.toUpperCase()}
                </div>
              </div>
              <div className="text-center">
                <div className="text-sm text-muted-foreground">Issue Rate</div>
                <div className={`text-lg font-semibold ${getHealthColor(realTimeMetrics.systemHealth.issueRate)}`}>
                  {realTimeMetrics.systemHealth.issueRate.toUpperCase()}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Analytics Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="realtime">Real-Time</TabsTrigger>
          <TabsTrigger value="bottlenecks">Bottlenecks</TabsTrigger>
          <TabsTrigger value="workers">Workers</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          {productionMetrics && (
            <>
              {/* KPI Cards */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
                    <Package className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{productionMetrics.summary.kpis.totalOrders}</div>
                    <p className="text-xs text-muted-foreground">
                      {productionMetrics.summary.kpis.completedOrders} completed ({productionMetrics.summary.kpis.orderCompletionRate}%)
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Task Completion</CardTitle>
                    <CheckCircle className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{productionMetrics.summary.kpis.taskCompletionRate}%</div>
                    <p className="text-xs text-muted-foreground">
                      {productionMetrics.summary.kpis.completedTasks} of {productionMetrics.summary.kpis.totalTasks} tasks
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Efficiency</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{productionMetrics.summary.kpis.avgTaskEfficiency}%</div>
                    <p className="text-xs text-muted-foreground">
                      Average task efficiency
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Issue Resolution</CardTitle>
                    <AlertCircle className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{productionMetrics.summary.kpis.issueResolutionRate}%</div>
                    <p className="text-xs text-muted-foreground">
                      {productionMetrics.summary.kpis.resolvedIssues} of {productionMetrics.summary.kpis.totalIssues} resolved
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Stage Metrics */}
              <Card>
                <CardHeader>
                  <CardTitle>Stage Performance</CardTitle>
                  <CardDescription>Automation rates and transition metrics by stage</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {productionMetrics.stageMetrics.map((stage) => (
                      <div key={stage.stage} className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div>
                            <div className="font-medium capitalize">{stage.stage.replace('_', ' ')}</div>
                            <div className="text-sm text-muted-foreground">
                              {stage.totalTransitions} transitions
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-4">
                          <div className="text-right">
                            <div className="text-sm font-medium">{stage.automationRate}%</div>
                            <div className="text-xs text-muted-foreground">Automated</div>
                          </div>
                          <Badge variant={parseInt(stage.automationRate) > 70 ? 'default' : 'secondary'}>
                            {stage.autoTransitions} auto / {stage.manualTransitions} manual
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* Real-Time Tab */}
        <TabsContent value="realtime" className="space-y-4">
          {realTimeMetrics && (
            <>
              {/* Live Metrics */}
              <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold">{realTimeMetrics.liveMetrics.activeWorkers}</div>
                    <p className="text-xs text-muted-foreground">Active Workers</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold">{realTimeMetrics.liveMetrics.activeTasks}</div>
                    <p className="text-xs text-muted-foreground">Active Tasks</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold">{realTimeMetrics.liveMetrics.todayCreated}</div>
                    <p className="text-xs text-muted-foreground">Created Today</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold">{realTimeMetrics.liveMetrics.todayCompleted}</div>
                    <p className="text-xs text-muted-foreground">Completed Today</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold">{realTimeMetrics.liveMetrics.todayInProgress}</div>
                    <p className="text-xs text-muted-foreground">In Progress</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold">{realTimeMetrics.liveMetrics.throughputPerHour}</div>
                    <p className="text-xs text-muted-foreground">Per Hour Rate</p>
                  </CardContent>
                </Card>
              </div>

              {/* Active Workers */}
              <Card>
                <CardHeader>
                  <CardTitle>Active Workers</CardTitle>
                  <CardDescription>Currently working on tasks</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {realTimeMetrics.activeWorkers.map((worker) => (
                      <div key={worker.workerId} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                        <div className="flex items-center space-x-3">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="font-medium">{worker.workerName}</div>
                            <div className="text-sm text-muted-foreground">
                              {worker.currentStage.replace('_', ' ')}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm">{worker.minutesActive} min</span>
                        </div>
                      </div>
                    ))}
                    {realTimeMetrics.activeWorkers.length === 0 && (
                      <p className="text-center text-muted-foreground py-4">No active workers</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Tasks by Stage */}
              <Card>
                <CardHeader>
                  <CardTitle>Active Tasks by Stage</CardTitle>
                  <CardDescription>Current task distribution</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {realTimeMetrics.tasksByStage.map((stage) => (
                      <div key={stage.stage} className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-medium capitalize">{stage.stage.replace('_', ' ')}</span>
                          <span className="text-sm text-muted-foreground">{stage.count} tasks</span>
                        </div>
                        <div className="flex gap-2">
                          <Badge variant="outline">{stage.assigned} assigned</Badge>
                          <Badge variant="secondary">{stage.inProgress} in progress</Badge>
                          {stage.highPriority > 0 && (
                            <Badge variant="destructive">{stage.highPriority} high priority</Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* Bottlenecks Tab */}
        <TabsContent value="bottlenecks" className="space-y-4">
          {bottlenecks && (
            <>
              {/* Bottleneck Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5" />
                    Bottleneck Analysis
                  </CardTitle>
                  <CardDescription>
                    {bottlenecks.summary.criticalBottlenecks} critical, {bottlenecks.summary.highBottlenecks} high severity bottlenecks detected
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {bottlenecks.bottlenecks.map((bottleneck: any) => (
                      <Card key={bottleneck.stage}>
                        <CardContent className="pt-6">
                          <div className="flex items-start justify-between">
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <h4 className="font-semibold capitalize">
                                  {bottleneck.stage.replace('_', ' ')}
                                </h4>
                                {getSeverityBadge(bottleneck.severity)}
                              </div>
                              <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                  <span className="text-muted-foreground">Waiting Tasks:</span> {bottleneck.metrics.tasksWaiting}
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Avg Wait:</span> {bottleneck.metrics.avgWaitTime} min
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Max Wait:</span> {bottleneck.metrics.maxWaitTime} min
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Available Workers:</span> {bottleneck.metrics.workersAvailable}
                                </div>
                              </div>
                              <div className="space-y-1 pt-2">
                                <p className="text-sm font-medium">Causes:</p>
                                <ul className="text-sm text-muted-foreground list-disc list-inside">
                                  {bottleneck.causes.map((cause: string, idx: number) => (
                                    <li key={idx}>{cause}</li>
                                  ))}
                                </ul>
                              </div>
                              <div className="space-y-1 pt-2">
                                <p className="text-sm font-medium">Recommendations:</p>
                                <ul className="text-sm text-muted-foreground list-disc list-inside">
                                  {bottleneck.recommendations.map((rec: string, idx: number) => (
                                    <li key={idx}>{rec}</li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                            <Badge variant={
                              bottleneck.historicalTrend === 'improving' ? 'default' :
                              bottleneck.historicalTrend === 'worsening' ? 'destructive' : 'secondary'
                            }>
                              {bottleneck.historicalTrend}
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* System Insights */}
              {bottlenecks.systemInsights.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>System Insights</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {bottlenecks.systemInsights.map((insight: string, idx: number) => (
                        <div key={idx} className="flex items-start gap-2">
                          <div className="text-sm">{insight}</div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>

        {/* Workers Tab */}
        <TabsContent value="workers" className="space-y-4">
          {productionMetrics && (
            <Card>
              <CardHeader>
                <CardTitle>Top Performers</CardTitle>
                <CardDescription>Workers ranked by productivity</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {productionMetrics.topWorkers.map((worker, index) => (
                    <div key={worker.id} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="text-lg font-semibold text-muted-foreground">
                          #{index + 1}
                        </div>
                        <div>
                          <div className="font-medium">{worker.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {worker.taskCount} tasks completed
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">{worker.totalHours} hours</div>
                        <div className="text-sm text-muted-foreground">
                          {worker.avgMinutesPerTask} min/task
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Generate Reports</CardTitle>
              <CardDescription>Download predefined analytics reports</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardContent className="pt-6">
                    <h4 className="font-semibold mb-2">Daily Production Report</h4>
                    <p className="text-sm text-muted-foreground mb-4">
                      Comprehensive daily metrics including task completion, worker performance, and issues
                    </p>
                    <Button onClick={() => generateReport('daily')} className="w-full">
                      <Download className="mr-2 h-4 w-4" />
                      Generate Daily Report
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <h4 className="font-semibold mb-2">Weekly Summary Report</h4>
                    <p className="text-sm text-muted-foreground mb-4">
                      Weekly trends, performance analysis, and productivity insights
                    </p>
                    <Button onClick={() => generateReport('weekly')} className="w-full">
                      <Download className="mr-2 h-4 w-4" />
                      Generate Weekly Report
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <h4 className="font-semibold mb-2">Worker Performance Report</h4>
                    <p className="text-sm text-muted-foreground mb-4">
                      Individual worker metrics, time tracking, and productivity analysis
                    </p>
                    <Button onClick={() => generateReport('worker-performance')} className="w-full">
                      <Download className="mr-2 h-4 w-4" />
                      Generate Performance Report
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <h4 className="font-semibold mb-2">Stage Efficiency Report</h4>
                    <p className="text-sm text-muted-foreground mb-4">
                      Stage-by-stage analysis with bottleneck identification
                    </p>
                    <Button onClick={() => generateReport('stage-efficiency')} className="w-full">
                      <Download className="mr-2 h-4 w-4" />
                      Generate Efficiency Report
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}