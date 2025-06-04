'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { 
  BarChart3, 
  TrendingUp, 
  Package, 
  Wrench,
  AlertTriangle,
  DollarSign,
  Timer,
  Users,
  TreePine,
  Target
} from 'lucide-react'
import { logBusiness, logError } from '@/lib/logger-client'

interface Analytics {
  productionMetrics: {
    totalParts: number
    completedToday: number
    inProgress: number
    avgProductionTime: number
  }
  machineMetrics: {
    totalMachines: number
    operational: number
    maintenance: number
    utilizationRate: number
  }
  inventoryMetrics: {
    totalSpecies: number
    lowStockAlerts: number
    totalValue: number
    turnoverRate: number
  }
  orderMetrics: {
    pendingOrders: number
    overdueOrders: number
    avgLeadTime: number
    onTimeDeliveryRate: number
  }
}

export function MachineShopAnalytics() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState('7d')
  const { toast } = useToast()
  const supabase = createClient()

  useEffect(() => {
    fetchAnalytics()
  }, [timeRange])

  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      
      // For now, return mock data since tables might not exist yet
      const mockAnalytics: Analytics = {
        productionMetrics: {
          totalParts: 1250,
          completedToday: 45,
          inProgress: 23,
          avgProductionTime: 2.5
        },
        machineMetrics: {
          totalMachines: 8,
          operational: 7,
          maintenance: 1,
          utilizationRate: 78
        },
        inventoryMetrics: {
          totalSpecies: 12,
          lowStockAlerts: 3,
          totalValue: 45000,
          turnoverRate: 4.2
        },
        orderMetrics: {
          pendingOrders: 15,
          overdueOrders: 2,
          avgLeadTime: 5.5,
          onTimeDeliveryRate: 94
        }
      }
      
      setAnalytics(mockAnalytics)
      logBusiness('Analytics data fetched', 'MACHINE_SHOP_ANALYTICS', { timeRange })
    } catch (error) {
      logError(error as Error, 'MACHINE_SHOP_ANALYTICS', { action: 'fetch_analytics' })
      toast({
        title: 'Error',
        description: 'Failed to load analytics data',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading analytics...</p>
        </div>
      </div>
    )
  }

  if (!analytics) {
    return (
      <div className="text-center py-8">
        <AlertTriangle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground">No analytics data available</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Time Range Selector */}
      <div className="flex justify-end">
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="24h">Last 24 Hours</SelectItem>
            <SelectItem value="7d">Last 7 Days</SelectItem>
            <SelectItem value="30d">Last 30 Days</SelectItem>
            <SelectItem value="90d">Last 90 Days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Production</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.productionMetrics.totalParts}</div>
            <p className="text-xs text-muted-foreground">
              +{analytics.productionMetrics.completedToday} today
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Machine Utilization</CardTitle>
            <Wrench className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.machineMetrics.utilizationRate}%</div>
            <p className="text-xs text-muted-foreground">
              {analytics.machineMetrics.operational}/{analytics.machineMetrics.totalMachines} operational
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">On-Time Delivery</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.orderMetrics.onTimeDeliveryRate}%</div>
            <p className="text-xs text-muted-foreground">
              {analytics.orderMetrics.overdueOrders} overdue orders
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inventory Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${analytics.inventoryMetrics.totalValue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {analytics.inventoryMetrics.lowStockAlerts} low stock alerts
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics Tabs */}
      <Tabs defaultValue="production" className="space-y-4">
        <TabsList>
          <TabsTrigger value="production">Production</TabsTrigger>
          <TabsTrigger value="machines">Machines</TabsTrigger>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
          <TabsTrigger value="orders">Orders</TabsTrigger>
        </TabsList>

        <TabsContent value="production" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Production Overview</CardTitle>
              <CardDescription>Daily production metrics and trends</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <p className="text-sm font-medium">Parts Completed Today</p>
                  <p className="text-2xl font-bold">{analytics.productionMetrics.completedToday}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">In Progress</p>
                  <p className="text-2xl font-bold">{analytics.productionMetrics.inProgress}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">Avg Production Time</p>
                  <p className="text-2xl font-bold">{analytics.productionMetrics.avgProductionTime} hrs</p>
                </div>
              </div>
              <div className="mt-6 h-64 bg-muted rounded flex items-center justify-center">
                <p className="text-muted-foreground">Production chart placeholder</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="machines" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Machine Performance</CardTitle>
              <CardDescription>Machine utilization and maintenance status</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <p className="text-sm font-medium">Total Machines</p>
                  <p className="text-2xl font-bold">{analytics.machineMetrics.totalMachines}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">Operational</p>
                  <p className="text-2xl font-bold text-green-600">{analytics.machineMetrics.operational}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">In Maintenance</p>
                  <p className="text-2xl font-bold text-yellow-600">{analytics.machineMetrics.maintenance}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">Utilization Rate</p>
                  <p className="text-2xl font-bold">{analytics.machineMetrics.utilizationRate}%</p>
                </div>
              </div>
              <div className="mt-6 h-64 bg-muted rounded flex items-center justify-center">
                <p className="text-muted-foreground">Machine utilization chart placeholder</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inventory" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Inventory Analysis</CardTitle>
              <CardDescription>Wood inventory levels and turnover</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <p className="text-sm font-medium">Wood Species</p>
                  <p className="text-2xl font-bold">{analytics.inventoryMetrics.totalSpecies}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">Total Value</p>
                  <p className="text-2xl font-bold">${analytics.inventoryMetrics.totalValue.toLocaleString()}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">Low Stock Alerts</p>
                  <p className="text-2xl font-bold text-orange-600">{analytics.inventoryMetrics.lowStockAlerts}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">Turnover Rate</p>
                  <p className="text-2xl font-bold">{analytics.inventoryMetrics.turnoverRate}x</p>
                </div>
              </div>
              <div className="mt-6 h-64 bg-muted rounded flex items-center justify-center">
                <p className="text-muted-foreground">Inventory levels chart placeholder</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="orders" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Order Management</CardTitle>
              <CardDescription>Order fulfillment and lead time analysis</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <p className="text-sm font-medium">Pending Orders</p>
                  <p className="text-2xl font-bold">{analytics.orderMetrics.pendingOrders}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">Overdue</p>
                  <p className="text-2xl font-bold text-red-600">{analytics.orderMetrics.overdueOrders}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">Avg Lead Time</p>
                  <p className="text-2xl font-bold">{analytics.orderMetrics.avgLeadTime} days</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">On-Time Rate</p>
                  <p className="text-2xl font-bold text-green-600">{analytics.orderMetrics.onTimeDeliveryRate}%</p>
                </div>
              </div>
              <div className="mt-6 h-64 bg-muted rounded flex items-center justify-center">
                <p className="text-muted-foreground">Order fulfillment chart placeholder</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}