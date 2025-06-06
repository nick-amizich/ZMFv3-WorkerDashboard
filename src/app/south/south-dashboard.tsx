'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  BarChart3, 
  Package, 
  Wrench, 
  Users, 
  AlertTriangle,
  TreePine,
  Activity,
  Calendar,
  Truck,
  Zap,
  Bell,
  Target,
  ArrowRight,
  ClipboardList,
  FileSpreadsheet
} from 'lucide-react'
import Link from 'next/link'
import { logBusiness, logError } from '@/lib/logger-client'

interface DashboardMetrics {
  activeRequests: number
  dailyProduction: number
  machineUtilization: number
  activeWorkers: number
  openIssues: number
  pendingTransfers: number
  woodInventoryHealth: number
  maintenanceAlerts: number
  scheduledJobs: number
  efficiencyScore: number
}

interface RecentActivity {
  id: string
  type: 'production' | 'issue' | 'transfer' | 'maintenance' | 'order'
  title: string
  description: string
  timestamp: string
  status: 'completed' | 'pending' | 'urgent'
}

export function SouthDashboard() {
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    activeRequests: 0,
    dailyProduction: 0,
    machineUtilization: 0,
    activeWorkers: 0,
    openIssues: 0,
    pendingTransfers: 0,
    woodInventoryHealth: 0,
    maintenanceAlerts: 0,
    scheduledJobs: 0,
    efficiencyScore: 0
  })
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    loadDashboardData()
    
    // Set up real-time updates
    const subscription = supabase
      .channel('south_dashboard')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'production_requests'
      }, () => {
        loadDashboardData()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(subscription)
    }
  }, [])

  async function loadDashboardData() {
    try {
      const now = new Date()
      const today = now.toISOString().split('T')[0]

      // Load multiple data sources in parallel
      const [
        requestsRes,
        productionRes,
        machinesRes,
        workersRes,
        issuesRes,
        inventoryRes,
        maintenanceRes,
        scheduleRes
      ] = await Promise.all([
        // Active production requests
        supabase
          .from('production_requests')
          .select('*')
          .eq('location', 'south')
          .in('status', ['pending', 'in_production']),
        
        // Today's production
        supabase
          .from('daily_production')
          .select('quantity_produced')
          .eq('manufacturing_date', today),
        
        // Machine utilization  
        supabase
          .from('machines')
          .select('status')
          .eq('location', 'south'),
        
        // Active workers at south location
        supabase
          .from('workers')
          .select('*')
          .eq('is_active', true),
        
        // Open issues
        supabase
          .from('production_issues')
          .select('*')
          .in('resolution_status', ['open', 'in_progress']),
        
        // Wood inventory
        supabase
          .from('wood_inventory')
          .select('quantity_in_stock, minimum_stock'),
        
        // Maintenance alerts
        supabase
          .from('machines')
          .select('status, next_maintenance_due')
          .eq('location', 'south'),
        
        // Scheduled jobs for the week (use existing table structure)
        supabase
          .from('production_requests')
          .select('*')
          .gte('created_at', now.toISOString())
          .lte('created_at', new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString())
      ])

      // Calculate metrics
      const activeRequests = requestsRes.data?.length || 0
      const dailyProduction = productionRes.data?.reduce((sum, p) => sum + (p.quantity_produced || 0), 0) || 0
      
      const operationalMachines = machinesRes.data?.filter(m => m.status === 'operational').length || 0
      const totalMachines = machinesRes.data?.length || 1
      const machineUtilization = (operationalMachines / totalMachines) * 100
      
      const activeWorkers = workersRes.data?.length || 0
      const openIssues = issuesRes.data?.length || 0
      const pendingTransfers = 0 // Set to 0 since facility_transfers table doesn't exist
      
      // Calculate inventory health using correct column names
      const inventoryItems = inventoryRes.data || []
      const healthyItems = inventoryItems.filter(item => 
        (item.quantity_in_stock || 0) >= (item.minimum_stock || 0)
      ).length
      const woodInventoryHealth = inventoryItems.length > 0 
        ? (healthyItems / inventoryItems.length) * 100 
        : 100
      
      // Calculate maintenance alerts
      const maintenanceAlerts = maintenanceRes.data?.filter(m => 
        m.status === 'maintenance' || 
        (m.next_maintenance_due && new Date(m.next_maintenance_due) <= new Date())
      ).length || 0
      
      const scheduledJobs = scheduleRes.data?.length || 0
      const efficiencyScore = Math.min(100, (machineUtilization + (activeWorkers * 10)) / 2)

      setMetrics({
        activeRequests,
        dailyProduction,
        machineUtilization,
        activeWorkers,
        openIssues,
        pendingTransfers,
        woodInventoryHealth,
        maintenanceAlerts,
        scheduledJobs,
        efficiencyScore
      })

      // Build recent activity (simplified without transfers)
      const activities: RecentActivity[] = []
      
      // Add recent production requests
      requestsRes.data?.slice(0, 3).forEach((request, index) => {
        activities.push({
          id: `request-${index}`,
          type: 'production',
          title: `Production Request #${request.id.slice(0, 8)}`,
          description: `Status: ${request.status}`,
          timestamp: request.created_at || new Date().toISOString(),
          status: request.status === 'completed' ? 'completed' : 'pending'
        })
      })
      
      // Add recent issues
      issuesRes.data?.slice(0, 2).forEach((issue, index) => {
        activities.push({
          id: `issue-${index}`,
          type: 'issue',
          title: issue.title || 'Production Issue',
          description: issue.description || 'No description',
          timestamp: issue.created_at || new Date().toISOString(),
          status: issue.resolution_status === 'resolved' ? 'completed' : 'urgent'
        })
      })

      setRecentActivity(activities.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      ))

      logBusiness('South dashboard loaded', 'SOUTH_DASHBOARD', { metrics })
    } catch (error) {
      logError(error as Error, 'SOUTH_DASHBOARD', { action: 'load_data' })
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Machine Utilization
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.machineUtilization.toFixed(0)}%</div>
            <Progress value={metrics.machineUtilization} className="mt-2" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Package className="h-4 w-4" />
              Daily Production
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.dailyProduction}</div>
            <p className="text-xs text-muted-foreground mt-1">
              units completed today
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Target className="h-4 w-4" />
              Efficiency Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${
              metrics.efficiencyScore >= 90 ? 'text-green-500 dark:text-green-400' :
              metrics.efficiencyScore >= 75 ? 'text-yellow-500 dark:text-yellow-400' :
              'text-red-500 dark:text-red-400'
            }`}>
              {metrics.efficiencyScore}%
            </div>
            <Progress value={metrics.efficiencyScore} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Status Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Operations Status */}
        <Card>
          <CardHeader>
            <CardTitle>Operations Status</CardTitle>
            <CardDescription>Current production overview</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href="/south/production-requests" className="block">
              <div className="flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors">
                <div className="flex items-center gap-3">
                  <ClipboardList className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium">Active Requests</p>
                    <p className="text-sm text-muted-foreground">In production queue</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-bold">{metrics.activeRequests}</span>
                  <ArrowRight className="h-4 w-4" />
                </div>
              </div>
            </Link>

            <Link href="/south/scheduling" className="block">
              <div className="flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors">
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium">Scheduled Jobs</p>
                    <p className="text-sm text-muted-foreground">This week</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-bold">{metrics.scheduledJobs}</span>
                  <ArrowRight className="h-4 w-4" />
                </div>
              </div>
            </Link>

            <Link href="/south/daily-production" className="block">
              <div className="flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors">
                <div className="flex items-center gap-3">
                  <Users className="h-5 w-5 text-green-500 dark:text-green-400" />
                  <div>
                    <p className="font-medium">Active Workers</p>
                    <p className="text-sm text-muted-foreground">On floor</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-bold">{metrics.activeWorkers}</span>
                  <ArrowRight className="h-4 w-4" />
                </div>
              </div>
            </Link>
          </CardContent>
        </Card>

        {/* Alerts & Issues */}
        <Card>
          <CardHeader>
            <CardTitle>Alerts & Issues</CardTitle>
            <CardDescription>Items requiring attention</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href="/south/issues" className="block">
              <div className="flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5 text-orange-500 dark:text-orange-400" />
                  <div>
                    <p className="font-medium">Open Issues</p>
                    <p className="text-sm text-muted-foreground">Need resolution</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={metrics.openIssues > 0 ? "destructive" : "secondary"}>
                    {metrics.openIssues}
                  </Badge>
                  <ArrowRight className="h-4 w-4" />
                </div>
              </div>
            </Link>

            <Link href="/south/maintenance" className="block">
              <div className="flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors">
                <div className="flex items-center gap-3">
                  <Bell className="h-5 w-5 text-red-500 dark:text-red-400" />
                  <div>
                    <p className="font-medium">Maintenance Alerts</p>
                    <p className="text-sm text-muted-foreground">Scheduled & predictive</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={metrics.maintenanceAlerts > 0 ? "destructive" : "secondary"}>
                    {metrics.maintenanceAlerts}
                  </Badge>
                  <ArrowRight className="h-4 w-4" />
                </div>
              </div>
            </Link>

            <Link href="/south/transfers" className="block">
              <div className="flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors">
                <div className="flex items-center gap-3">
                  <Truck className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium">Pending Transfers</p>
                    <p className="text-sm text-muted-foreground">In transit</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{metrics.pendingTransfers}</Badge>
                  <ArrowRight className="h-4 w-4" />
                </div>
              </div>
            </Link>
          </CardContent>
        </Card>

        {/* Resources & Optimization */}
        <Card>
          <CardHeader>
            <CardTitle>Resources & Optimization</CardTitle>
            <CardDescription>Inventory and efficiency</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href="/south/inventory" className="block">
              <div className="flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors">
                <div className="flex items-center gap-3">
                  <TreePine className="h-5 w-5 text-green-500 dark:text-green-400" />
                  <div>
                    <p className="font-medium">Wood Inventory</p>
                    <p className="text-sm text-muted-foreground">Stock health</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xl font-bold ${
                    metrics.woodInventoryHealth >= 80 ? 'text-green-500 dark:text-green-400' :
                    metrics.woodInventoryHealth >= 60 ? 'text-yellow-500 dark:text-yellow-400' :
                    'text-red-500 dark:text-red-400'
                  }`}>
                    {metrics.woodInventoryHealth.toFixed(0)}%
                  </span>
                  <ArrowRight className="h-4 w-4" />
                </div>
              </div>
            </Link>

            <Link href="/south/optimization" className="block">
              <div className="flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors">
                <div className="flex items-center gap-3">
                  <Zap className="h-5 w-5 text-yellow-500 dark:text-yellow-400" />
                  <div>
                    <p className="font-medium">Optimization</p>
                    <p className="text-sm text-muted-foreground">Material efficiency</p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4" />
              </div>
            </Link>

          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest updates from the floor</CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/south/analytics">
                <BarChart3 className="h-4 w-4 mr-2" />
                View Analytics
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentActivity.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">
                No recent activity
              </p>
            ) : (
              recentActivity.map(activity => (
                <div key={activity.id} className="flex items-start gap-3 p-3 rounded-lg border">
                  <div className={`p-2 rounded-lg ${
                    activity.status === 'completed' ? 'bg-green-500/10 dark:bg-green-500/20' :
                    activity.status === 'urgent' ? 'bg-red-500/10 dark:bg-red-500/20' :
                    'bg-blue-500/10 dark:bg-blue-500/20'
                  }`}>
                    {activity.type === 'production' && <Wrench className="h-4 w-4" />}
                    {activity.type === 'issue' && <AlertTriangle className="h-4 w-4" />}
                    {activity.type === 'transfer' && <Truck className="h-4 w-4" />}
                    {activity.type === 'maintenance' && <Bell className="h-4 w-4" />}
                    {activity.type === 'order' && <Package className="h-4 w-4" />}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{activity.title}</p>
                    <p className="text-xs text-muted-foreground">{activity.description}</p>
                  </div>
                  <div className="text-right">
                    <Badge variant={
                      activity.status === 'completed' ? 'default' :
                      activity.status === 'urgent' ? 'destructive' :
                      'secondary'
                    }>
                      {activity.status}
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(activity.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Button variant="outline" className="justify-start" asChild>
              <Link href="/south/production-requests">
                <ClipboardList className="h-4 w-4 mr-2" />
                New Request
              </Link>
            </Button>
            <Button variant="outline" className="justify-start" asChild>
              <Link href="/south/issues">
                <AlertTriangle className="h-4 w-4 mr-2" />
                Report Issue
              </Link>
            </Button>
            <Button variant="outline" className="justify-start" asChild>
              <Link href="/south/scheduling">
                <Calendar className="h-4 w-4 mr-2" />
                Schedule Job
              </Link>
            </Button>
            <Button variant="outline" className="justify-start" asChild>
              <Link href="/south/transfers">
                <Truck className="h-4 w-4 mr-2" />
                New Transfer
              </Link>
            </Button>
            <Button variant="outline" className="justify-start" asChild>
              <Link href="/south/import">
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Import Data
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}