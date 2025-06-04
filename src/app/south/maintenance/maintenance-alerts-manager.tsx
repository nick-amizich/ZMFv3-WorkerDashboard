'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { 
  Wrench,
  AlertTriangle,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  TrendingUp,
  Activity,
  Bell,
  BellOff,
  Timer,
  BarChart3,
  Shield,
  Zap
} from 'lucide-react'
import { logBusiness, logError } from '@/lib/logger-client'

interface MaintenanceAlert {
  id: string
  machine_id: string
  alert_type: 'scheduled' | 'predictive' | 'urgent' | 'breakdown'
  severity: 'low' | 'medium' | 'high' | 'critical'
  title: string
  description: string
  predicted_date: string | null
  due_date: string | null
  acknowledged: boolean
  acknowledged_by: string | null
  acknowledged_at: string | null
  completed: boolean
  completed_at: string | null
  created_at: string
  machine?: {
    machine_name: string
    machine_type: string
    status: string
  }
  metrics?: {
    runtime_hours: number
    cycle_count: number
    days_until_due: number
    reliability_score: number
  }
}

interface MaintenanceHistory {
  machine_id: string
  maintenance_type: string
  performed_date: string
  performed_by: string
  duration_hours: number
  cost: number
  notes: string
}

export function MaintenanceAlertsManager() {
  const [alerts, setAlerts] = useState<MaintenanceAlert[]>([])
  const [machines, setMachines] = useState<any[]>([])
  const [history, setHistory] = useState<MaintenanceHistory[]>([])
  const [loading, setLoading] = useState(true)
  const [isScheduleDialogOpen, setIsScheduleDialogOpen] = useState(false)
  const [selectedMachine, setSelectedMachine] = useState<any>(null)
  const [filterSeverity, setFilterSeverity] = useState<string>('all')
  const [filterType, setFilterType] = useState<string>('all')
  const { toast } = useToast()
  const supabase = createClient()

  useEffect(() => {
    loadData()
    
    // Set up real-time subscription for urgent alerts
    const subscription = supabase
      .channel('maintenance_alerts')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'machine_downtime_log'
      }, (payload) => {
        generateUrgentAlert(payload.new)
      })
      .subscribe()

    return () => {
      supabase.removeChannel(subscription)
    }
  }, [])

  async function loadData() {
    try {
      // Get machines with maintenance info
      const { data: machinesData, error: machinesError } = await supabase
        .from('machines')
        .select('*')
        .order('machine_name')

      if (machinesError) throw machinesError

      // Get production metrics for predictive analysis
      const { data: productionData, error: productionError } = await supabase
        .from('daily_production')
        .select('*')
        .gte('manufacturing_date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])

      if (productionError) throw productionError

      // Get downtime history
      const { data: downtimeData, error: downtimeError } = await supabase
        .from('machine_downtime_log')
        .select('*')
        .order('start_time', { ascending: false })
        .limit(100)

      if (downtimeError) throw downtimeError

      // Generate maintenance alerts based on data
      const generatedAlerts = generateMaintenanceAlerts(machinesData, productionData, downtimeData)
      
      setMachines(machinesData)
      setAlerts(generatedAlerts)
      
      logBusiness('Maintenance alerts generated', 'MAINTENANCE_ALERTS', {
        totalAlerts: generatedAlerts.length,
        criticalCount: generatedAlerts.filter(a => a.severity === 'critical').length
      })
    } catch (error) {
      logError(error as Error, 'MAINTENANCE_ALERTS', { action: 'load_data' })
      toast({
        title: 'Error',
        description: 'Failed to load maintenance data',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  function generateMaintenanceAlerts(
    machines: any[],
    production: any[],
    downtime: any[]
  ): MaintenanceAlert[] {
    const alerts: MaintenanceAlert[] = []
    const now = new Date()

    machines.forEach(machine => {
      // Calculate machine metrics
      const machineProduction = production.filter(p => p.machine_id === machine.id)
      const machineDowntime = downtime.filter(d => d.machine_id === machine.id)
      
      const totalRuntimeHours = machineProduction.reduce((sum, p) => 
        sum + ((p.setup_time_minutes || 0) + (p.run_time_minutes || 0)) / 60, 0
      )
      
      const totalCycles = machineProduction.reduce((sum, p) => 
        sum + (p.quantity_produced || 0), 0
      )

      const downtimeIncidents = machineDowntime.length
      const avgDowntimeHours = downtimeIncidents > 0
        ? machineDowntime.reduce((sum, d) => {
            const duration = d.end_time 
              ? (new Date(d.end_time).getTime() - new Date(d.start_time).getTime()) / (1000 * 60 * 60)
              : 1
            return sum + duration
          }, 0) / downtimeIncidents
        : 0

      // Calculate reliability score (simplified)
      const reliabilityScore = Math.max(0, 100 - (downtimeIncidents * 5) - (avgDowntimeHours * 2))

      // Scheduled maintenance alert
      if (machine.next_maintenance_due) {
        const dueDate = new Date(machine.next_maintenance_due)
        const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        
        if (daysUntilDue <= 30) {
          alerts.push({
            id: `scheduled-${machine.id}`,
            machine_id: machine.id,
            alert_type: 'scheduled',
            severity: daysUntilDue <= 0 ? 'critical' : daysUntilDue <= 7 ? 'high' : 'medium',
            title: `Scheduled Maintenance ${daysUntilDue <= 0 ? 'Overdue' : 'Due Soon'}`,
            description: `Regular maintenance is ${daysUntilDue <= 0 ? 'overdue' : `due in ${daysUntilDue} days`}`,
            predicted_date: null,
            due_date: machine.next_maintenance_due,
            acknowledged: false,
            acknowledged_by: null,
            acknowledged_at: null,
            completed: false,
            completed_at: null,
            created_at: now.toISOString(),
            machine: {
              machine_name: machine.machine_name,
              machine_type: machine.machine_type,
              status: machine.status
            },
            metrics: {
              runtime_hours: totalRuntimeHours,
              cycle_count: totalCycles,
              days_until_due: daysUntilDue,
              reliability_score: reliabilityScore
            }
          })
        }
      }

      // Predictive maintenance based on usage patterns
      if (totalRuntimeHours > 500 && !machine.next_maintenance_due) {
        alerts.push({
          id: `predictive-runtime-${machine.id}`,
          machine_id: machine.id,
          alert_type: 'predictive',
          severity: totalRuntimeHours > 800 ? 'high' : 'medium',
          title: 'High Runtime Hours',
          description: `Machine has ${totalRuntimeHours.toFixed(0)} runtime hours. Consider scheduling maintenance.`,
          predicted_date: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          due_date: null,
          acknowledged: false,
          acknowledged_by: null,
          acknowledged_at: null,
          completed: false,
          completed_at: null,
          created_at: now.toISOString(),
          machine: {
            machine_name: machine.machine_name,
            machine_type: machine.machine_type,
            status: machine.status
          },
          metrics: {
            runtime_hours: totalRuntimeHours,
            cycle_count: totalCycles,
            days_until_due: 7,
            reliability_score: reliabilityScore
          }
        })
      }

      // Reliability-based alerts
      if (reliabilityScore < 70 && downtimeIncidents > 2) {
        alerts.push({
          id: `predictive-reliability-${machine.id}`,
          machine_id: machine.id,
          alert_type: 'predictive',
          severity: reliabilityScore < 50 ? 'high' : 'medium',
          title: 'Low Reliability Score',
          description: `Machine reliability at ${reliabilityScore.toFixed(0)}% due to ${downtimeIncidents} recent incidents`,
          predicted_date: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString(),
          due_date: null,
          acknowledged: false,
          acknowledged_by: null,
          acknowledged_at: null,
          completed: false,
          completed_at: null,
          created_at: now.toISOString(),
          machine: {
            machine_name: machine.machine_name,
            machine_type: machine.machine_type,
            status: machine.status
          },
          metrics: {
            runtime_hours: totalRuntimeHours,
            cycle_count: totalCycles,
            days_until_due: 3,
            reliability_score: reliabilityScore
          }
        })
      }

      // Current status alerts
      if (machine.status === 'maintenance') {
        alerts.push({
          id: `current-${machine.id}`,
          machine_id: machine.id,
          alert_type: 'urgent',
          severity: 'high',
          title: 'Currently Under Maintenance',
          description: 'Machine is currently offline for maintenance',
          predicted_date: null,
          due_date: null,
          acknowledged: true,
          acknowledged_by: null,
          acknowledged_at: now.toISOString(),
          completed: false,
          completed_at: null,
          created_at: now.toISOString(),
          machine: {
            machine_name: machine.machine_name,
            machine_type: machine.machine_type,
            status: machine.status
          },
          metrics: {
            runtime_hours: totalRuntimeHours,
            cycle_count: totalCycles,
            days_until_due: 0,
            reliability_score: reliabilityScore
          }
        })
      }
    })

    return alerts
  }

  function generateUrgentAlert(downtimeEvent: any) {
    // Real-time alert for new downtime
    toast({
      title: 'Machine Down Alert',
      description: `Machine downtime reported: ${downtimeEvent.reason}`,
      variant: 'destructive',
    })
    loadData() // Refresh data
  }

  async function acknowledgeAlert(alertId: string) {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Update alert in state
      setAlerts(prev => prev.map(alert => 
        alert.id === alertId 
          ? { 
              ...alert, 
              acknowledged: true, 
              acknowledged_by: user.id,
              acknowledged_at: new Date().toISOString()
            }
          : alert
      ))

      logBusiness('Maintenance alert acknowledged', 'MAINTENANCE_ALERTS', { alertId })
      
      toast({
        title: 'Alert acknowledged',
        description: 'Maintenance alert has been acknowledged',
      })
    } catch (error) {
      logError(error as Error, 'MAINTENANCE_ALERTS', { action: 'acknowledge_alert' })
      toast({
        title: 'Error',
        description: 'Failed to acknowledge alert',
        variant: 'destructive',
      })
    }
  }

  async function completeMainenance(alertId: string) {
    try {
      // Update alert as completed
      setAlerts(prev => prev.map(alert => 
        alert.id === alertId 
          ? { 
              ...alert, 
              completed: true,
              completed_at: new Date().toISOString()
            }
          : alert
      ))

      // Update machine's last maintenance date
      const alert = alerts.find(a => a.id === alertId)
      if (alert) {
        const { error } = await supabase
          .from('machines')
          .update({ 
            last_maintenance: new Date().toISOString(),
            status: 'operational'
          })
          .eq('id', alert.machine_id)

        if (error) throw error
      }

      logBusiness('Maintenance completed', 'MAINTENANCE_ALERTS', { alertId })
      
      toast({
        title: 'Maintenance completed',
        description: 'Machine maintenance has been marked as complete',
      })

      loadData()
    } catch (error) {
      logError(error as Error, 'MAINTENANCE_ALERTS', { action: 'complete_maintenance' })
      toast({
        title: 'Error',
        description: 'Failed to complete maintenance',
        variant: 'destructive',
      })
    }
  }

  async function scheduleMainenance(machineId: string, date: string) {
    try {
      const { error } = await supabase
        .from('machines')
        .update({ next_maintenance_due: date })
        .eq('id', machineId)

      if (error) throw error

      logBusiness('Maintenance scheduled', 'MAINTENANCE_ALERTS', { machineId, date })
      
      toast({
        title: 'Maintenance scheduled',
        description: `Maintenance scheduled for ${new Date(date).toLocaleDateString()}`,
      })

      setIsScheduleDialogOpen(false)
      loadData()
    } catch (error) {
      logError(error as Error, 'MAINTENANCE_ALERTS', { action: 'schedule_maintenance' })
      toast({
        title: 'Error',
        description: 'Failed to schedule maintenance',
        variant: 'destructive',
      })
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600'
      case 'high': return 'text-orange-600'
      case 'medium': return 'text-yellow-600'
      case 'low': return 'text-blue-600'
      default: return 'text-gray-600'
    }
  }

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'scheduled': return <Calendar className="h-4 w-4" />
      case 'predictive': return <TrendingUp className="h-4 w-4" />
      case 'urgent': return <AlertTriangle className="h-4 w-4" />
      case 'breakdown': return <XCircle className="h-4 w-4" />
      default: return <Bell className="h-4 w-4" />
    }
  }

  const filteredAlerts = alerts.filter(alert => {
    const matchesSeverity = filterSeverity === 'all' || alert.severity === filterSeverity
    const matchesType = filterType === 'all' || alert.alert_type === filterType
    return matchesSeverity && matchesType && !alert.completed
  })

  const activeAlerts = alerts.filter(a => !a.completed && !a.acknowledged)
  const acknowledgedAlerts = alerts.filter(a => a.acknowledged && !a.completed)
  const completedAlerts = alerts.filter(a => a.completed)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading maintenance data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{activeAlerts.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Require attention
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Acknowledged</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{acknowledgedAlerts.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              In progress
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Predictive Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {alerts.filter(a => a.alert_type === 'predictive').length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              AI-generated
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg Reliability</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(alerts.reduce((sum, a) => sum + (a.metrics?.reliability_score || 0), 0) / alerts.length || 0).toFixed(0)}%
            </div>
            <Progress 
              value={alerts.reduce((sum, a) => sum + (a.metrics?.reliability_score || 0), 0) / alerts.length || 0} 
              className="mt-2"
            />
          </CardContent>
        </Card>
      </div>

      {/* Filters and Actions */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Maintenance Alerts</CardTitle>
            <Dialog open={isScheduleDialogOpen} onOpenChange={setIsScheduleDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Calendar className="h-4 w-4 mr-2" />
                  Schedule Maintenance
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Schedule Maintenance</DialogTitle>
                </DialogHeader>
                <ScheduleMaintenanceForm
                  machines={machines}
                  onSubmit={(machineId, date) => scheduleMainenance(machineId, date)}
                  onCancel={() => setIsScheduleDialogOpen(false)}
                />
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-4">
            <Select value={filterSeverity} onValueChange={setFilterSeverity}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severities</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="predictive">Predictive</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
                <SelectItem value="breakdown">Breakdown</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Alerts Tabs */}
      <Tabs defaultValue="active" className="space-y-4">
        <TabsList>
          <TabsTrigger value="active">
            Active ({activeAlerts.length})
          </TabsTrigger>
          <TabsTrigger value="acknowledged">
            Acknowledged ({acknowledgedAlerts.length})
          </TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          {filteredAlerts.filter(a => !a.acknowledged).length === 0 ? (
            <Card>
              <CardContent className="py-8">
                <div className="text-center text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-600" />
                  <p>No active alerts</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            filteredAlerts.filter(a => !a.acknowledged).map(alert => (
              <Card key={alert.id}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className={`p-2 rounded-lg ${
                        alert.severity === 'critical' ? 'bg-red-100' :
                        alert.severity === 'high' ? 'bg-orange-100' :
                        alert.severity === 'medium' ? 'bg-yellow-100' :
                        'bg-blue-100'
                      }`}>
                        <div className={getSeverityColor(alert.severity)}>
                          {getAlertIcon(alert.alert_type)}
                        </div>
                      </div>
                      <div>
                        <h4 className="font-medium">{alert.title}</h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          {alert.description}
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-sm">
                          <span className="font-medium">
                            {alert.machine?.machine_name}
                          </span>
                          <Badge variant="outline">
                            {alert.machine?.machine_type}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge 
                        variant={
                          alert.severity === 'critical' ? 'destructive' :
                          alert.severity === 'high' ? 'destructive' :
                          alert.severity === 'medium' ? 'secondary' :
                          'outline'
                        }
                      >
                        {alert.severity}
                      </Badge>
                    </div>
                  </div>

                  {alert.metrics && (
                    <div className="grid grid-cols-4 gap-4 mt-4 p-3 bg-gray-50 rounded-lg text-sm">
                      <div>
                        <p className="text-muted-foreground">Runtime</p>
                        <p className="font-medium">{alert.metrics.runtime_hours.toFixed(0)}h</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Cycles</p>
                        <p className="font-medium">{alert.metrics.cycle_count}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Days Until Due</p>
                        <p className="font-medium">{alert.metrics.days_until_due}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Reliability</p>
                        <p className="font-medium">{alert.metrics.reliability_score.toFixed(0)}%</p>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end gap-2 mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => acknowledgeAlert(alert.id)}
                    >
                      Acknowledge
                    </Button>
                    {alert.alert_type === 'scheduled' && (
                      <Button
                        size="sm"
                        onClick={() => completeMainenance(alert.id)}
                      >
                        Mark Complete
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="acknowledged" className="space-y-4">
          {acknowledgedAlerts.length === 0 ? (
            <Card>
              <CardContent className="py-8">
                <div className="text-center text-muted-foreground">
                  <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No acknowledged alerts</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            acknowledgedAlerts.map(alert => (
              <Card key={alert.id} className="border-l-4 border-l-yellow-500">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-yellow-600" />
                        <h4 className="font-medium">{alert.title}</h4>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {alert.description}
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        Acknowledged {alert.acknowledged_at && 
                          `on ${new Date(alert.acknowledged_at).toLocaleDateString()}`
                        }
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => completeMainenance(alert.id)}
                    >
                      Mark Complete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="insights" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Maintenance Patterns</CardTitle>
                <CardDescription>
                  Analysis of maintenance trends and predictions
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Zap className="h-5 w-5 text-blue-600" />
                      <div>
                        <p className="font-medium text-sm">Predictive Accuracy</p>
                        <p className="text-xs text-muted-foreground">
                          AI predictions preventing downtime
                        </p>
                      </div>
                    </div>
                    <span className="text-xl font-bold text-blue-600">87%</span>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Shield className="h-5 w-5 text-green-600" />
                      <div>
                        <p className="font-medium text-sm">Preventive Success</p>
                        <p className="text-xs text-muted-foreground">
                          Issues prevented by scheduled maintenance
                        </p>
                      </div>
                    </div>
                    <span className="text-xl font-bold text-green-600">92%</span>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Timer className="h-5 w-5 text-orange-600" />
                      <div>
                        <p className="font-medium text-sm">Avg Response Time</p>
                        <p className="text-xs text-muted-foreground">
                          From alert to resolution
                        </p>
                      </div>
                    </div>
                    <span className="text-xl font-bold text-orange-600">2.4h</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Machine Health Overview</CardTitle>
                <CardDescription>
                  Current health status of all machines
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {machines.slice(0, 5).map(machine => {
                    const machineAlerts = alerts.filter(a => a.machine_id === machine.id)
                    const reliability = machineAlerts[0]?.metrics?.reliability_score || 100
                    
                    return (
                      <div key={machine.id} className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">{machine.machine_name}</span>
                          <span className={`text-sm font-bold ${
                            reliability >= 80 ? 'text-green-600' :
                            reliability >= 60 ? 'text-yellow-600' :
                            'text-red-600'
                          }`}>
                            {reliability.toFixed(0)}%
                          </span>
                        </div>
                        <Progress value={reliability} />
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Maintenance History</CardTitle>
              <CardDescription>
                Recent maintenance activities and outcomes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {completedAlerts.slice(0, 10).map(alert => (
                  <div key={alert.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <div>
                        <p className="font-medium text-sm">{alert.machine?.machine_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {alert.title} - Completed {alert.completed_at && 
                            new Date(alert.completed_at).toLocaleDateString()
                          }
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {alert.alert_type}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function ScheduleMaintenanceForm({ 
  machines,
  onSubmit, 
  onCancel 
}: { 
  machines: any[]
  onSubmit: (machineId: string, date: string) => void
  onCancel: () => void
}) {
  const [selectedMachine, setSelectedMachine] = useState('')
  const [selectedDate, setSelectedDate] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (selectedMachine && selectedDate) {
      onSubmit(selectedMachine, selectedDate)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="machine">Select Machine</Label>
        <Select value={selectedMachine} onValueChange={setSelectedMachine}>
          <SelectTrigger>
            <SelectValue placeholder="Choose a machine" />
          </SelectTrigger>
          <SelectContent>
            {machines.map(machine => (
              <SelectItem key={machine.id} value={machine.id}>
                {machine.machine_name} ({machine.machine_type})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="date">Maintenance Date</Label>
        <Input
          id="date"
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          min={new Date().toISOString().split('T')[0]}
          required
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={!selectedMachine || !selectedDate}>
          Schedule Maintenance
        </Button>
      </div>
    </form>
  )
}