'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { 
  Plus, 
  Calendar, 
  Package, 
  User, 
  Clock,
  Wrench,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  BarChart3
} from 'lucide-react'
import { logBusiness, logError } from '@/lib/logger-client'

interface DailyProduction {
  id: string
  production_request_id: string
  quantity_produced: number
  manufacturing_date: string
  operator_id: string
  machine_id: string
  shift: 'day' | 'night' | 'weekend'
  production_time_hours: number
  scrap_count: number
  notes: string | null
  qc_status: 'pending' | 'passed' | 'failed' | 'partial'
  created_at: string
  production_request?: {
    customer_name: string
    quantity_ordered: number
    quantity_completed: number
    part?: {
      part_name: string
      part_type: string
    }
  }
  operator?: {
    name: string
  }
  machine?: {
    machine_name: string
  }
}

export function DailyProductionManager() {
  const [productions, setProductions] = useState<DailyProduction[]>([])
  const [activeRequests, setActiveRequests] = useState<any[]>([])
  const [machines, setMachines] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const { toast } = useToast()
  const supabase = createClient()

  useEffect(() => {
    loadData()
  }, [selectedDate])

  async function loadData() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [productionsRes, requestsRes, machinesRes] = await Promise.all([
        supabase
          .from('daily_production')
          .select(`
            *,
            production_request:production_requests(
              customer_name,
              quantity_ordered,
              quantity_completed,
              part:parts_catalog(part_name, part_type)
            ),
            operator:workers!daily_production_operator_id_fkey(name),
            machine:machines(machine_name)
          `)
          .eq('manufacturing_date', selectedDate)
          .order('created_at', { ascending: false }),
        supabase
          .from('production_requests')
          .select(`
            *,
            part:parts_catalog(part_name, part_type)
          `)
          .in('status', ['pending', 'in_production'])
          .order('due_date'),
        supabase
          .from('machines')
          .select('*')
          .eq('status', 'operational')
          .order('machine_name')
      ])

      if (productionsRes.error) throw productionsRes.error
      if (requestsRes.error) throw requestsRes.error
      if (machinesRes.error) throw machinesRes.error

      setProductions(productionsRes.data || [])
      setActiveRequests(requestsRes.data || [])
      setMachines(machinesRes.data || [])
    } catch (error) {
      logError(error as Error, 'DAILY_PRODUCTION', { action: 'load' })
      toast({
        title: 'Error loading data',
        description: 'Failed to load production data',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  async function logProduction(formData: FormData) {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data: worker } = await supabase
        .from('workers')
        .select('auth_user_id')
        .eq('auth_user_id', user.id)
        .single()

      if (!worker) throw new Error('Worker not found')

      const productionData = {
        production_request_id: formData.get('production_request_id') as string,
        quantity_produced: parseInt(formData.get('quantity_produced') as string),
        manufacturing_date: formData.get('manufacturing_date') as string,
        operator_id: worker.auth_user_id,
        machine_id: formData.get('machine_id') as string,
        shift: formData.get('shift') as 'day' | 'night' | 'weekend',
        production_time_hours: parseFloat(formData.get('production_time_hours') as string),
        scrap_count: parseInt(formData.get('scrap_count') as string) || 0,
        notes: formData.get('notes') as string || null,
        qc_status: 'pending' as const,
      }

      // Insert production record
      const { data: production, error: productionError } = await supabase
        .from('daily_production')
        .insert([productionData])
        .select()
        .single()

      if (productionError) throw productionError

      // Update production request quantity completed
      const request = activeRequests.find(r => r.id === productionData.production_request_id)
      if (request) {
        const newCompleted = (request.quantity_completed || 0) + productionData.quantity_produced
        const newStatus = newCompleted >= request.quantity_ordered ? 'completed' : 'in_production'

        const { error: updateError } = await supabase
          .from('production_requests')
          .update({ 
            quantity_completed: newCompleted,
            status: newStatus
          })
          .eq('id', productionData.production_request_id)

        if (updateError) throw updateError
      }

      logBusiness('Daily production logged', 'DAILY_PRODUCTION', { 
        productionId: production.id,
        quantity: productionData.quantity_produced,
        machineId: productionData.machine_id
      })

      toast({
        title: 'Production logged',
        description: `Successfully logged ${productionData.quantity_produced} units`,
      })

      setIsDialogOpen(false)
      loadData()
    } catch (error) {
      logError(error as Error, 'DAILY_PRODUCTION', { action: 'log' })
      toast({
        title: 'Error logging production',
        description: error instanceof Error ? error.message : 'Failed to log production',
        variant: 'destructive',
      })
    }
  }

  async function updateQCStatus(id: string, status: string) {
    try {
      const { error } = await supabase
        .from('daily_production')
        .update({ qc_status: status })
        .eq('id', id)

      if (error) throw error

      toast({
        title: 'QC status updated',
        description: `Status changed to ${status}`,
      })

      loadData()
    } catch (error) {
      logError(error as Error, 'DAILY_PRODUCTION', { action: 'update_qc' })
      toast({
        title: 'Error updating QC status',
        description: 'Failed to update quality control status',
        variant: 'destructive',
      })
    }
  }

  // Calculate daily metrics
  const dailyMetrics = {
    totalProduced: productions.reduce((sum, p) => sum + p.quantity_produced, 0),
    totalScrap: productions.reduce((sum, p) => sum + p.scrap_count, 0),
    totalHours: productions.reduce((sum, p) => sum + p.production_time_hours, 0),
    efficiency: 0,
    qcPassRate: 0,
  }

  if (dailyMetrics.totalProduced > 0) {
    dailyMetrics.efficiency = ((dailyMetrics.totalProduced - dailyMetrics.totalScrap) / dailyMetrics.totalProduced) * 100
  }

  const passedCount = productions.filter(p => p.qc_status === 'passed').length
  if (productions.length > 0) {
    dailyMetrics.qcPassRate = (passedCount / productions.length) * 100
  }

  const qcStatusColors = {
    pending: 'default',
    passed: 'success',
    failed: 'destructive',
    partial: 'warning',
  } as const

  return (
    <div className="space-y-6">
      {/* Date selector and Add button */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Production Date</CardTitle>
              <CardDescription>View and log production for a specific date</CardDescription>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Log Production
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Log Daily Production</DialogTitle>
                </DialogHeader>
                <ProductionForm 
                  requests={activeRequests}
                  machines={machines}
                  defaultDate={selectedDate}
                  onSubmit={logProduction}
                  onCancel={() => setIsDialogOpen(false)}
                />
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Calendar className="h-5 w-5 text-muted-foreground" />
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-48"
            />
          </div>
        </CardContent>
      </Card>

      {/* Daily Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Units Produced
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dailyMetrics.totalProduced}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Scrap Count
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{dailyMetrics.totalScrap}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Hours
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dailyMetrics.totalHours.toFixed(1)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Efficiency
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dailyMetrics.efficiency.toFixed(1)}%</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              QC Pass Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{dailyMetrics.qcPassRate.toFixed(1)}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Production List */}
      <Card>
        <CardHeader>
          <CardTitle>Production Log</CardTitle>
          <CardDescription>All production entries for {new Date(selectedDate).toLocaleDateString()}</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading production data...</div>
          ) : productions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No production logged for this date
            </div>
          ) : (
            <div className="space-y-4">
              {productions.map((production) => (
                <Card key={production.id}>
                  <CardContent className="pt-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div>
                        <div className="text-sm text-muted-foreground">Part</div>
                        <div className="font-medium">
                          {production.production_request?.part?.part_name || 'Unknown'}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {production.production_request?.customer_name}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Production</div>
                        <div className="font-medium">
                          {production.quantity_produced} units
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {production.scrap_count > 0 && (
                            <span className="text-red-600">Scrap: {production.scrap_count}</span>
                          )}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Details</div>
                        <div className="text-sm space-y-1">
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {production.operator?.name || 'Unknown'}
                          </div>
                          <div className="flex items-center gap-1">
                            <Wrench className="h-3 w-3" />
                            {production.machine?.machine_name || 'Unknown'}
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {production.production_time_hours}h ({production.shift})
                          </div>
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground mb-2">QC Status</div>
                        <Select 
                          value={production.qc_status} 
                          onValueChange={(value) => updateQCStatus(production.id, value)}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="passed">Passed</SelectItem>
                            <SelectItem value="failed">Failed</SelectItem>
                            <SelectItem value="partial">Partial</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    {production.notes && (
                      <div className="mt-4 text-sm text-muted-foreground">
                        <span className="font-medium">Notes:</span> {production.notes}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function ProductionForm({ 
  requests, 
  machines,
  defaultDate,
  onSubmit, 
  onCancel 
}: { 
  requests: any[]
  machines: any[]
  defaultDate: string
  onSubmit: (data: FormData) => void
  onCancel: () => void
}) {
  const [selectedRequest, setSelectedRequest] = useState<any>(null)

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    onSubmit(formData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="production_request_id">Production Request</Label>
        <Select 
          name="production_request_id" 
          required
          onValueChange={(value) => {
            const request = requests.find(r => r.id === value)
            setSelectedRequest(request)
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select a production request" />
          </SelectTrigger>
          <SelectContent>
            {requests.map(request => (
              <SelectItem key={request.id} value={request.id}>
                {request.part?.part_name} - {request.customer_name} 
                ({request.quantity_completed || 0}/{request.quantity_ordered})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selectedRequest && (
          <div className="mt-2 p-3 bg-gray-50 rounded-md text-sm">
            <div>Remaining: {selectedRequest.quantity_ordered - (selectedRequest.quantity_completed || 0)} units</div>
            <div>Due: {new Date(selectedRequest.due_date).toLocaleDateString()}</div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="quantity_produced">Quantity Produced</Label>
          <Input
            id="quantity_produced"
            name="quantity_produced"
            type="number"
            min="1"
            max={selectedRequest ? selectedRequest.quantity_ordered - (selectedRequest.quantity_completed || 0) : undefined}
            required
          />
        </div>
        <div>
          <Label htmlFor="scrap_count">Scrap Count</Label>
          <Input
            id="scrap_count"
            name="scrap_count"
            type="number"
            min="0"
            defaultValue="0"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="machine_id">Machine</Label>
          <Select name="machine_id" required>
            <SelectTrigger>
              <SelectValue placeholder="Select machine" />
            </SelectTrigger>
            <SelectContent>
              {machines.map(machine => (
                <SelectItem key={machine.id} value={machine.id}>
                  {machine.machine_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="shift">Shift</Label>
          <Select name="shift" defaultValue="day">
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Day</SelectItem>
              <SelectItem value="night">Night</SelectItem>
              <SelectItem value="weekend">Weekend</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="manufacturing_date">Manufacturing Date</Label>
          <Input
            id="manufacturing_date"
            name="manufacturing_date"
            type="date"
            defaultValue={defaultDate}
            required
          />
        </div>
        <div>
          <Label htmlFor="production_time_hours">Production Hours</Label>
          <Input
            id="production_time_hours"
            name="production_time_hours"
            type="number"
            step="0.5"
            min="0.5"
            required
          />
        </div>
      </div>

      <div>
        <Label htmlFor="notes">Notes</Label>
        <textarea
          id="notes"
          name="notes"
          className="w-full min-h-[80px] px-3 py-2 text-sm rounded-md border border-input bg-background"
          placeholder="Any notes about this production run..."
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          Log Production
        </Button>
      </div>
    </form>
  )
}