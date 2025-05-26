'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import Link from 'next/link'
import { 
  Package, 
  Users, 
  Clock, 
  AlertCircle, 
  Zap, 
  TrendingUp, 
  Factory,
  Shield,
  Brain,
  Activity
} from 'lucide-react'
import { PredictiveQualityAlerts } from '@/components/features/predictive-quality-alerts'
import { QualityAnalyticsDashboard } from '@/components/manager/quality-analytics-dashboard'

interface DashboardStats {
  totalOrders: number
  pendingOrders: number
  totalTasks: number
  pendingTasks: number
  inProgressTasks: number
  urgentTasks: number
  activeWorkers: number
  totalWorkers: number
  totalBatches: number
  activeBatches: number
  qualityHolds: number
  criticalAlerts: number
}

export default function EnhancedManagerDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalOrders: 0,
    pendingOrders: 0,
    totalTasks: 0,
    pendingTasks: 0,
    inProgressTasks: 0,
    urgentTasks: 0,
    activeWorkers: 0,
    totalWorkers: 0,
    totalBatches: 0,
    activeBatches: 0,
    qualityHolds: 0,
    criticalAlerts: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardStats()
    // Refresh every 30 seconds
    const interval = setInterval(fetchDashboardStats, 30000)
    return () => clearInterval(interval)
  }, [])

  const fetchDashboardStats = async () => {
    try {
      // In production, this would be a single optimized endpoint
      const response = await fetch('/api/dashboard/stats')
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header with Critical Alerts */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Production Command Center</h1>
          <p className="text-muted-foreground">
            Real-time quality monitoring and predictive insights
          </p>
        </div>
        <div className="flex gap-2">
          {stats.qualityHolds > 0 && (
            <Badge variant="destructive" className="text-lg px-4 py-2">
              <Shield className="mr-2 h-4 w-4" />
              {stats.qualityHolds} Quality Holds
            </Badge>
          )}
          {stats.criticalAlerts > 0 && (
            <Badge variant="destructive" className="text-lg px-4 py-2 animate-pulse">
              <AlertCircle className="mr-2 h-4 w-4" />
              {stats.criticalAlerts} Critical Alerts
            </Badge>
          )}
        </div>
      </div>

      {/* Enhanced Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="quality">Quality Metrics</TabsTrigger>
          <TabsTrigger value="predictive">Predictive Insights</TabsTrigger>
          <TabsTrigger value="operations">Operations</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Orders</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalOrders}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.pendingOrders} pending
                </p>
                <Progress 
                  value={((stats.totalOrders - stats.pendingOrders) / stats.totalOrders) * 100} 
                  className="mt-2 h-2"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Task Progress</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.inProgressTasks}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.pendingTasks} pending
                </p>
                {stats.urgentTasks > 0 && (
                  <Badge variant="destructive" className="mt-2 text-xs">
                    {stats.urgentTasks} urgent
                  </Badge>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Workers</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.activeWorkers}</div>
                <p className="text-xs text-muted-foreground">
                  of {stats.totalWorkers} total
                </p>
                <Progress 
                  value={(stats.activeWorkers / stats.totalWorkers) * 100} 
                  className="mt-2 h-2"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Batches</CardTitle>
                <Factory className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.activeBatches}</div>
                <p className="text-xs text-muted-foreground">
                  of {stats.totalBatches} total
                </p>
                <Badge variant="outline" className="mt-2 text-xs">
                  Workflow enabled
                </Badge>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Zap className="h-5 w-5 text-yellow-500" />
                  Workflow Builder
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Create production workflows
                </p>
                <Button asChild className="w-full">
                  <Link href="/manager/workflows">Build</Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Shield className="h-5 w-5 text-red-500" />
                  Quality Holds
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Manage production holds
                </p>
                <Button asChild className="w-full" variant={stats.qualityHolds > 0 ? 'destructive' : 'default'}>
                  <Link href="/manager/quality-holds">
                    {stats.qualityHolds > 0 ? `View ${stats.qualityHolds} Holds` : 'Manage'}
                  </Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Activity className="h-5 w-5 text-blue-500" />
                  Analytics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Production insights
                </p>
                <Button asChild className="w-full" variant="outline">
                  <Link href="/manager/analytics">View</Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Brain className="h-5 w-5 text-purple-500" />
                  Components
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Track components
                </p>
                <Button asChild className="w-full" variant="outline">
                  <Link href="/manager/components">Track</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Quality Metrics Tab */}
        <TabsContent value="quality">
          <QualityAnalyticsDashboard />
        </TabsContent>

        {/* Predictive Insights Tab */}
        <TabsContent value="predictive">
          <PredictiveQualityAlerts />
        </TabsContent>

        {/* Operations Tab */}
        <TabsContent value="operations" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Production Flow Status */}
            <Card>
              <CardHeader>
                <CardTitle>Production Flow Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {['sanding', 'finishing', 'assembly', 'quality_control'].map((stage) => (
                    <div key={stage} className="flex items-center justify-between">
                      <span className="font-medium capitalize">{stage.replace('_', ' ')}</span>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{Math.floor(Math.random() * 10)} tasks</Badge>
                        <Progress value={Math.random() * 100} className="w-24 h-2" />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Worker Utilization */}
            <Card>
              <CardHeader>
                <CardTitle>Worker Utilization</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center py-4">
                    <div className="text-4xl font-bold text-blue-600">
                      {Math.round((stats.activeWorkers / stats.totalWorkers) * 100)}%
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                      Current utilization rate
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                      <p className="text-2xl font-bold">{stats.activeWorkers}</p>
                      <p className="text-xs text-muted-foreground">Working</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{stats.totalWorkers - stats.activeWorkers}</p>
                      <p className="text-xs text-muted-foreground">Available</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}