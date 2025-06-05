'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
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
  production_request_id: string | null
  quantity_produced: number
  manufacturing_date: string
  completed_by: string | null
  machine_id: string | null
  run_time_minutes: number | null
  setup_time_minutes: number | null
  scrap_quantity: number | null
  quality_notes: string | null
  created_at: string | null
  production_request?: {
    quantity_ordered: number
    quantity_completed: number
    notes?: any
    part?: {
      part_name: string
      part_type: string
    }
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
              quantity_ordered,
              quantity_completed,
              notes,
              part:parts_catalog(part_name, part_type)
            ),
            machine:machines(machine_name)
          `)
          .eq('manufacturing_date', selectedDate)
          .order('created_at', { ascending: false }),
        supabase
          .from('production_requests')
          .select(`
            *,
            notes,
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

      console.log('Active requests:', requestsRes.data)
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

      const productionData = {
        production_request_id: formData.get('production_request_id') as string,
        quantity_produced: parseInt(formData.get('quantity_produced') as string),
        manufacturing_date: formData.get('manufacturing_date') as string,
        completed_by: user.id,
        machine_id: null, // We don't track machines anymore
        run_time_minutes: 60, // Default to 60 minutes for now
        scrap_quantity: parseInt(formData.get('scrap_count') as string) || 0,
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


  // Calculate daily metrics
  const dailyMetrics = {
    totalProduced: productions.reduce((sum, p) => sum + p.quantity_produced, 0),
    totalScrap: productions.reduce((sum, p) => sum + (p.scrap_quantity || 0), 0),
    totalMinutes: productions.reduce((sum, p) => sum + (p.run_time_minutes || 0), 0),
    efficiency: 0,
  }

  if (dailyMetrics.totalProduced > 0) {
    dailyMetrics.efficiency = ((dailyMetrics.totalProduced - dailyMetrics.totalScrap) / dailyMetrics.totalProduced) * 100
  }

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
                  <DialogDescription>
                    Record production output, scrap, and other metrics for the selected date
                  </DialogDescription>
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
              Total Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(dailyMetrics.totalMinutes / 60)}h</div>
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
                          {(() => {
                            const request = production.production_request
                            if (!request) return 'Unknown'
                            const notes = request.notes ? (typeof request.notes === 'string' ? JSON.parse(request.notes) : request.notes) : {}
                            const displayName = request.part?.part_name || notes.product_name || 'Unknown'
                            return displayName
                          })()}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {(() => {
                            const request = production.production_request
                            if (!request) return ''
                            const notes = request.notes ? (typeof request.notes === 'string' ? JSON.parse(request.notes) : request.notes) : {}
                            return notes.material || ''
                          })()}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Production</div>
                        <div className="font-medium">
                          {production.quantity_produced} units
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {production.scrap_quantity && production.scrap_quantity > 0 && (
                            <span className="text-red-600">Scrap: {production.scrap_quantity}</span>
                          )}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Time</div>
                        <div className="text-sm space-y-1">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {production.run_time_minutes ? `${production.run_time_minutes} min` : 'N/A'}
                          </div>
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Date</div>
                        <div className="text-sm">
                          {new Date(production.manufacturing_date).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
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
  const [searchQuery, setSearchQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    if (selectedRequest) {
      formData.set('production_request_id', selectedRequest.id)
    }
    onSubmit(formData)
  }

  // Filter requests based on search query
  const filteredRequests = requests.filter(request => {
    const notes = request.notes ? (typeof request.notes === 'string' ? JSON.parse(request.notes) : request.notes) : {}
    let displayName = request.part?.part_name || notes.product_name || 'Unknown Product'
    
    // Clean up left/right references
    displayName = displayName
      .replace(/\s*-?\s*lefts?\s*$/i, '')
      .replace(/\s*-?\s*rights?\s*$/i, '')
      .replace(/\s*\(?\s*lefts?\s*\)?\s*$/i, '')
      .replace(/\s*\(?\s*rights?\s*\)?\s*$/i, '')
      .trim()
    
    const material = notes.material || ''
    const searchString = `${displayName} ${material}`.toLowerCase()
    
    return searchString.includes(searchQuery.toLowerCase())
  })

  const getDisplayName = (request: any) => {
    const notes = request.notes ? (typeof request.notes === 'string' ? JSON.parse(request.notes) : request.notes) : {}
    let displayName = request.part?.part_name || notes.product_name || 'Unknown Product'
    
    // Clean up left/right references
    displayName = displayName
      .replace(/\s*-?\s*lefts?\s*$/i, '')
      .replace(/\s*-?\s*rights?\s*$/i, '')
      .replace(/\s*\(?\s*lefts?\s*\)?\s*$/i, '')
      .replace(/\s*\(?\s*rights?\s*\)?\s*$/i, '')
      .trim()
    
    const material = notes.material || ''
    return `${displayName}${material ? ` - ${material}` : ''} (${request.quantity_completed || 0}/${request.quantity_ordered})`
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="production_request_id">Production Request</Label>
        <div className="relative">
          <Input
            placeholder="Type to search for a production request..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              setIsOpen(true)
            }}
            onFocus={() => setIsOpen(true)}
            onBlur={() => {
              // Delay to allow click on dropdown items
              setTimeout(() => setIsOpen(false), 200)
            }}
          />
          {isOpen && filteredRequests.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
              {filteredRequests.map(request => (
                <div
                  key={request.id}
                  className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                  onClick={() => {
                    setSelectedRequest(request)
                    setSearchQuery(getDisplayName(request))
                    setIsOpen(false)
                  }}
                >
                  {getDisplayName(request)}
                </div>
              ))}
            </div>
          )}
        </div>
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