import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Package, 
  Users, 
  Clock, 
  AlertCircle, 
  GitBranch, 
  Zap, 
  TrendingUp, 
  Factory,
  Shield,
  Target,
  BarChart3,
  FileText,
  CheckCircle,
  XCircle,
  ClipboardList
} from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'

export default async function ManagerDashboard() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error || !user) {
    redirect('/login')
  }
  
  // Get dashboard statistics
  const [ordersResult, tasksResult, workersResult, workflowsResult, batchesResult] = await Promise.all([
    supabase
      .from('orders')
      .select('id, status')
      .order('created_at', { ascending: false }),
    supabase
      .from('work_tasks')
      .select('id, status, priority, stage, batch_id, workflow_template_id'),
    supabase
      .from('workers')
      .select('id, name, role, is_active')
      .eq('is_active', true),
    supabase
      .from('workflow_templates')
      .select('id, name, is_active, stages')
      .eq('is_active', true),
    supabase
      .from('work_batches')
      .select('id, name, current_stage, status, workflow_template_id, order_item_ids')
  ])

  const stats = {
    totalOrders: ordersResult.data?.length || 0,
    pendingOrders: ordersResult.data?.filter(o => o.status === 'pending').length || 0,
    totalTasks: tasksResult.data?.length || 0,
    pendingTasks: tasksResult.data?.filter(t => t.status === 'pending').length || 0,
    inProgressTasks: tasksResult.data?.filter(t => t.status === 'in_progress').length || 0,
    completedTasks: tasksResult.data?.filter(t => t.status === 'completed').length || 0,
    urgentTasks: tasksResult.data?.filter(t => t.priority === 'urgent').length || 0,
    activeWorkers: workersResult.data?.filter(w => w.role === 'worker').length || 0,
    totalWorkers: workersResult.data?.length || 0,
    totalBatches: batchesResult.data?.length || 0,
    activeBatches: batchesResult.data?.filter(b => b.status === 'active').length || 0,
    activeWorkflows: workflowsResult.data?.length || 0
  }

  // Calculate quality metrics (mock data for now)
  const qualityMetrics = {
    firstPassYield: 94.5,
    defectRate: 5.5,
    reworkRate: 3.2,
    qualityScore: 96.8,
    monthlyTrend: +2.3
  }

  // Stage distribution for production flow
  const stageDistribution = new Map()
  batchesResult.data?.forEach(batch => {
    if (batch.current_stage) {
      const count = stageDistribution.get(batch.current_stage) || 0
      stageDistribution.set(batch.current_stage, count + 1)
    }
  })

  const productionFlow = Array.from(stageDistribution.entries())
    .map(([stage, count]) => ({
      stage: stage.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()),
      count,
      percentage: Math.round((count / stats.totalBatches) * 100) || 0
    }))
    .sort((a, b) => b.count - a.count)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Operations Dashboard</h1>
          <p className="text-muted-foreground mt-1">Monitor production, quality, and team performance</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/manager/production-flow">
              <GitBranch className="h-4 w-4 mr-2" />
              Production Board
            </Link>
          </Button>
          <Button asChild>
            <Link href="/manager/orders">
              <Package className="h-4 w-4 mr-2" />
              Import Orders
            </Link>
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Production</CardTitle>
            <Factory className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeBatches}</div>
            <p className="text-xs text-muted-foreground">
              {stats.inProgressTasks} tasks in progress
            </p>
            <Progress value={(stats.activeBatches / stats.totalBatches) * 100} className="mt-2 h-1" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Quality Score</CardTitle>
            <Shield className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{qualityMetrics.qualityScore}%</div>
            <p className="text-xs text-muted-foreground">
              FPY: {qualityMetrics.firstPassYield}%
            </p>
            <div className="flex items-center mt-1">
              <TrendingUp className="h-3 w-3 text-green-600 mr-1" />
              <span className="text-xs text-green-600">+{qualityMetrics.monthlyTrend}% this month</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Team Status</CardTitle>
            <Users className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeWorkers}</div>
            <p className="text-xs text-muted-foreground">
              of {stats.totalWorkers} workers active
            </p>
            <Progress value={(stats.activeWorkers / stats.totalWorkers) * 100} className="mt-2 h-1" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Urgent Items</CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.urgentTasks}</div>
            <p className="text-xs text-muted-foreground">
              requiring immediate attention
            </p>
            {stats.urgentTasks > 0 && (
              <Button size="sm" variant="link" className="p-0 h-auto mt-1" asChild>
                <Link href="/manager/tasks">View urgent tasks →</Link>
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="production" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="production">Production Overview</TabsTrigger>
          <TabsTrigger value="quality">Quality Metrics</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="production" className="space-y-4">
          {/* Production Flow */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Factory className="h-5 w-5" />
                  Production Pipeline
                </span>
                <Button size="sm" variant="outline" asChild>
                  <Link href="/manager/production-flow">View Full Board</Link>
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {productionFlow.length > 0 ? (
                <div className="space-y-4">
                  {productionFlow.slice(0, 5).map((stage) => (
                    <div key={stage.stage} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{stage.stage}</span>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">{stage.count} batches</Badge>
                          <span className="text-sm text-muted-foreground">{stage.percentage}%</span>
                        </div>
                      </div>
                      <Progress value={stage.percentage} className="h-2" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Factory className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No active production batches</p>
                  <Button size="sm" variant="outline" className="mt-2" asChild>
                    <Link href="/manager/orders">Import Orders to Start</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <Link href="/manager/workflows">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Zap className="h-5 w-5" />
                    Workflow Builder
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Create and manage production workflows with quality gates
                  </p>
                </CardContent>
              </Link>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <Link href="/manager/tasks">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <ClipboardList className="h-5 w-5" />
                    Task Assignment
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {stats.pendingTasks} tasks pending assignment
                  </p>
                </CardContent>
              </Link>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <Link href="/manager/components">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Target className="h-5 w-5" />
                    Component Tracking
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Track components with QR codes
                  </p>
                </CardContent>
              </Link>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="quality" className="space-y-4">
          {/* Quality Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Quality Metrics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">First Pass Yield</span>
                    <span className="font-semibold">{qualityMetrics.firstPassYield}%</span>
                  </div>
                  <Progress value={qualityMetrics.firstPassYield} className="h-2" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Defect Rate</span>
                    <span className="font-semibold">{qualityMetrics.defectRate}%</span>
                  </div>
                  <Progress value={qualityMetrics.defectRate} className="h-2 bg-red-100" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Rework Rate</span>
                    <span className="font-semibold">{qualityMetrics.reworkRate}%</span>
                  </div>
                  <Progress value={qualityMetrics.reworkRate} className="h-2 bg-yellow-100" />
                </div>
                <Button className="w-full mt-4" variant="outline" asChild>
                  <Link href="/manager/analytics">View Detailed Analytics</Link>
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" />
                  Recent Issues
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <XCircle className="h-4 w-4 text-red-600 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Driver Alignment Issue</p>
                      <p className="text-xs text-muted-foreground">Batch #2024-145 - 2 hours ago</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Surface Finish Warning</p>
                      <p className="text-xs text-muted-foreground">Batch #2024-144 - 5 hours ago</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Quality Hold Released</p>
                      <p className="text-xs text-muted-foreground">Batch #2024-143 - 1 day ago</p>
                    </div>
                  </div>
                </div>
                <Button className="w-full mt-4" variant="outline" asChild>
                  <Link href="/manager/quality-holds">Manage Quality Holds</Link>
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Quick Quality Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <Link href="/manager/reports">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <FileText className="h-5 w-5" />
                    Quality Reports
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Generate reports and quality certificates
                  </p>
                </CardContent>
              </Link>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <Link href="/manager/automation">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Zap className="h-5 w-5" />
                    Quality Automation
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Configure automated quality rules
                  </p>
                </CardContent>
              </Link>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          {/* Performance Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Team Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold">{stats.completedTasks}</p>
                    <p className="text-xs text-muted-foreground">Tasks Completed</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {stats.totalTasks > 0 
                        ? Math.round((stats.completedTasks / stats.totalTasks) * 100) 
                        : 0}%
                    </p>
                    <p className="text-xs text-muted-foreground">Completion Rate</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {stats.activeWorkers > 0 
                        ? Math.round(stats.inProgressTasks / stats.activeWorkers * 10) / 10
                        : 0}
                    </p>
                    <p className="text-xs text-muted-foreground">Avg Tasks/Worker</p>
                  </div>
                </div>
                <Separator />
                <div className="pt-2">
                  <Button className="w-full" variant="outline" asChild>
                    <Link href="/manager/workers">View Worker Details</Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Workflow Performance */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Workflow Efficiency
                </span>
                <Badge variant="outline">{stats.activeWorkflows} active</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <span className="text-sm font-medium">Automation Rate</span>
                  <div className="flex items-center gap-2">
                    <Progress value={78} className="w-24 h-2" />
                    <span className="text-sm font-semibold">78%</span>
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <span className="text-sm font-medium">Avg Cycle Time</span>
                  <span className="text-sm font-semibold">4.2 hours</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <span className="text-sm font-medium">Throughput</span>
                  <span className="text-sm font-semibold">125 units/day</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}