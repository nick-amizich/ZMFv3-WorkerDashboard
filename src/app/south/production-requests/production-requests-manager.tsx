'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { 
  Plus, 
  Calendar, 
  Layers,
  BarChart3,
  Edit
} from 'lucide-react'
import { logBusiness, logError } from '@/lib/logger-client'
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core'
import {
  useSortable,
} from '@dnd-kit/sortable'
import { useDroppable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'

interface ProductionRequest {
  id: string
  request_number: string
  customer_name: string
  part_id?: string | null
  quantity_ordered: number
  quantity_completed: number
  due_date: string
  priority: 'low' | 'normal' | 'high' | 'rush'
  status: 'pending' | 'in_production' | 'completed'
  location?: string
  notes?: any
  created_by?: string
  created_at: string
  updated_at: string
  // Related data
  part?: {
    part_name: string
    part_type: string
    specifications?: any
  } | null
}

interface RequestNotes {
  product_name?: string
  material?: string
  part_type?: string
  remaining_hours?: string
  pricing_info?: string
  airtable_id?: string
  created?: string
  last_modified?: string
  daily_updates?: string[]
  on_hold?: boolean
  includes_left_right?: boolean // Indicates if this order includes both left and right parts
}

interface RequestMetrics {
  totalRequests: number
  openRequests: number
  completedRequests: number
  averageCompletionRate: number
  rushOrders: number
}

export function ProductionRequestsManager() {
  const [requests, setRequests] = useState<ProductionRequest[]>([])
  const [parts, setParts] = useState<any[]>([])
  const [metrics, setMetrics] = useState<RequestMetrics>({
    totalRequests: 0,
    openRequests: 0,
    completedRequests: 0,
    averageCompletionRate: 0,
    rushOrders: 0
  })
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingRequest, setEditingRequest] = useState<ProductionRequest | null>(null)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterPriority, setFilterPriority] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [activeView, setActiveView] = useState<'grid' | 'kanban'>('grid')
  const [activeId, setActiveId] = useState<string | null>(null)
  const { toast } = useToast()
  const supabase = createClient()

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      const [requestsRes, partsRes] = await Promise.all([
        supabase
          .from('production_requests')
          .select(`
            *,
            part:parts_catalog(
              part_name,
              part_type,
              specifications
            )
          `)
          .order('created_at', { ascending: false }),
        supabase
          .from('parts_catalog')
          .select('*')
          .eq('is_active', true)
          .order('part_name')
      ])

      if (requestsRes.error) throw requestsRes.error
      if (partsRes.error) throw partsRes.error

      const requestsData = requestsRes.data || []
      setRequests(requestsData)
      setParts(partsRes.data || [])
      calculateMetrics(requestsData)
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

  function calculateMetrics(requests: ProductionRequest[]) {
    const open = requests.filter(r => r.status === 'pending' || r.status === 'in_production')
    const completed = requests.filter(r => r.status === 'completed')
    const rush = requests.filter(r => r.priority === 'rush')

    const avgCompletion = requests.length > 0
      ? requests.reduce((sum, r) => {
          const rate = r.quantity_ordered > 0 
            ? (r.quantity_completed / r.quantity_ordered) * 100 
            : 0
          return sum + rate
        }, 0) / requests.length
      : 0

    setMetrics({
      totalRequests: requests.length,
      openRequests: open.length,
      completedRequests: completed.length,
      averageCompletionRate: avgCompletion,
      rushOrders: rush.length
    })
  }

  async function saveRequest(formData: FormData) {
    try {
      const notes: RequestNotes = {
        material: formData.get('material') as string || undefined,
        part_type: formData.get('part_type_override') as string || undefined,
        remaining_hours: formData.get('remaining_hours') as string || undefined,
        product_name: formData.get('product_name') as string || undefined,
      }

      const partId = formData.get('part_id') as string
      const material = notes.material
      
      // Check for existing duplicate based on part_id and material
      if (!editingRequest && partId !== 'none' && material) {
        const { data: existingRequests } = await supabase
          .from('production_requests')
          .select('*')
          .eq('part_id', partId)
          .neq('status', 'completed')
        
        if (existingRequests && existingRequests.length > 0) {
          // Check if any have the same material
          const duplicate = existingRequests.find(req => {
            const existingNotes = parseNotes(req.notes)
            return existingNotes.material === material
          })
          
          if (duplicate) {
            // Update existing request instead of creating new one
            const newQuantityOrdered = duplicate.quantity_ordered + parseInt(formData.get('quantity_ordered') as string)
            const { error } = await supabase
              .from('production_requests')
              .update({
                quantity_ordered: newQuantityOrdered,
                priority: formData.get('priority') as string,
                due_date: formData.get('due_date') as string,
              })
              .eq('id', duplicate.id)
            
            if (error) throw error
            
            toast({
              title: 'Request updated',
              description: `Existing request updated. New quantity: ${newQuantityOrdered}`,
            })
            
            setIsDialogOpen(false)
            setEditingRequest(null)
            loadData()
            return
          }
        }
      }

      const requestData = {
        customer_name: 'Random Task Inc', // Default customer name
        part_id: partId === 'none' ? null : partId || null,
        quantity_ordered: parseInt(formData.get('quantity_ordered') as string),
        quantity_completed: parseInt(formData.get('quantity_completed') as string) || 0,
        status: formData.get('status') as string,
        priority: formData.get('priority') as string,
        due_date: formData.get('due_date') as string,
        notes: Object.keys(notes).length > 0 ? JSON.stringify(notes) : null
      }

      if (editingRequest) {
        const { error } = await supabase
          .from('production_requests')
          .update(requestData)
          .eq('id', editingRequest.id)

        if (error) throw error

        logBusiness('Production request updated', 'PRODUCTION_REQUESTS', { 
          requestId: editingRequest.id,
          partId: requestData.part_id,
          material: material
        })

        toast({
          title: 'Request updated',
          description: 'Production request has been updated',
        })
      } else {
        const { error } = await supabase
          .from('production_requests')
          .insert([requestData])

        if (error) throw error

        logBusiness('Production request created', 'PRODUCTION_REQUESTS', { 
          partId: requestData.part_id,
          material: material,
          quantity: requestData.quantity_ordered
        })

        toast({
          title: 'Request created',
          description: 'New production request has been created',
        })
      }

      setIsDialogOpen(false)
      setEditingRequest(null)
      loadData()
    } catch (error) {
      logError(error as Error, 'PRODUCTION_REQUESTS', { action: 'save' })
      toast({
        title: 'Error saving request',
        description: error instanceof Error ? error.message : 'Failed to save request',
        variant: 'destructive',
      })
    }
  }

  async function updateRequestStatus(requestId: string, newStatus: string) {
    // Store the original status for rollback
    const originalRequest = requests.find(r => r.id === requestId)
    const originalStatus = originalRequest?.status

    try {
      console.log(`Updating request ${requestId} to status: "${newStatus}"`)
      
      const { data, error } = await supabase
        .from('production_requests')
        .update({ status: newStatus })
        .eq('id', requestId)
        .select()

      if (error) {
        console.error('Database error:', error)
        throw error
      }

      console.log('Update successful:', data)

      toast({
        title: 'Status updated',
        description: `Request status changed to ${newStatus.replace('_', ' ')}`,
      })

      // Reload data to ensure consistency
      loadData()
    } catch (error) {
      // Rollback the optimistic update
      if (originalStatus) {
        setRequests(prev => 
          prev.map(r => 
            r.id === requestId 
              ? { ...r, status: originalStatus }
              : r
          )
        )
      }

      logError(error as Error, 'PRODUCTION_REQUESTS', { action: 'update_status', requestId, newStatus })
      
      const errorMessage = error instanceof Error && error.message.includes('check constraint')
        ? `Invalid status change to "${newStatus}". Please check if this transition is allowed.`
        : 'Failed to update request status. Please try again.'

      toast({
        title: 'Error updating status',
        description: errorMessage,
        variant: 'destructive',
      })
    }
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string)
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActiveId(null)

    if (!over) return

    const requestId = active.id as string
    const newStatus = over.id as string

    console.log('Drag end - Active ID:', requestId, 'Over ID:', newStatus)

    // Validate that the drop target is a valid status
    const validStatuses = ['pending', 'in_production', 'completed']
    if (!validStatuses.includes(newStatus)) {
      console.warn('Invalid drop target:', newStatus)
      console.log('Valid statuses:', validStatuses)
      return
    }

    // Find the request being moved
    const request = requests.find(r => r.id === requestId)
    if (!request || request.status === newStatus) return

    // Update status optimistically
    setRequests(prev => 
      prev.map(r => 
        r.id === requestId 
          ? { ...r, status: newStatus as ProductionRequest['status'] }
          : r
      )
    )

    // Update in database
    updateRequestStatus(requestId, newStatus)
  }

  function parseNotes(notes: any): RequestNotes {
    if (!notes) return {}
    return typeof notes === 'string' ? JSON.parse(notes) : notes
  }

  const filteredRequests = requests.filter(request => {
    const notes = parseNotes(request.notes)
    const matchesSearch = 
      request.part?.part_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      notes.material?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      notes.product_name?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = filterStatus === 'all' || request.status === filterStatus
    const matchesPriority = filterPriority === 'all' || request.priority === filterPriority
    
    return matchesSearch && matchesStatus && matchesPriority
  })


  return (
    <div className="space-y-6">
      {/* Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalRequests}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Open Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{metrics.openRequests}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{metrics.completedRequests}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Avg Completion</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.averageCompletionRate.toFixed(0)}%</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Rush Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{metrics.rushOrders}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Actions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Production Requests</CardTitle>
            <div className="flex gap-2">
              <Button
                variant={activeView === 'grid' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveView('grid')}
              >
                <Layers className="h-4 w-4" />
              </Button>
              <Button
                variant={activeView === 'kanban' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveView('kanban')}
              >
                <BarChart3 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <Label>Search</Label>
              <Input
                placeholder="Search by part, material..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
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
            
            <div className="md:col-span-2 flex items-end">
              <Button 
                className="w-full"
                onClick={() => {
                  setEditingRequest(null)
                  setIsDialogOpen(true)
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                New Request
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Requests Display */}
      {activeView === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            <div className="col-span-full text-center py-8">Loading requests...</div>
          ) : filteredRequests.length === 0 ? (
            <div className="col-span-full text-center py-8 text-muted-foreground">
              No production requests found
            </div>
          ) : (
            filteredRequests.map((request) => (
              <RequestCard 
                key={request.id} 
                request={request}
                onEdit={() => {
                  setEditingRequest(request)
                  setIsDialogOpen(true)
                }}
              />
            ))
          )}
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={(args) => {
            // Custom collision detection that only considers status columns
            const validStatuses = ['pending', 'in_production', 'completed']
            const filteredDroppables = args.droppableContainers.filter(container => 
              validStatuses.includes(container.id as string)
            )
            
            return closestCenter({
              ...args,
              droppableContainers: filteredDroppables
            })
          }}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <KanbanView 
            requests={filteredRequests}
            onEdit={(request) => {
              setEditingRequest(request)
              setIsDialogOpen(true)
            }}
          />
          <DragOverlay>
            {activeId ? (
              <DraggableCard 
                request={requests.find(r => r.id === activeId)!}
                onEdit={() => {}}
              />
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {editingRequest ? `Edit Request ${editingRequest.request_number}` : 'New Production Request'}
            </DialogTitle>
            <DialogDescription>
              {editingRequest ? 'Update the production request details below.' : 'Create a new production request by filling out the form below.'}
            </DialogDescription>
          </DialogHeader>
          <RequestForm 
            request={editingRequest}
            parts={parts}
            onSubmit={saveRequest}
            onCancel={() => {
              setIsDialogOpen(false)
              setEditingRequest(null)
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}

function RequestCard({ 
  request, 
  onEdit
}: { 
  request: ProductionRequest
  onEdit: () => void
}) {
  const notes = parseNotes(request.notes)
  const completionRate = request.quantity_ordered > 0 
    ? (request.quantity_completed / request.quantity_ordered) * 100 
    : 0
  
  const isOverdue = new Date(request.due_date) < new Date() && request.status !== 'completed'
  
  function parseNotes(notes: any): RequestNotes {
    if (!notes) return {}
    return typeof notes === 'string' ? JSON.parse(notes) : notes
  }

  function getPriorityColor(priority: string) {
    const colors = {
      low: 'secondary',
      normal: 'default',
      high: 'outline',
      rush: 'destructive'
    } as const
    return colors[priority as keyof typeof colors] || 'default'
  }

  function getCardBorderColor(status: string) {
    const colors = {
      pending: 'border-l-4 border-l-gray-400 bg-gray-50',
      in_production: 'border-l-4 border-l-blue-500 bg-blue-50',
      completed: 'border-l-4 border-l-green-500 bg-green-50'
    } as const
    return colors[status as keyof typeof colors] || 'border-l-4 border-l-gray-300 bg-gray-50'
  }

  return (
    <Card className={`hover:shadow-lg transition-all duration-200 ${getCardBorderColor(request.status)}`}>
      <CardContent className="p-3 space-y-3">
        {/* Product/Part Information with Actions */}
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-2 flex-1 min-w-0">
              {/* Material/Wood Type indicator */}
              {notes.material ? (
                <div className="w-2 h-2 bg-amber-500 rounded-full mt-1.5"></div>
              ) : (
                <div className="w-2 h-2 bg-gray-300 rounded-full mt-1.5"></div>
              )}
              <div className="flex-1 min-w-0">
                {/* Product/Part Name */}
                {request.part ? (
                  <div className="text-sm font-medium text-gray-900">{request.part.part_name}</div>
                ) : notes.product_name ? (
                  <div className="text-sm font-medium text-gray-900">{notes.product_name}</div>
                ) : (
                  <div className="text-sm text-muted-foreground">No product specified</div>
                )}

                {/* Material/Wood Type */}
                {notes.material && (
                  <div className="text-xs font-medium text-amber-700">{notes.material}</div>
                )}
              </div>
            </div>
            
            {/* Edit button inline with product name */}
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={(e) => {
                e.stopPropagation()
                onEdit()
              }}
              className="h-6 w-6 p-0 opacity-60 hover:opacity-100"
              title="Edit Request"
            >
              <Edit className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* Quantity and Manufacturing Details */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">Quantity</span>
            <span className="font-medium">
              {request.quantity_completed} / {request.quantity_ordered} units
            </span>
          </div>
          <Progress value={completionRate} className="h-2" />
          <div className="flex justify-between items-center text-xs">
            <span className="text-muted-foreground">
              {completionRate.toFixed(0)}% complete
            </span>
            {notes.remaining_hours && (
              <span className="text-amber-600 font-medium">
                ⏱ {notes.remaining_hours}
              </span>
            )}
          </div>
        </div>

        {/* Status Info */}
        <div className="flex flex-wrap gap-2">
          <Badge variant={getPriorityColor(request.priority)} className="text-xs">
            {request.priority} priority
          </Badge>
        </div>

        {/* Days on Order */}
        <div className="flex items-center gap-1 text-xs">
          <Calendar className="h-3 w-3 text-muted-foreground" />
          <span className={isOverdue ? 'text-red-600 font-medium' : 'text-muted-foreground'}>
            {(() => {
              const createdDate = new Date(request.created_at)
              const today = new Date()
              const diffTime = Math.abs(today.getTime() - createdDate.getTime())
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
              return `${diffDays} days on order`
            })()}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}

// Draggable Card Component
function DraggableCard({ 
  request, 
  onEdit
}: { 
  request: ProductionRequest
  onEdit: () => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: request.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const notes = parseNotes(request.notes)
  const completionRate = request.quantity_ordered > 0 
    ? (request.quantity_completed / request.quantity_ordered) * 100 
    : 0

  function parseNotes(notes: any): RequestNotes {
    if (!notes) return {}
    return typeof notes === 'string' ? JSON.parse(notes) : notes
  }

  function getPriorityColor(priority: string) {
    const colors = {
      low: 'secondary',
      normal: 'default',
      high: 'outline',
      rush: 'destructive'
    } as const
    return colors[priority as keyof typeof colors] || 'default'
  }

  const isOverdue = new Date(request.due_date) < new Date() && request.status !== 'completed'

  // Get card color based on status
  function getCardBorderColor(status: string) {
    const colors = {
      pending: 'border-l-4 border-l-gray-400 bg-gray-50',
      in_production: 'border-l-4 border-l-blue-500 bg-blue-50',
      completed: 'border-l-4 border-l-green-500 bg-green-50'
    } as const
    return colors[status as keyof typeof colors] || 'border-l-4 border-l-gray-300 bg-gray-50'
  }

  return (
    <Card 
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`cursor-grab active:cursor-grabbing hover:shadow-md transition-all duration-200 ${
        isDragging ? 'shadow-xl scale-105 ring-2 ring-blue-300 bg-white z-50' : 'hover:shadow-lg'
      } ${getCardBorderColor(request.status)}`}
    >
      <CardContent className="p-3 space-y-3">
                {/* Product/Part Information with Actions */}
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-2 flex-1 min-w-0">
              {/* Material/Wood Type moved up to replace package icon */}
              {notes.material ? (
                <div className="w-2 h-2 bg-amber-500 rounded-full mt-1.5"></div>
              ) : (
                <div className="w-2 h-2 bg-gray-300 rounded-full mt-1.5"></div>
              )}
              <div className="flex-1 min-w-0">
                {/* Product/Part Name */}
                {request.part ? (
                  <div className="text-sm font-medium text-gray-900">{request.part.part_name}</div>
                ) : notes.product_name ? (
                  <div className="text-sm font-medium text-gray-900">{notes.product_name}</div>
                ) : (
                  <div className="text-sm text-muted-foreground">No product specified</div>
                )}
                


                {/* Material/Wood Type */}
                {notes.material && (
                  <div className="text-xs font-medium text-amber-700">{notes.material}</div>
                )}
              </div>
            </div>
            
            {/* Edit button inline with product name */}
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={(e) => {
                e.stopPropagation()
                onEdit()
              }}
              className="h-6 w-6 p-0 opacity-60 hover:opacity-100"
              title="Edit Request"
            >
              <Edit className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* Quantity and Manufacturing Details */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">Quantity</span>
            <span className="font-medium">
              {request.quantity_completed} / {request.quantity_ordered} units
            </span>
          </div>
          <Progress value={completionRate} className="h-2" />
          <div className="flex justify-between items-center text-xs">
            <span className="text-muted-foreground">
              {completionRate.toFixed(0)}% complete
            </span>
            {notes.remaining_hours && (
              <span className="text-amber-600 font-medium">
                ⏱ {notes.remaining_hours}
              </span>
            )}
          </div>
        </div>

        {/* Status Info */}
        <div className="flex flex-wrap gap-2">
          <Badge variant={getPriorityColor(request.priority)} className="text-xs">
            {request.priority} priority
          </Badge>
        </div>

        {/* Days on Order */}
        <div className="flex items-center gap-1 text-xs">
          <Calendar className="h-3 w-3 text-muted-foreground" />
          <span className={isOverdue ? 'text-red-600 font-medium' : 'text-muted-foreground'}>
            {(() => {
              const createdDate = new Date(request.created_at)
              const today = new Date()
              const diffTime = Math.abs(today.getTime() - createdDate.getTime())
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
              return `${diffDays} days on order`
            })()}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}

// Droppable Column Component
function DroppableColumn({ 
  status, 
  requests, 
  onEdit
}: { 
  status: string
  requests: ProductionRequest[]
  onEdit: (request: ProductionRequest) => void
}) {
  const statusRequests = requests.filter(r => r.status === status)
  const { setNodeRef, isOver } = useDroppable({
    id: status,
  })
  
  // Get header color based on status
  function getHeaderColor(status: string) {
    const colors = {
      pending: 'bg-gray-100 border-l-4 border-l-gray-400',
      in_production: 'bg-blue-50 border-l-4 border-l-blue-500',
      completed: 'bg-green-50 border-l-4 border-l-green-500',
      cancelled: 'bg-red-50 border-l-4 border-l-red-400'
    } as const
    return colors[status as keyof typeof colors] || 'bg-gray-100 border-l-4 border-l-gray-300'
  }

  return (
    <div 
      ref={setNodeRef}
      className={`space-y-2 min-h-[600px] p-3 rounded-lg border-2 border-dashed transition-all duration-200 ${
        isOver 
          ? 'border-blue-400 bg-blue-50 shadow-lg' 
          : 'border-gray-200 hover:border-gray-300'
      }`}
    >
      <div className={`font-medium capitalize p-2 rounded ${getHeaderColor(status)}`}>
        {status.replace('_', ' ')} ({statusRequests.length})
      </div>
      <div className="space-y-2">
        {statusRequests.map(request => (
          <DraggableCard 
            key={request.id}
            request={request}
            onEdit={() => onEdit(request)}
          />
        ))}
        {/* Empty space to make dropping easier */}
        {statusRequests.length === 0 && (
          <div className="text-center text-muted-foreground py-8">
            Drop cards here
          </div>
        )}
      </div>
    </div>
  )
}

function KanbanView({ 
  requests, 
  onEdit 
}: { 
  requests: ProductionRequest[]
  onEdit: (request: ProductionRequest) => void
}) {
  const statuses = ['pending', 'in_production', 'completed']
  
  return (
    <div className="grid grid-cols-3 gap-4">
      {statuses.map(status => (
        <DroppableColumn 
          key={status}
          status={status}
          requests={requests}
          onEdit={onEdit}
        />
      ))}
    </div>
  )
}

function RequestForm({ 
  request, 
  parts,
  onSubmit, 
  onCancel 
}: { 
  request: ProductionRequest | null
  parts: any[]
  onSubmit: (data: FormData) => void
  onCancel: () => void
}) {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    onSubmit(formData)
  }

  const notes = request?.notes ? (typeof request.notes === 'string' ? JSON.parse(request.notes) : request.notes) : {}

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Tabs defaultValue="basic" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="basic">Basic Info</TabsTrigger>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="tracking">Tracking</TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="part_id">Part</Label>
              <Select name="part_id" defaultValue={request?.part_id || 'none'}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a part" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No specific part</SelectItem>
                  {parts.map(part => (
                    <SelectItem key={part.id} value={part.id}>
                      {part.part_name} ({part.part_type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="product_name">Product Name (if no part selected)</Label>
              <Input
                id="product_name"
                name="product_name"
                defaultValue={notes.product_name || ''}
                placeholder="e.g., Custom Baffles"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="quantity_ordered">Quantity Ordered *</Label>
              <Input
                id="quantity_ordered"
                name="quantity_ordered"
                type="number"
                min="1"
                defaultValue={request?.quantity_ordered || 1}
                required
              />
            </div>
            <div>
              <Label htmlFor="quantity_completed">Quantity Completed</Label>
              <Input
                id="quantity_completed"
                name="quantity_completed"
                type="number"
                min="0"
                defaultValue={request?.quantity_completed || 0}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="status">Status</Label>
              <Select name="status" defaultValue={request?.status || 'pending'}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in_production">In Production</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="priority">Priority</Label>
              <Select name="priority" defaultValue={request?.priority || 'normal'}>
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
          </div>

          <div>
            <Label htmlFor="due_date">Due Date *</Label>
            <Input
              id="due_date"
              name="due_date"
              type="date"
              defaultValue={request?.due_date || (() => {
                const date = new Date()
                date.setDate(date.getDate() + 30)
                return date.toISOString().split('T')[0]
              })()}
              required
            />
          </div>
        </TabsContent>

        <TabsContent value="details" className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="material">Material</Label>
              <Input
                id="material"
                name="material"
                defaultValue={notes.material || ''}
                placeholder="e.g., Richlite - Maple"
              />
            </div>
            <div>
              <Label htmlFor="part_type_override">Part Type Override</Label>
              <Input
                id="part_type_override"
                name="part_type_override"
                defaultValue={notes.part_type || ''}
                placeholder="e.g., Baffles, Cups"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="remaining_hours">Remaining Manufacturing Time (Hours)</Label>
            <Input
              id="remaining_hours"
              name="remaining_hours"
              defaultValue={notes.remaining_hours || ''}
              placeholder="e.g., 10, 0:30"
            />
          </div>
        </TabsContent>

        <TabsContent value="tracking" className="space-y-4">
          {notes.airtable_id && (
            <div>
              <Label>Airtable ID</Label>
              <div className="text-sm text-muted-foreground font-mono bg-gray-100 p-2 rounded">
                {notes.airtable_id}
              </div>
            </div>
          )}
          
          {notes.created && (
            <div>
              <Label>Originally Created</Label>
              <div className="text-sm text-muted-foreground">
                {notes.created}
              </div>
            </div>
          )}
          
          {notes.last_modified && (
            <div>
              <Label>Last Modified</Label>
              <div className="text-sm text-muted-foreground">
                {notes.last_modified}
              </div>
            </div>
          )}

          {notes.daily_updates && notes.daily_updates.length > 0 && (
            <div>
              <Label>Daily Update References</Label>
              <div className="text-sm text-muted-foreground font-mono bg-gray-100 p-2 rounded">
                {notes.daily_updates.join(', ')}
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          {request ? 'Update Request' : 'Create Request'}
        </Button>
      </div>
    </form>
  )
}