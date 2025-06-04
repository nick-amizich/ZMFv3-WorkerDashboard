'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { 
  Wrench,
  Activity,
  Clock,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  PauseCircle,
  PlayCircle,
  Timer,
  BarChart3,
  Zap,
  Calendar
} from 'lucide-react'
import { logBusiness, logError } from '@/lib/logger-client'

interface MachineMetrics {
  id: string
  machine_name: string
  machine_type: string
  status: string
  current_job?: {
    part_name: string
    operation_number: number
    started_at: string
    operator_name: string
  }
  daily_metrics: {
    runtime_hours: number
    idle_hours: number
    maintenance_hours: number
    setup_hours: number
    parts_produced: number
    cycle_efficiency: number
  }
  weekly_metrics: {
    average_utilization: number
    total_parts: number
    downtime_incidents: number
    oee_score: number // Overall Equipment Effectiveness
  }
  alerts: {
    type: string
    message: string
    severity: 'low' | 'medium' | 'high'
  }[]
}

interface ProductionLog {
  machine_id: string
  start_time: string
  end_time: string | null
  status: 'running' | 'idle' | 'maintenance' | 'setup'
  part_id: string | null
  operator_id: string | null
}

export function MachineUtilizationDashboard() {
  const [machines, setMachines] = useState<MachineMetrics[]>([])
  const [productionLogs, setProductionLogs] = useState<ProductionLog[]>([])
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState('today')
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null)
  const { toast } = useToast()
  const supabase = createClient()

  useEffect(() => {
    loadData()
    
    // Set up real-time refresh every 30 seconds
    const interval = setInterval(() => {
      loadData()
    }, 30000)
    
    setRefreshInterval(interval)
    
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [timeRange])

  async function loadData() {
    try {
      // Get machines
      const { data: machinesData, error: machinesError } = await supabase
        .from('machines')
        .select('*')
        .order('machine_name')

      if (machinesError) throw machinesError

      // Get production data for time range
      const startDate = getStartDate(timeRange)
      const { data: productionData, error: productionError } = await supabase
        .from('daily_production')
        .select(`
          *,
          part:parts_catalog(part_name),
          operator:workers(name)
        `)
        .gte('manufacturing_date', startDate.toISOString().split('T')[0])

      if (productionError) throw productionError

      // Get machine downtime logs
      const { data: downtimeData, error: downtimeError } = await supabase
        .from('machine_downtime_log')
        .select('*')
        .gte('start_time', startDate.toISOString())

      if (downtimeError) throw downtimeError

      // Calculate metrics for each machine
      const metrics: MachineMetrics[] = machinesData.map(machine => {
        const machineProduction = productionData?.filter(p => p.machine_id === machine.id) || []
        const machineDowntime = downtimeData?.filter(d => d.machine_id === machine.id) || []

        // Calculate daily metrics
        const today = new Date().toISOString().split('T')[0]
        const todayProduction = machineProduction.filter(p => p.manufacturing_date === today)
        
        const totalRuntime = todayProduction.reduce((sum, p) => 
          sum + (p.setup_time_minutes || 0) + (p.run_time_minutes || 0), 0
        ) / 60

        const totalDowntime = machineDowntime
          .filter(d => d.start_time.startsWith(today))
          .reduce((sum, d) => {
            const start = new Date(d.start_time)
            const end = d.end_time ? new Date(d.end_time) : new Date()
            return sum + (end.getTime() - start.getTime()) / (1000 * 60 * 60)
          }, 0)

        const totalHours = 8 // Assuming 8-hour workday
        const idleHours = Math.max(0, totalHours - totalRuntime - totalDowntime)

        // Calculate weekly metrics
        const weekProduction = machineProduction.filter(p => {
          const date = new Date(p.manufacturing_date)
          const weekAgo = new Date()
          weekAgo.setDate(weekAgo.getDate() - 7)
          return date >= weekAgo
        })

        const weeklyUtilization = weekProduction.length > 0
          ? (weekProduction.reduce((sum, p) => 
              sum + (p.setup_time_minutes || 0) + (p.run_time_minutes || 0), 0
            ) / (7 * 8 * 60)) * 100
          : 0

        // Generate alerts
        const alerts: MachineMetrics['alerts'] = []
        
        if (machine.status === 'maintenance') {
          alerts.push({
            type: 'maintenance',
            message: 'Machine is currently in maintenance',
            severity: 'medium'
          })
        }

        if (weeklyUtilization < 50) {
          alerts.push({
            type: 'low_utilization',
            message: 'Weekly utilization below 50%',
            severity: 'medium'
          })
        }

        if (machineDowntime.length > 3) {
          alerts.push({
            type: 'frequent_downtime',
            message: 'Multiple downtime incidents this week',
            severity: 'high'
          })
        }

        // Get current job if machine is operational
        const currentJob = todayProduction.find(p => !p.quantity_produced || p.quantity_produced < p.quantity_ordered)

        return {
          id: machine.id,
          machine_name: machine.machine_name,
          machine_type: machine.machine_type,
          status: machine.status,
          current_job: currentJob ? {
            part_name: currentJob.part?.part_name || 'Unknown',
            operation_number: 1,
            started_at: currentJob.created_at,
            operator_name: currentJob.operator?.name || 'Unknown'
          } : undefined,
          daily_metrics: {
            runtime_hours: totalRuntime,
            idle_hours: idleHours,
            maintenance_hours: totalDowntime,
            setup_hours: todayProduction.reduce((sum, p) => sum + (p.setup_time_minutes || 0), 0) / 60,
            parts_produced: todayProduction.reduce((sum, p) => sum + (p.quantity_produced || 0), 0),
            cycle_efficiency: totalRuntime > 0 ? 
              ((totalRuntime - (totalDowntime * 0.5)) / totalRuntime) * 100 : 0
          },
          weekly_metrics: {
            average_utilization: weeklyUtilization,
            total_parts: weekProduction.reduce((sum, p) => sum + (p.quantity_produced || 0), 0),
            downtime_incidents: machineDowntime.length,
            oee_score: calculateOEE(weeklyUtilization, 0.95, 0.98) // Simplified OEE
          },
          alerts
        }
      })

      setMachines(metrics)
      
      logBusiness('Machine utilization data refreshed', 'MACHINE_UTILIZATION', {
        machineCount: metrics.length,
        averageUtilization: metrics.reduce((sum, m) => sum + m.weekly_metrics.average_utilization, 0) / metrics.length
      })
    } catch (error) {
      logError(error as Error, 'MACHINE_UTILIZATION', { action: 'load_data' })
      toast({
        title: 'Error',
        description: 'Failed to load utilization data',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  function getStartDate(range: string): Date {
    const now = new Date()
    switch (range) {
      case 'today':
        return new Date(now.getFullYear(), now.getMonth(), now.getDate())
      case 'week':
        const weekAgo = new Date(now)
        weekAgo.setDate(weekAgo.getDate() - 7)
        return weekAgo
      case 'month':
        const monthAgo = new Date(now)
        monthAgo.setMonth(monthAgo.getMonth() - 1)
        return monthAgo
      default:
        return now
    }
  }

  function calculateOEE(availability: number, performance: number, quality: number): number {
    // OEE = Availability × Performance × Quality
    return (availability / 100) * performance * quality * 100
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'operational': return <PlayCircle className="h-4 w-4 text-green-600" />
      case 'maintenance': return <Wrench className="h-4 w-4 text-orange-600" />
      case 'offline': return <PauseCircle className="h-4 w-4 text-red-600" />
      default: return <AlertTriangle className="h-4 w-4" />
    }
  }

  const getUtilizationColor = (utilization: number) => {
    if (utilization >= 80) return 'text-green-600'
    if (utilization >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  // Calculate overall metrics
  const overallMetrics = {
    totalMachines: machines.length,
    operationalCount: machines.filter(m => m.status === 'operational').length,
    averageUtilization: machines.reduce((sum, m) => sum + m.weekly_metrics.average_utilization, 0) / machines.length || 0,
    totalPartsToday: machines.reduce((sum, m) => sum + m.daily_metrics.parts_produced, 0),
    activeAlerts: machines.reduce((sum, m) => sum + m.alerts.length, 0)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading utilization data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Time Range Selector */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            Real-time monitoring (updates every 30s)
          </span>
        </div>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="week">This Week</SelectItem>
            <SelectItem value="month">This Month</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Machines</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overallMetrics.totalMachines}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {overallMetrics.operationalCount} operational
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg Utilization</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getUtilizationColor(overallMetrics.averageUtilization)}`}>
              {overallMetrics.averageUtilization.toFixed(0)}%
            </div>
            <Progress value={overallMetrics.averageUtilization} className="mt-2" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Parts Today</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overallMetrics.totalPartsToday}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Completed units
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{overallMetrics.activeAlerts}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Require attention
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Efficiency</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-yellow-600" />
              <span className="text-2xl font-bold">
                {(overallMetrics.averageUtilization * 0.95).toFixed(0)}%
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Machine Details */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
          <TabsTrigger value="analysis">Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {machines.map(machine => (
              <Card key={machine.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        {getStatusIcon(machine.status)}
                        {machine.machine_name}
                      </CardTitle>
                      <CardDescription>{machine.machine_type}</CardDescription>
                    </div>
                    <Badge variant={machine.status === 'operational' ? 'default' : 'secondary'}>
                      {machine.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {machine.current_job && (
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <p className="text-sm font-medium">Current Job</p>
                      <p className="text-sm text-muted-foreground">
                        {machine.current_job.part_name} - Op {machine.current_job.operation_number}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Operator: {machine.current_job.operator_name}
                      </p>
                    </div>
                  )}

                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Today's Utilization</span>
                      <span className={`text-sm font-medium ${
                        getUtilizationColor((machine.daily_metrics.runtime_hours / 8) * 100)
                      }`}>
                        {((machine.daily_metrics.runtime_hours / 8) * 100).toFixed(0)}%
                      </span>
                    </div>
                    <Progress value={(machine.daily_metrics.runtime_hours / 8) * 100} />
                  </div>

                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div>
                      <p className="text-xs text-muted-foreground">Runtime</p>
                      <p className="text-sm font-medium">
                        {machine.daily_metrics.runtime_hours.toFixed(1)}h
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Idle</p>
                      <p className="text-sm font-medium">
                        {machine.daily_metrics.idle_hours.toFixed(1)}h
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Setup</p>
                      <p className="text-sm font-medium">
                        {machine.daily_metrics.setup_hours.toFixed(1)}h
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Parts</p>
                      <p className="text-sm font-medium">
                        {machine.daily_metrics.parts_produced}
                      </p>
                    </div>
                  </div>

                  <div className="pt-2 border-t">
                    <div className="flex justify-between items-center text-sm">
                      <span>Weekly Average</span>
                      <span className="font-medium">
                        {machine.weekly_metrics.average_utilization.toFixed(0)}%
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm mt-1">
                      <span>OEE Score</span>
                      <span className="font-medium">
                        {machine.weekly_metrics.oee_score.toFixed(0)}%
                      </span>
                    </div>
                  </div>

                  {machine.alerts.length > 0 && (
                    <div className="pt-2 border-t space-y-1">
                      {machine.alerts.map((alert, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm">
                          <AlertTriangle className={`h-3 w-3 ${
                            alert.severity === 'high' ? 'text-red-600' :
                            alert.severity === 'medium' ? 'text-orange-600' :
                            'text-yellow-600'
                          }`} />
                          <span className="text-muted-foreground">{alert.message}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="timeline" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Production Timeline</CardTitle>
              <CardDescription>
                Visual representation of machine activity over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {machines.map(machine => (
                  <div key={machine.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{machine.machine_name}</span>
                      <span className="text-sm text-muted-foreground">
                        {machine.daily_metrics.runtime_hours.toFixed(1)}h / 8h
                      </span>
                    </div>
                    <div className="h-8 bg-gray-100 rounded-lg overflow-hidden flex">
                      <div 
                        className="bg-green-500 h-full"
                        style={{ width: `${(machine.daily_metrics.runtime_hours / 8) * 100}%` }}
                        title="Runtime"
                      />
                      <div 
                        className="bg-yellow-500 h-full"
                        style={{ width: `${(machine.daily_metrics.setup_hours / 8) * 100}%` }}
                        title="Setup"
                      />
                      <div 
                        className="bg-red-500 h-full"
                        style={{ width: `${(machine.daily_metrics.maintenance_hours / 8) * 100}%` }}
                        title="Maintenance"
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-4 mt-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-green-500 rounded" />
                  <span>Runtime</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-yellow-500 rounded" />
                  <span>Setup</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-red-500 rounded" />
                  <span>Maintenance</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-gray-100 rounded" />
                  <span>Idle</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Active Alerts</CardTitle>
              <CardDescription>
                Issues requiring attention across all machines
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {machines.flatMap(machine => 
                  machine.alerts.map(alert => ({
                    ...alert,
                    machine_name: machine.machine_name,
                    machine_id: machine.id
                  }))
                ).sort((a, b) => {
                  const severityOrder = { high: 0, medium: 1, low: 2 }
                  return severityOrder[a.severity] - severityOrder[b.severity]
                }).map((alert, i) => (
                  <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className={`h-5 w-5 ${
                        alert.severity === 'high' ? 'text-red-600' :
                        alert.severity === 'medium' ? 'text-orange-600' :
                        'text-yellow-600'
                      }`} />
                      <div>
                        <p className="font-medium">{alert.machine_name}</p>
                        <p className="text-sm text-muted-foreground">{alert.message}</p>
                      </div>
                    </div>
                    <Badge variant={
                      alert.severity === 'high' ? 'destructive' :
                      alert.severity === 'medium' ? 'secondary' :
                      'outline'
                    }>
                      {alert.severity}
                    </Badge>
                  </div>
                ))}
                {machines.every(m => m.alerts.length === 0) && (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-600" />
                    <p>No active alerts</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analysis" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Utilization Trends</CardTitle>
                <CardDescription>
                  Machine performance over the selected period
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {machines
                    .sort((a, b) => b.weekly_metrics.average_utilization - a.weekly_metrics.average_utilization)
                    .map(machine => (
                      <div key={machine.id} className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">{machine.machine_name}</span>
                          <span className={`text-sm font-bold ${
                            getUtilizationColor(machine.weekly_metrics.average_utilization)
                          }`}>
                            {machine.weekly_metrics.average_utilization.toFixed(0)}%
                          </span>
                        </div>
                        <Progress value={machine.weekly_metrics.average_utilization} />
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Performance Insights</CardTitle>
                <CardDescription>
                  Key findings and recommendations
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {overallMetrics.averageUtilization < 60 && (
                  <div className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg">
                    <TrendingDown className="h-5 w-5 text-orange-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-sm">Low Overall Utilization</p>
                      <p className="text-sm text-muted-foreground">
                        Consider consolidating jobs or reviewing production scheduling
                      </p>
                    </div>
                  </div>
                )}
                
                {machines.some(m => m.weekly_metrics.downtime_incidents > 3) && (
                  <div className="flex items-start gap-3 p-3 bg-red-50 rounded-lg">
                    <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-sm">Frequent Downtime</p>
                      <p className="text-sm text-muted-foreground">
                        Some machines experiencing multiple downtime incidents
                      </p>
                    </div>
                  </div>
                )}

                {overallMetrics.averageUtilization > 80 && (
                  <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                    <TrendingUp className="h-5 w-5 text-green-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-sm">Excellent Utilization</p>
                      <p className="text-sm text-muted-foreground">
                        Machines are operating at high efficiency
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                  <Timer className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">Setup Time Optimization</p>
                    <p className="text-sm text-muted-foreground">
                      Average setup time: {
                        (machines.reduce((sum, m) => sum + m.daily_metrics.setup_hours, 0) / machines.length).toFixed(1)
                      } hours per machine
                    </p>
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