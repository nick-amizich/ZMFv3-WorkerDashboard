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
  Truck, 
  Package, 
  MapPin,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  ArrowRight,
  BarChart3
} from 'lucide-react'
import { logBusiness, logError } from '@/lib/logger-client'

interface FacilityTransfer {
  id: string
  batch_id: string | null
  from_location: string
  to_location: string
  transfer_type: string
  quantity: number
  status: string
  shipped_date: string | null
  received_date: string | null
  tracking_number: string | null
  notes: string | null
  created_by: string | null
  created_at: string | null
  from_location_info?: {
    name: string
    code: string
  }
  to_location_info?: {
    name: string
    code: string
  }
  batch?: {
    batch_name: string
    headphone_model?: {
      name: string
    }
  }
  creator?: {
    name: string
  }
}

export function TransferManager() {
  const [transfers, setTransfers] = useState<FacilityTransfer[]>([])
  const [locations, setLocations] = useState<any[]>([])
  const [batches, setBatches] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterType, setFilterType] = useState<string>('all')
  const { toast } = useToast()
  const supabase = createClient()

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      const [transfersRes, locationsRes, batchesRes] = await Promise.all([
        supabase
          .from('facility_transfers')
          .select(`
            *,
            from_location_info:locations!from_location(name, code),
            to_location_info:locations!to_location(name, code),
            batch:work_batches(
              batch_name,
              headphone_model:headphone_models(name)
            ),
            creator:workers!created_by(name)
          `)
          .order('created_at', { ascending: false }),
        supabase
          .from('locations')
          .select('*')
          .eq('active', true),
        supabase
          .from('work_batches')
          .select(`
            id,
            batch_name,
            headphone_model:headphone_models(name)
          `)
          .in('status', ['ready', 'in_production'])
          .order('created_at', { ascending: false })
          .limit(50)
      ])

      if (transfersRes.error) throw transfersRes.error
      if (locationsRes.error) throw locationsRes.error
      if (batchesRes.error) throw batchesRes.error

      setTransfers(transfersRes.data || [])
      setLocations(locationsRes.data || [])
      setBatches(batchesRes.data || [])
    } catch (error) {
      logError(error as Error, 'TRANSFER_MANAGER', { action: 'load_data' })
      toast({
        title: 'Error',
        description: 'Failed to load transfer data',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  async function createTransfer(formData: FormData) {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const transferData = {
        batch_id: formData.get('batch_id') as string || null,
        from_location: formData.get('from_location') as string,
        to_location: formData.get('to_location') as string,
        transfer_type: formData.get('transfer_type') as string,
        quantity: parseInt(formData.get('quantity') as string),
        status: 'pending',
        tracking_number: formData.get('tracking_number') as string || null,
        notes: formData.get('notes') as string || null,
        created_by: user.id
      }

      const { error } = await supabase
        .from('facility_transfers')
        .insert([transferData])

      if (error) throw error

      logBusiness('Transfer created', 'TRANSFER_MANAGER', { 
        from: transferData.from_location,
        to: transferData.to_location,
        quantity: transferData.quantity,
        type: transferData.transfer_type
      })

      toast({
        title: 'Transfer created',
        description: 'The transfer request has been created successfully',
      })

      setIsDialogOpen(false)
      loadData()
    } catch (error) {
      logError(error as Error, 'TRANSFER_MANAGER', { action: 'create_transfer' })
      toast({
        title: 'Error',
        description: 'Failed to create transfer',
        variant: 'destructive',
      })
    }
  }

  async function updateTransferStatus(transferId: string, status: string) {
    try {
      const updateData: any = { status }
      
      if (status === 'in_transit') {
        updateData.shipped_date = new Date().toISOString()
      } else if (status === 'received') {
        updateData.received_date = new Date().toISOString()
      }

      const { error } = await supabase
        .from('facility_transfers')
        .update(updateData)
        .eq('id', transferId)

      if (error) throw error

      logBusiness(`Transfer status updated to ${status}`, 'TRANSFER_MANAGER', { 
        transferId,
        status
      })

      toast({
        title: 'Status updated',
        description: `Transfer marked as ${status}`,
      })

      loadData()
    } catch (error) {
      logError(error as Error, 'TRANSFER_MANAGER', { action: 'update_status', transferId })
      toast({
        title: 'Error',
        description: 'Failed to update transfer status',
        variant: 'destructive',
      })
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4" />
      case 'in_transit': return <Truck className="h-4 w-4" />
      case 'received': return <CheckCircle className="h-4 w-4" />
      case 'cancelled': return <XCircle className="h-4 w-4" />
      default: return <AlertCircle className="h-4 w-4" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'secondary'
      case 'in_transit': return 'default'
      case 'received': return 'default'
      case 'cancelled': return 'destructive'
      default: return 'secondary'
    }
  }

  const filteredTransfers = transfers.filter(transfer => {
    const matchesStatus = filterStatus === 'all' || transfer.status === filterStatus
    const matchesType = filterType === 'all' || transfer.transfer_type === filterType
    return matchesStatus && matchesType
  })

  // Calculate metrics
  const metrics = {
    pending: transfers.filter(t => t.status === 'pending').length,
    inTransit: transfers.filter(t => t.status === 'in_transit').length,
    completed: transfers.filter(t => t.status === 'received').length,
    totalQuantity: transfers.reduce((sum, t) => sum + t.quantity, 0)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading transfers...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.pending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">In Transit</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{metrics.inTransit}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{metrics.completed}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalQuantity}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Actions */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Transfer Management</CardTitle>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  New Transfer
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create Transfer Request</DialogTitle>
                </DialogHeader>
                <TransferForm 
                  locations={locations}
                  batches={batches}
                  onSubmit={createTransfer}
                  onCancel={() => setIsDialogOpen(false)}
                />
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-4">
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in_transit">In Transit</SelectItem>
                <SelectItem value="received">Received</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="components">Components</SelectItem>
                <SelectItem value="materials">Materials</SelectItem>
                <SelectItem value="finished_goods">Finished Goods</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Transfers List */}
      <div className="space-y-4">
        {filteredTransfers.length === 0 ? (
          <Card>
            <CardContent className="py-8">
              <div className="text-center text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No transfers found</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          filteredTransfers.map((transfer) => (
            <Card key={transfer.id}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">
                        {transfer.from_location_info?.name || 'Unknown'}
                      </span>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">
                        {transfer.to_location_info?.name || 'Unknown'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge variant={getStatusColor(transfer.status)}>
                      {getStatusIcon(transfer.status)}
                      <span className="ml-1">{transfer.status.replace('_', ' ')}</span>
                    </Badge>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Type</p>
                    <p className="font-medium capitalize">{transfer.transfer_type.replace('_', ' ')}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Quantity</p>
                    <p className="font-medium">{transfer.quantity} items</p>
                  </div>
                  {transfer.batch && (
                    <div>
                      <p className="text-muted-foreground">Batch</p>
                      <p className="font-medium">{transfer.batch.batch_name}</p>
                    </div>
                  )}
                  {transfer.tracking_number && (
                    <div>
                      <p className="text-muted-foreground">Tracking</p>
                      <p className="font-medium">{transfer.tracking_number}</p>
                    </div>
                  )}
                </div>

                {transfer.notes && (
                  <div className="mt-4 p-3 bg-gray-50 rounded-md">
                    <p className="text-sm">{transfer.notes}</p>
                  </div>
                )}

                <div className="mt-4 flex justify-between items-center">
                  <div className="text-xs text-muted-foreground">
                    Created by {transfer.creator?.name || 'Unknown'} on{' '}
                    {new Date(transfer.created_at!).toLocaleDateString()}
                  </div>
                  <div className="flex gap-2">
                    {transfer.status === 'pending' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateTransferStatus(transfer.id, 'in_transit')}
                      >
                        Mark Shipped
                      </Button>
                    )}
                    {transfer.status === 'in_transit' && (
                      <Button
                        size="sm"
                        onClick={() => updateTransferStatus(transfer.id, 'received')}
                      >
                        Mark Received
                      </Button>
                    )}
                    {(transfer.status === 'pending' || transfer.status === 'in_transit') && (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => updateTransferStatus(transfer.id, 'cancelled')}
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}

function TransferForm({ 
  locations,
  batches,
  onSubmit, 
  onCancel 
}: { 
  locations: any[]
  batches: any[]
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
          <Label htmlFor="from_location">From Location</Label>
          <Select name="from_location" required>
            <SelectTrigger>
              <SelectValue placeholder="Select source" />
            </SelectTrigger>
            <SelectContent>
              {locations.map(location => (
                <SelectItem key={location.id} value={location.id}>
                  {location.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="to_location">To Location</Label>
          <Select name="to_location" required>
            <SelectTrigger>
              <SelectValue placeholder="Select destination" />
            </SelectTrigger>
            <SelectContent>
              {locations.map(location => (
                <SelectItem key={location.id} value={location.id}>
                  {location.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="transfer_type">Transfer Type</Label>
        <Select name="transfer_type" required>
          <SelectTrigger>
            <SelectValue placeholder="Select type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="components">Components</SelectItem>
            <SelectItem value="materials">Materials</SelectItem>
            <SelectItem value="finished_goods">Finished Goods</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="batch_id">Associated Batch (Optional)</Label>
        <Select name="batch_id">
          <SelectTrigger>
            <SelectValue placeholder="Select batch" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">None</SelectItem>
            {batches.map(batch => (
              <SelectItem key={batch.id} value={batch.id}>
                {batch.batch_name} - {batch.headphone_model?.name || 'Unknown Model'}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="quantity">Quantity</Label>
          <Input
            id="quantity"
            name="quantity"
            type="number"
            min="1"
            required
            placeholder="Number of items"
          />
        </div>
        <div>
          <Label htmlFor="tracking_number">Tracking Number</Label>
          <Input
            id="tracking_number"
            name="tracking_number"
            placeholder="Optional"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="notes">Notes</Label>
        <textarea
          id="notes"
          name="notes"
          className="w-full min-h-[80px] px-3 py-2 text-sm rounded-md border border-input bg-background"
          placeholder="Any special instructions or notes..."
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          Create Transfer
        </Button>
      </div>
    </form>
  )
}