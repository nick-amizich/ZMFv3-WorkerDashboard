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
import { useToast } from '@/hooks/use-toast'
import { 
  Plus, 
  Calendar, 
  Package, 
  User, 
  Clock,
  DollarSign,
  AlertCircle,
  CheckCircle,
  XCircle,
  Pause,
  Play
} from 'lucide-react'
import { logBusiness, logError } from '@/lib/logger-client'

export function ProductionRequestsManager() {
  const [requests, setRequests] = useState<any[]>([])
  const [parts, setParts] = useState<any[]>([])
  const [materials, setMaterials] = useState<any[]>([])
  const [workers, setWorkers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterPriority, setFilterPriority] = useState<string>('all')
  const { toast } = useToast()
  const supabase = createClient()

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      const [requestsRes, partsRes, materialsRes, workersRes] = await Promise.all([
        supabase
          .from('production_requests')
          .select('*')
          .order('created_at', { ascending: false }),
        supabase
          .from('parts_catalog')
          .select('id, part_name, part_type')
          .eq('is_active', true)
          .order('part_name'),
        supabase
          .from('wood_inventory')
          .select('id, species, quantity_in_stock')
          .gt('quantity_in_stock', 0)
          .order('species'),
        supabase
          .from('workers')
          .select('auth_user_id, name')
          .eq('is_active', true)
          .order('name')
      ])

      if (requestsRes.error) throw requestsRes.error
      if (partsRes.error) throw partsRes.error
      if (materialsRes.error) throw materialsRes.error
      if (workersRes.error) throw workersRes.error

      setRequests(requestsRes.data || [])
      setParts(partsRes.data || [])
      setMaterials(materialsRes.data || [])
      setWorkers(workersRes.data || [])
    } catch (error) {
      logError(error as Error, 'PRODUCTION_REQUESTS', { action: 'load' })
      toast({
        title: 'Error loading data',
        description: 'Failed to load production requests',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  async function createRequest(formData: FormData) {
    try {
      const requestData = {
        customer_name: formData.get('customer_name') as string,
        part_id: formData.get('part_id') as string,
        quantity_ordered: parseInt(formData.get('quantity_ordered') as string),
        status: formData.get('status') as string,
        priority: formData.get('priority') as string,
        due_date: formData.get('due_date') as string,
        unit_price: formData.get('unit_price') 
          ? parseFloat(formData.get('unit_price') as string) 
          : null,
        notes: formData.get('notes') as string || null,
        location: formData.get('location') as string || null,
        assigned_to: formData.get('assigned_to') as string || null,
      }

      const { error } = await supabase
        .from('production_requests')
        .insert([requestData])

      if (error) throw error

      logBusiness('Production request created', 'PRODUCTION_REQUESTS', { 
        customer: requestData.customer_name,
        quantity: requestData.quantity_ordered
      })

      toast({
        title: 'Request created',
        description: 'Production request has been created successfully',
      })

      setIsDialogOpen(false)
      loadData()
    } catch (error) {
      logError(error as Error, 'PRODUCTION_REQUESTS', { action: 'create' })
      toast({
        title: 'Error creating request',
        description: error instanceof Error ? error.message : 'Failed to create request',
        variant: 'destructive',
      })
    }
  }

  async function updateRequestStatus(id: string, status: string) {
    try {
      const { error } = await supabase
        .from('production_requests')
        .update({ status })
        .eq('id', id)

      if (error) throw error

      logBusiness('Production request status updated', 'PRODUCTION_REQUESTS', { 
        requestId: id,
        newStatus: status
      })

      toast({
        title: 'Status updated',
        description: `Request status changed to ${status}`,
      })

      loadData()
    } catch (error) {
      logError(error as Error, 'PRODUCTION_REQUESTS', { action: 'update_status' })
      toast({
        title: 'Error updating status',
        description: 'Failed to update request status',
        variant: 'destructive',
      })
    }
  }

  const filteredRequests = requests.filter(request => {
    const matchesStatus = filterStatus === 'all' || request.status === filterStatus
    const matchesPriority = filterPriority === 'all' || request.priority === filterPriority
    return matchesStatus && matchesPriority
  })

  const statusIcons = {
    pending: Clock,
    in_production: Play,
    completed: CheckCircle,
    on_hold: Pause,
    cancelled: XCircle,
  } as const

  const priorityColors = {
    low: 'default',
    normal: 'secondary',
    high: 'destructive',
    rush: 'destructive',
  } as const

  type StatusKey = keyof typeof statusIcons
  type PriorityKey = keyof typeof priorityColors

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Filter Requests</CardTitle>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  New Request
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create Production Request</DialogTitle>
                </DialogHeader>
                <RequestForm 
                  parts={parts}
                  materials={materials}
                  workers={workers}
                  onSubmit={createRequest}
                  onCancel={() => setIsDialogOpen(false)}
                />
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Status</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in_production">In Production</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="on_hold">On Hold</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Priority</Label>
              <Select value={filterPriority} onValueChange={setFilterPriority}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="rush">Rush</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Requests List */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-8">Loading requests...</div>
        ) : filteredRequests.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8 text-muted-foreground">
              No production requests found
            </CardContent>
          </Card>
        ) : (
          filteredRequests.map((request) => {
            const StatusIcon = statusIcons[request.status as keyof typeof statusIcons] || Clock
            const progress = request.quantity_ordered > 0 
              ? ((request.quantity_completed || 0) / request.quantity_ordered) * 100 
              : 0

            return (
              <Card key={request.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        {request.part?.part_name || 'Unknown Part'}
                        <Badge variant={priorityColors[request.priority as keyof typeof priorityColors] || 'secondary'}>
                          {request.priority || 'normal'}
                        </Badge>
                      </CardTitle>
                      <CardDescription className="flex items-center gap-4 mt-2">
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {request.customer_name}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Due: {new Date(request.due_date).toLocaleDateString()}
                        </span>
                        {request.assignee && (
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {request.assignee.name}
                          </span>
                        )}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusIcon className="h-5 w-5 text-muted-foreground" />
                      <Select 
                        value={request.status} 
                        onValueChange={(value) => updateRequestStatus(request.id, value)}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="in_production">In Production</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="on_hold">On Hold</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Quantity:</span>
                      <div className="font-medium">
                        {request.quantity_completed} / {request.quantity_ordered}
                      </div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Material:</span>
                      <div className="font-medium">
                        {request.material?.species || 'Not assigned'}
                      </div>
                    </div>
                    {request.unit_price && (
                      <div>
                        <span className="text-muted-foreground">Price/Unit:</span>
                        <div className="font-medium">
                          ${request.unit_price.toFixed(2)}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Progress bar */}
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Progress</span>
                      <span>{progress.toFixed(0)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>

                  {request.notes && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">Notes:</span>
                      <p className="mt-1">{request.notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })
        )}
      </div>
    </div>
  )
}

function RequestForm({ 
  parts, 
  materials, 
  workers,
  onSubmit, 
  onCancel 
}: { 
  parts: any[]
  materials: any[]
  workers: any[]
  onSubmit: (data: FormData) => void
  onCancel: () => void
}) {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    onSubmit(formData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="customer_name">Customer Name</Label>
          <Input
            id="customer_name"
            name="customer_name"
            required
          />
        </div>
        <div>
          <Label htmlFor="part_id">Part</Label>
          <Select name="part_id" required>
            <SelectTrigger>
              <SelectValue placeholder="Select a part" />
            </SelectTrigger>
            <SelectContent>
              {parts.map(part => (
                <SelectItem key={part.id} value={part.id}>
                  {part.part_name} ({part.part_type})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="material_id">Material</Label>
          <Select name="material_id">
            <SelectTrigger>
              <SelectValue placeholder="Select material (optional)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">No material</SelectItem>
              {materials.map(material => (
                <SelectItem key={material.id} value={material.id}>
                  {material.wood_species} (Stock: {material.quantity})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="quantity_ordered">Quantity</Label>
          <Input
            id="quantity_ordered"
            name="quantity_ordered"
            type="number"
            min="1"
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="priority">Priority</Label>
          <Select name="priority" defaultValue="normal">
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="rush">Rush</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="due_date">Due Date</Label>
          <Input
            id="due_date"
            name="due_date"
            type="date"
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="manufacturing_hours_estimate">Estimated Hours</Label>
          <Input
            id="manufacturing_hours_estimate"
            name="manufacturing_hours_estimate"
            type="number"
            step="0.5"
            placeholder="Optional"
          />
        </div>
        <div>
          <Label htmlFor="price_per_unit">Price per Unit</Label>
          <Input
            id="price_per_unit"
            name="price_per_unit"
            type="number"
            step="0.01"
            placeholder="Optional"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="assigned_to">Assign To</Label>
        <Select name="assigned_to">
          <SelectTrigger>
            <SelectValue placeholder="Select worker (optional)" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Unassigned</SelectItem>
            {workers.map(worker => (
              <SelectItem key={worker.auth_user_id} value={worker.auth_user_id}>
                {worker.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="special_instructions">Special Instructions</Label>
        <textarea
          id="special_instructions"
          name="special_instructions"
          className="w-full min-h-[80px] px-3 py-2 text-sm rounded-md border border-input bg-background"
          placeholder="Any special requirements or notes..."
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          Create Request
        </Button>
      </div>
    </form>
  )
}