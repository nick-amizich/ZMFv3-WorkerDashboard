import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Package, Users, Clock, AlertCircle, GitBranch, Zap, TrendingUp, Factory } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'

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
    urgentTasks: tasksResult.data?.filter(t => t.priority === 'urgent').length || 0,
    activeWorkers: workersResult.data?.filter(w => w.role === 'worker').length || 0,
    totalWorkers: workersResult.data?.length || 0,
    totalBatches: batchesResult.data?.length || 0,
    activeBatches: batchesResult.data?.filter(b => b.status === 'active').length || 0,
    activeWorkflows: workflowsResult.data?.length || 0
  }

  // Workflow performance analysis
  const workflowPerformance = workflowsResult.data?.map(workflow => {
    const workflowBatches = batchesResult.data?.filter(b => b.workflow_template_id === workflow.id) || []
    const workflowTasks = tasksResult.data?.filter(t => t.workflow_template_id === workflow.id) || []
    const automatedTasks = workflowTasks.filter(t => t.stage && !t.batch_id)
    
    return {
      id: workflow.id,
      name: workflow.name,
      batchCount: workflowBatches.length,
      activeBatches: workflowBatches.filter(b => b.status === 'active').length,
      taskCount: workflowTasks.length,
      automationRate: workflowTasks.length > 0 
        ? Math.round((automatedTasks.length / workflowTasks.length) * 100) 
        : 0,
      stages: Array.isArray(workflow.stages) ? workflow.stages.length : 0
    }
  }) || []

  // Stage distribution analysis
  const stageDistribution = new Map()
  batchesResult.data?.forEach(batch => {
    if (batch.current_stage) {
      const count = stageDistribution.get(batch.current_stage) || 0
      stageDistribution.set(batch.current_stage, count + 1)
    }
  })

  // Get recent batches with workflow info
  const { data: recentBatches } = await supabase
    .from('work_batches')
    .select(`
      id,
      name,
      current_stage,
      status,
      created_at,
      order_item_ids,
      workflow_template_id,
      workflow_templates (
        name
      )
    `)
    .order('created_at', { ascending: false })
    .limit(5)

  // Get production flow data grouped by stages
  const productionFlow = Array.from(stageDistribution.entries())
    .map(([stage, count]) => ({
      stage: stage.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()),
      count,
      batches: batchesResult.data?.filter(b => b.current_stage === stage) || []
    }))
    .sort((a, b) => b.count - a.count)

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Production Dashboard</h2>
          <p className="text-muted-foreground">Monitor workflows, batches, and production flow</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/manager/workflows">Manage Workflows</Link>
          </Button>
          <Button asChild>
            <Link href="/manager/orders">Import Orders</Link>
          </Button>
        </div>
      </div>

      {/* Enhanced Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Batches</CardTitle>
            <Factory className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeBatches}</div>
            <p className="text-xs text-muted-foreground">
              {stats.totalBatches} total batches
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Tasks</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.inProgressTasks}</div>
            <p className="text-xs text-muted-foreground">
              {stats.pendingTasks} pending
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Workflows</CardTitle>
            <GitBranch className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeWorkflows}</div>
            <p className="text-xs text-muted-foreground">
              Active templates
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Workers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeWorkers}</div>
            <p className="text-xs text-muted-foreground">
              {stats.totalWorkers} total staff
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Urgent Items</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.urgentTasks}</div>
            <p className="text-xs text-muted-foreground">
              Need attention
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Production Flow Board */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Factory className="h-5 w-5" />
              Production Flow Board
            </CardTitle>
            <Select defaultValue="all">
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by workflow" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Workflows</SelectItem>
                {workflowsResult.data?.map(workflow => (
                  <SelectItem key={workflow.id} value={workflow.id}>
                    {workflow.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {productionFlow.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {productionFlow.slice(0, 8).map((stage) => (
                <div key={stage.stage} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-sm">{stage.stage}</h4>
                    <Badge variant="secondary">{stage.count}</Badge>
                  </div>
                  <div className="space-y-2">
                    {stage.batches.slice(0, 3).map((batch: any) => (
                      <div key={batch.id} className="p-2 rounded-lg border bg-muted/30">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium truncate">{batch.name}</span>
                          <Badge variant="outline" className="text-xs">
                            {batch.order_item_ids?.length || 0} items
                          </Badge>
                        </div>
                      </div>
                    ))}
                    {stage.batches.length > 3 && (
                      <div className="text-xs text-muted-foreground text-center">
                        +{stage.batches.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Factory className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No active production batches</p>
              <p className="text-sm">Create batches from imported orders to get started</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Workflow Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Workflow Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {workflowPerformance.slice(0, 5).map((workflow) => (
                <div key={workflow.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{workflow.name}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {workflow.activeBatches} active
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        {workflow.automationRate}% auto
                      </Badge>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Automation Rate</span>
                      <span>{workflow.automationRate}%</span>
                    </div>
                    <Progress value={workflow.automationRate} className="h-2" />
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                    <span>{workflow.batchCount} batches</span>
                    <span>{workflow.taskCount} tasks</span>
                    <span>{workflow.stages} stages</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Recent Batches
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentBatches?.map((batch: any) => (
                <div key={batch.id} className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">{batch.name}</p>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {batch.workflow_templates?.name || 'No workflow'}
                      </Badge>
                      {batch.current_stage && (
                        <Badge variant="secondary" className="text-xs">
                          {batch.current_stage.replace(/_/g, ' ')}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant={batch.status === 'active' ? 'default' : 'secondary'}>
                      {batch.status}
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-1">
                      {batch.order_item_ids?.length || 0} items
                    </p>
                  </div>
                </div>
              ))}
              {(!recentBatches || recentBatches.length === 0) && (
                <div className="text-center py-4 text-muted-foreground">
                  <Package className="h-6 w-6 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No batches created yet</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions - Enhanced */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Workflow Builder
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Create and manage production workflows
            </p>
            <Button asChild className="w-full">
              <Link href="/manager/workflows">Build Workflows</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Factory className="h-4 w-4" />
              Batch Management
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Create and assign production batches
            </p>
            <Button asChild className="w-full">
              <Link href="/manager/tasks">Manage Batches</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Task Assignment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Assign pending tasks to workers
            </p>
            <Button asChild className="w-full">
              <Link href="/manager/tasks">Manage Tasks</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Analytics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              View production analytics and reports
            </p>
            <Button variant="outline" asChild className="w-full">
              <Link href="/manager/analytics">View Analytics</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}