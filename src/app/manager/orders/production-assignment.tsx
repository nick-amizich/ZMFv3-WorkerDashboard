'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { useToast } from '@/hooks/use-toast'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { 
  Package, 
  Users, 
  RefreshCw, 
  Plus, 
  ArrowRight, 
  Clock, 
  CheckCircle,
  User,
  Settings,
  Download,
  GripVertical,
  Target,
  UserCheck,
  ChevronDown,
  ChevronRight,
  Eye,
  Wrench,
  Palette,
  TreePine
} from 'lucide-react'

interface ShopifyLineItem {
  id: number
  title: string
  variant_title?: string
  quantity: number
  price: string
  sku: string
  headphone_specs: {
    product_category: string
    wood_type?: string
    material?: string
    color?: string
    pad_type?: string
    cable_type?: string
    custom_engraving?: string
    requires_custom_work: boolean
  }
  estimated_tasks: string[]
  import_status?: 'imported' | 'not_imported'
  can_be_selected?: boolean
}

interface ShopifyOrder {
  id: number
  order_number: string
  name: string
  created_at: string
  financial_status: string
  fulfillment_status: string | null
  total_price: string
  customer?: {
    first_name: string
    last_name: string
    email: string
  }
  line_items: ShopifyLineItem[]
  main_items?: ShopifyLineItem[]
  extra_items?: ShopifyLineItem[]
  import_status?: 'not_imported' | 'partially_imported' | 'fully_imported'
  _import_status?: {
    status: string
    has_imported_items: boolean
    imported_count: number
    unimported_count: number
    total_count: number
    all_imported: boolean
    partially_imported: boolean
  }
}

interface Worker {
  id: string
  name: string
  skills: string[]
  is_active: boolean
  current_workload?: number
  assigned_tasks?: number
  assignedTasks?: Array<{
    id: string
    task_type: string
    status: string
    priority: string
    batch_id?: string
    order_item: {
      product_name: string
      order: {
        order_number: string
        customer_name: string
      }
    }
    batch?: {
      name: string
      workflow_template?: {
        name: string
      }
    }
  }>
}

interface Workflow {
  id: string
  name: string
  stages: Array<{
    stage: string
    name: string
    tasks?: Array<any>
  }>
}

interface DragItem {
  type: 'item'
  orderId: number
  orderNumber: string
  customerName: string
  item: ShopifyLineItem
}

export function ProductionAssignment() {
  const [shopifyOrders, setShopifyOrders] = useState<ShopifyOrder[]>([])
  const [workers, setWorkers] = useState<Worker[]>([])
  const [workflows, setWorkflows] = useState<Workflow[]>([])
  const [loading, setLoading] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [draggedItem, setDraggedItem] = useState<DragItem | null>(null)
  const [dragOverWorker, setDragOverWorker] = useState<string | null>(null)
  
  // Expanded orders for showing item details
  const [expandedOrders, setExpandedOrders] = useState<Set<number>>(new Set())
  
  // Selected items for assignment (orderId -> Set of itemIds)
  const [selectedItems, setSelectedItems] = useState<Map<number, Set<number>>>(new Map())
  
  // Assignment dialog state
  const [showAssignDialog, setShowAssignDialog] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<ShopifyOrder | null>(null)
  const [selectedWorker, setSelectedWorker] = useState('')
  const [selectedWorkflow, setSelectedWorkflow] = useState('')
  
  // Pagination state
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    hasMore: false,
    total: 0
  })
  
  // Filters
  const [filters, setFilters] = useState({
    model: 'all',
    material: 'all',
    customer: '',
    orderNumber: ''
  })
  
  const { toast } = useToast()

  // Fetch Shopify orders directly (not imported items)
  const fetchShopifyOrders = useCallback(async (page: number = 1, append: boolean = false) => {
    setLoading(true)
    console.log(`DEBUG: Fetching orders - page ${page}, append: ${append}`)
    
    try {
      const response = await fetch(`/api/shopify/sync?page=${page}&limit=25`, {
        method: 'POST'
      })
      
      console.log('DEBUG: Response status:', response.status)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('DEBUG: API Error:', errorText)
        throw new Error(`Failed to fetch Shopify orders: ${response.status}`)
      }
      
      const result = await response.json()
      console.log('DEBUG: API Result:', result)
      
      if (result.success) {
        console.log('DEBUG: Orders received:', result.orders?.length || 0)
        setShopifyOrders(prev => append ? [...prev, ...(result.orders || [])] : (result.orders || []))
        setPagination({
          currentPage: result.pagination.currentPage,
          totalPages: result.pagination.totalPages,
          hasMore: result.pagination.hasMore,
          total: result.pagination.total
        })
        
        toast({
          title: 'Orders loaded',
          description: `Loaded ${result.orders?.length || 0} orders from Shopify`,
        })
      } else {
        console.error('DEBUG: API returned error:', result.error)
        throw new Error(result.error)
      }
    } catch (error) {
      console.error('DEBUG: Fetch error:', error)
      toast({
        title: 'Failed to load orders',
        description: error instanceof Error ? error.message : 'Could not fetch orders from Shopify',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  // Fetch workers for assignment with their assigned tasks
  const fetchWorkers = useCallback(async () => {
    try {
      const response = await fetch('/api/workers')
      if (!response.ok) throw new Error('Failed to fetch workers')
      
      const workersData = await response.json()
      const activeWorkers = workersData.filter((w: Worker) => w.is_active)
      
      // Fetch assigned tasks for each worker
      const workersWithTasks = await Promise.all(
        activeWorkers.map(async (worker: Worker) => {
          try {
            const tasksResponse = await fetch(`/api/tasks/worker/${worker.id}`)
            if (tasksResponse.ok) {
              const tasks = await tasksResponse.json()
              return {
                ...worker,
                assignedTasks: tasks || []
              }
            }
            return {
              ...worker,
              assignedTasks: []
            }
          } catch (error) {
            console.error(`Failed to fetch tasks for worker ${worker.id}:`, error)
            return {
              ...worker,
              assignedTasks: []
            }
          }
        })
      )
      
      setWorkers(workersWithTasks)
    } catch (error) {
      console.error('Failed to fetch workers:', error)
    }
  }, [])

  // Fetch workflows for batch creation
  const fetchWorkflows = useCallback(async () => {
    try {
      const response = await fetch('/api/workflows')
      if (!response.ok) throw new Error('Failed to fetch workflows')
      
      const data = await response.json()
      setWorkflows(data)
      
      // Set default workflow
      if (data.length > 0) {
        setSelectedWorkflow(data[0].id)
      }
    } catch (error) {
      console.error('Failed to fetch workflows:', error)
    }
  }, [])

  useEffect(() => {
    fetchShopifyOrders(1, false)
    fetchWorkers()
    fetchWorkflows()
    
    // Set up periodic refresh for workers (to update assigned tasks)
    const workerRefreshInterval = setInterval(fetchWorkers, 30000) // Every 30 seconds
    
    return () => {
      clearInterval(workerRefreshInterval)
    }
  }, [fetchShopifyOrders, fetchWorkers, fetchWorkflows])

  // Get unassigned orders (orders with unimported items)
  const unassignedOrders = useMemo(() => {
    console.log('DEBUG: All Shopify Orders:', shopifyOrders.length)
    console.log('DEBUG: Sample order:', shopifyOrders[0])
    
    const filtered = shopifyOrders.filter(order => {
      const hasMainItems = (order.main_items || []).length > 0
      const hasSelectableItems = (order.main_items || []).some(item => item.can_be_selected !== false)
      const notFullyImported = order.import_status !== 'fully_imported'
      
      console.log(`DEBUG: Order ${order.order_number} - mainItems: ${hasMainItems}, selectable: ${hasSelectableItems}, notFullyImported: ${notFullyImported}`)
      
      return notFullyImported && hasSelectableItems
    })
    
    console.log('DEBUG: Filtered unassigned orders:', filtered.length)
    return filtered
  }, [shopifyOrders])

  // Apply filters to unassigned orders
  const filteredOrders = useMemo(() => {
    // TEMPORARILY show all orders for debugging (remove unassigned filter)
    const ordersToFilter = shopifyOrders // Change this back to unassignedOrders once working
    
    console.log('DEBUG: OrdersToFilter:', ordersToFilter.length)
    
    return ordersToFilter.filter(order => {
      // Customer filter
      const customerName = `${order.customer?.first_name || ''} ${order.customer?.last_name || ''}`.trim()
      if (filters.customer && !customerName.toLowerCase().includes(filters.customer.toLowerCase())) {
        return false
      }
      
      // Order number filter
      if (filters.orderNumber && !order.order_number.toLowerCase().includes(filters.orderNumber.toLowerCase())) {
        return false
      }
      
      // Model and material filters - check if any main item matches
      const mainItems = order.main_items || []
      if (filters.model !== 'all') {
        const hasModel = mainItems.some(item => {
          const itemModel = item.title.match(/ZMF\s+(\w+)/i)?.[1] || item.title.split(' ')[0]
          return itemModel.toLowerCase() === filters.model.toLowerCase()
        })
        if (!hasModel) return false
      }
      
      if (filters.material !== 'all') {
        const hasMaterial = mainItems.some(item => 
          (item.headphone_specs?.material || '') === filters.material
        )
        if (!hasMaterial) return false
      }
      
      return true
    })
  }, [shopifyOrders, filters]) // Changed dependency from unassignedOrders to shopifyOrders

  // Filter options
  const filterOptions = useMemo(() => {
    const allItems = shopifyOrders.flatMap(order => order.main_items || [])
    
    const models = [...new Set(allItems.map(item => {
      const match = item.title.match(/ZMF\s+(\w+)/i)
      return match ? match[1] : item.title.split(' ')[0]
    }))].sort()
    
    const materials = [...new Set(allItems.map(item => item.headphone_specs?.material).filter((material): material is string => Boolean(material)))].sort()
    
    return { models, materials }
  }, [shopifyOrders])

  // Drag and drop handlers - now works with individual items
  const handleItemDragStart = (e: React.DragEvent, item: ShopifyLineItem, order: ShopifyOrder) => {
    console.log('Drag started for item:', item.title)
    
    const dragData: DragItem = {
      type: 'item',
      orderId: order.id,
      orderNumber: order.order_number,
      customerName: `${order.customer?.first_name || ''} ${order.customer?.last_name || ''}`.trim(),
      item: item
    }
    
    setDraggedItem(dragData)
    e.dataTransfer.setData('text/plain', JSON.stringify(dragData))
    e.dataTransfer.effectAllowed = 'move'
    
    // Add visual feedback
    const target = e.target as HTMLElement
    target.style.opacity = '0.5'
  }

  const handleDragOver = (e: React.DragEvent, workerId: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverWorker(workerId)
  }

  const handleDragLeave = () => {
    setDragOverWorker(null)
  }

  const handleDrop = (e: React.DragEvent, workerId: string) => {
    e.preventDefault()
    setDragOverWorker(null)
    
    if (!draggedItem) return
    
    // Set up assignment dialog for individual item
    const order = shopifyOrders.find(o => o.id === draggedItem.orderId)
    if (order) {
      // Clear previous selections and select only the dragged item
      setSelectedItems(new Map([[order.id, new Set([draggedItem.item.id])]]))
      setSelectedOrder(order)
      setSelectedWorker(workerId)
      setShowAssignDialog(true)
    }
    
    setDraggedItem(null)
  }

  const handleDragEnd = (e: React.DragEvent) => {
    // Reset visual feedback
    const target = e.target as HTMLElement
    target.style.opacity = '1'
    
    setDraggedItem(null)
    setDragOverWorker(null)
  }

  // Assign order to worker
  const assignOrderToWorker = async () => {
    if (!selectedOrder || !selectedWorker || !selectedWorkflow) {
      toast({
        title: 'Missing information',
        description: 'Please ensure order, worker, and workflow are selected',
        variant: 'destructive'
      })
      return
    }

    setProcessing(true)
    try {
      // Get selected items from the order
      const selectedItemIds = getSelectedItemsForOrder(selectedOrder.id)
      const selectedItems = (selectedOrder.line_items || []).filter(item => 
        selectedItemIds.has(item.id)
      )
      
      if (selectedItems.length === 0) {
        toast({
          title: 'No items selected',
          description: 'Please select items to assign to the worker',
          variant: 'destructive'
        })
        setProcessing(false)
        return
      }
      
      const lineItemIds = selectedItems.map(item => item.id)

      // First import the items from Shopify
      const importResponse = await fetch('/api/shopify/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: selectedOrder.id,
          lineItemIds: lineItemIds
        })
      })

      if (!importResponse.ok) {
        const error = await importResponse.json()
        throw new Error(error.error || 'Failed to import items from Shopify')
      }

      const importResult = await importResponse.json()
      const importedItems = importResult.orderItems || []

      // Create assignments for each imported item
      const assignments = importedItems.map((item: any) => ({
        order_item_id: item.id,
        assigned_to_id: selectedWorker,
        task_type: 'sanding', // Start with first production stage
        task_description: `Individual item assignment from orders page - Order #${selectedOrder.order_number}`,
        priority: 'normal',
        status: 'assigned'
      }))

      const assignResponse = await fetch('/api/tasks/assign-bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tasks: assignments })
      })

      if (!assignResponse.ok) {
        const error = await assignResponse.json()
        throw new Error(error.error || 'Failed to assign tasks')
      }

      const worker = workers.find(w => w.id === selectedWorker)
      toast({
        title: 'Order assigned successfully',
        description: `Assigned ${selectedItems.length} items from Order #${selectedOrder.order_number} to ${worker?.name}`
      })

      // Reset state and refresh
      setSelectedOrder(null)
      setSelectedWorker('')
      setShowAssignDialog(false)
      fetchShopifyOrders(1, false)
      fetchWorkers() // Refresh workers to show updated assigned tasks

    } catch (error) {
      toast({
        title: 'Failed to assign order',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive'
      })
    } finally {
      setProcessing(false)
    }
  }

  // Load more orders
  const loadMoreOrders = () => {
    if (!loading && pagination.hasMore) {
      fetchShopifyOrders(pagination.currentPage + 1, true)
    }
  }

  // Toggle expanded order
  const toggleOrderExpanded = (orderId: number) => {
    setExpandedOrders(prev => {
      const newSet = new Set(prev)
      if (newSet.has(orderId)) {
        newSet.delete(orderId)
      } else {
        newSet.add(orderId)
      }
      return newSet
    })
  }

  // Item selection handlers
  const toggleItemSelection = (orderId: number, itemId: number) => {
    setSelectedItems(prev => {
      const newMap = new Map(prev)
      const orderItems = newMap.get(orderId) || new Set()
      
      if (orderItems.has(itemId)) {
        orderItems.delete(itemId)
      } else {
        orderItems.add(itemId)
      }
      
      if (orderItems.size === 0) {
        newMap.delete(orderId)
      } else {
        newMap.set(orderId, orderItems)
      }
      
      return newMap
    })
  }

  const selectAllItemsInOrder = (orderId: number, selectAll: boolean) => {
    const order = shopifyOrders.find(o => o.id === orderId)
    if (!order) return

    const availableItems = (order.line_items || []).filter(item => {
      const price = parseFloat(item.price || '0')
      return price > 0 && item.can_be_selected !== false
    })

    setSelectedItems(prev => {
      const newMap = new Map(prev)
      
      if (selectAll) {
        const itemIds = new Set(availableItems.map(item => item.id))
        newMap.set(orderId, itemIds)
      } else {
        newMap.delete(orderId)
      }
      
      return newMap
    })
  }

  const getSelectedItemsForOrder = (orderId: number) => {
    return selectedItems.get(orderId) || new Set()
  }

  const getTotalSelectedItems = () => {
    let total = 0
    selectedItems.forEach(itemSet => {
      total += itemSet.size
    })
    return total
  }

  // Get required skills for an individual item
  const getItemRequiredSkills = (item: ShopifyLineItem) => {
    const skills = new Set<string>()
    const specs = item.headphone_specs
    
    // Add skills based on product category and specifications
    if (specs.product_category === 'headphone') {
      skills.add('assembly')
      skills.add('sanding')
    }
    
    if (specs.wood_type) {
      skills.add('woodworking')
    }
    
    if (specs.requires_custom_work || specs.custom_engraving) {
      skills.add('custom_work')
      skills.add('engraving')
    }
    
    if (specs.material && specs.material.toLowerCase().includes('aluminum')) {
      skills.add('metalwork')
    }
    
    // Add skill for estimated tasks
    if (item.estimated_tasks) {
      item.estimated_tasks.forEach(task => skills.add(task))
    }

    return Array.from(skills)
  }

  // Get required skills for an order based on its items
  const getOrderRequiredSkills = (order: ShopifyOrder) => {
    const skills = new Set<string>()
    const items = (order.line_items || []).filter(item => {
      const price = parseFloat(item.price || '0')
      return price > 0 && item.can_be_selected !== false
    })

    items.forEach(item => {
      const itemSkills = getItemRequiredSkills(item)
      itemSkills.forEach(skill => skills.add(skill))
    })

    return Array.from(skills)
  }

  const getOrderStatusBadge = (order: ShopifyOrder) => {
    if (!order.import_status) return null
    
    switch (order.import_status) {
      case 'partially_imported':
        return <Badge variant="default" className="bg-yellow-100 text-yellow-800 border-yellow-200">⚠ Partially Imported</Badge>
      case 'not_imported':
        return <Badge variant="outline">Available</Badge>
      default:
        return null
    }
  }

  const getAvailableItemCount = (order: ShopifyOrder) => {
    // TEMPORARILY: Include all line items with price > 0, not just main_items
    const allItems = order.line_items || []
    const availableItems = allItems.filter(item => {
      const price = parseFloat(item.price || '0')
      return price > 0 && item.can_be_selected !== false
    })
    console.log(`DEBUG: Order ${order.order_number} - Available items: ${availableItems.length} of ${allItems.length}`)
    return availableItems.length
  }

  const getTotalItemCount = (order: ShopifyOrder) => {
    // TEMPORARILY: Count all line items with price > 0
    const allItems = order.line_items || []
    const paidItems = allItems.filter(item => parseFloat(item.price || '0') > 0)
    return paidItems.length
  }

  // Enhanced item detail card with selection and drag
  const ItemDetailCard = ({ item, isAvailable, orderId }: { 
    item: ShopifyLineItem, 
    isAvailable: boolean, 
    orderId: number 
  }) => {
    const specs = item.headphone_specs
    const price = parseFloat(item.price || '0')
    const isSelected = getSelectedItemsForOrder(orderId).has(item.id)
    const order = shopifyOrders.find(o => o.id === orderId)!
    
    return (
      <div 
        className={`border rounded-lg p-3 transition-all ${
          isAvailable ? 'bg-white hover:bg-blue-50 cursor-move' : 'bg-gray-50 opacity-75'
        } ${isSelected ? 'ring-2 ring-blue-500 bg-blue-50' : ''}`}
        draggable={isAvailable}
        onDragStart={(e) => isAvailable && handleItemDragStart(e, item, order)}
        onDragEnd={handleDragEnd}
      >
        <div className="flex items-start gap-3">
          {/* Selection checkbox */}
          {isAvailable && (
            <Checkbox
              checked={isSelected}
              onCheckedChange={() => toggleItemSelection(orderId, item.id)}
              className="mt-1"
            />
          )}
          
          {/* Drag handle */}
          {isAvailable && (
            <GripVertical className="h-4 w-4 mt-1 text-gray-400 cursor-move" />
          )}
          
          <div className="flex-1">
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <h5 className="font-medium text-gray-900 text-sm">{item.title}</h5>
                {item.variant_title && (
                  <p className="text-xs text-gray-600 mt-1">{item.variant_title}</p>
                )}
              </div>
              <div className="text-right ml-3">
                <div className="text-sm font-medium">${price.toFixed(2)}</div>
                <div className="text-xs text-gray-500">Qty: {item.quantity}</div>
              </div>
            </div>
            
            {/* Product specifications */}
            <div className="grid grid-cols-2 gap-2 mb-3">
              {specs.wood_type && (
                <div className="flex items-center space-x-1 text-xs">
                  <TreePine className="h-3 w-3 text-amber-600" />
                  <span className="text-gray-600">Wood:</span>
                  <span className="font-medium">{specs.wood_type}</span>
                </div>
              )}
              {specs.material && (
                <div className="flex items-center space-x-1 text-xs">
                  <Wrench className="h-3 w-3 text-gray-600" />
                  <span className="text-gray-600">Material:</span>
                  <span className="font-medium">{specs.material}</span>
                </div>
              )}
              {specs.color && (
                <div className="flex items-center space-x-1 text-xs">
                  <Palette className="h-3 w-3 text-purple-600" />
                  <span className="text-gray-600">Color:</span>
                  <span className="font-medium">{specs.color}</span>
                </div>
              )}
              {specs.pad_type && (
                <div className="flex items-center space-x-1 text-xs">
                  <span className="text-gray-600">Pads:</span>
                  <span className="font-medium">{specs.pad_type}</span>
                </div>
              )}
              {specs.cable_type && (
                <div className="flex items-center space-x-1 text-xs">
                  <span className="text-gray-600">Cable:</span>
                  <span className="font-medium">{specs.cable_type}</span>
                </div>
              )}
              {specs.custom_engraving && (
                <div className="flex items-center space-x-1 text-xs">
                  <span className="text-gray-600">Engraving:</span>
                  <span className="font-medium">"{specs.custom_engraving}"</span>
                </div>
              )}
            </div>
            
            {/* Product category and custom work indicators */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1">
                <Badge variant="outline" className="text-xs">
                  {specs.product_category}
                </Badge>
                {specs.requires_custom_work && (
                  <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-800">
                    Custom Work
                  </Badge>
                )}
                {!isAvailable && (
                  <Badge variant="default" className="text-xs bg-green-100 text-green-800">
                    Already Imported
                  </Badge>
                )}
              </div>
              
              {/* Estimated tasks */}
              {item.estimated_tasks && item.estimated_tasks.length > 0 && (
                <div className="flex items-center space-x-1">
                  <Clock className="h-3 w-3 text-gray-400" />
                  <span className="text-xs text-gray-500">
                    {item.estimated_tasks.join(', ')}
                  </span>
                </div>
              )}
            </div>
            
            {/* SKU if available */}
            {item.sku && (
              <div className="mt-2 text-xs text-gray-500">
                SKU: {item.sku}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (loading && shopifyOrders.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center space-x-2">
          <RefreshCw className="h-5 w-5 animate-spin" />
          <span>Loading Shopify orders...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Production Assignment</h2>
          <p className="text-gray-600">
            Drag individual items directly to workers for precise production assignment
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={() => {
            fetchShopifyOrders(1, false)
            fetchWorkers()
          }}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Data
          </Button>
        </div>
      </div>

      {/* Selection Summary */}
      {getTotalSelectedItems() > 0 && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Checkbox className="h-5 w-5" checked />
                <div>
                  <p className="font-medium text-blue-900">
                    {getTotalSelectedItems()} items selected for assignment
                  </p>
                  <p className="text-sm text-blue-700">
                    Ready to drag to workers or use assignment controls
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setSelectedItems(new Map())}
                  className="text-blue-700 border-blue-300 hover:bg-blue-100"
                >
                  Clear All
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Statistics */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Package className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">Unassigned Orders</p>
                <p className="text-2xl font-bold">{filteredOrders.length}</p>
                <p className="text-xs text-gray-500">of {unassignedOrders.length} total</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-sm text-gray-600">Active Workers</p>
                <p className="text-2xl font-bold">{workers.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Settings className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-sm text-gray-600">Workflows</p>
                <p className="text-2xl font-bold">{workflows.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-indigo-600" />
              <div>
                <p className="text-sm text-gray-600">Page {pagination.currentPage}</p>
                <p className="text-2xl font-bold">{pagination.total}</p>
                <p className="text-xs text-gray-500">total orders</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Model</Label>
              <Select value={filters.model} onValueChange={(value) => setFilters(prev => ({ ...prev, model: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Models</SelectItem>
                  {filterOptions.models.map(model => (
                    <SelectItem key={model} value={model}>{model}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Material</Label>
              <Select value={filters.material} onValueChange={(value) => setFilters(prev => ({ ...prev, material: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Materials</SelectItem>
                  {filterOptions.materials.map(material => (
                    <SelectItem key={material} value={material}>{material}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Customer</Label>
              <Input
                placeholder="Search customer..."
                value={filters.customer}
                onChange={(e) => setFilters(prev => ({ ...prev, customer: e.target.value }))}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Order Number</Label>
              <Input
                placeholder="Search order..."
                value={filters.orderNumber}
                onChange={(e) => setFilters(prev => ({ ...prev, orderNumber: e.target.value }))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left Column - Unassigned Orders */}
        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Package className="h-5 w-5" />
              <span>Unassigned Orders</span>
              <Badge variant="outline">{filteredOrders.length}</Badge>
            </CardTitle>
          </CardHeader>
          
          <CardContent className="space-y-3 max-h-[800px] overflow-y-auto">
            {/* Debug Info */}
            <div className="bg-gray-100 p-3 rounded text-xs space-y-1">
              <p><strong>Debug Info:</strong></p>
              <p>Total Shopify Orders: {shopifyOrders.length}</p>
              <p>Unassigned Orders: {unassignedOrders.length}</p>
              <p>Filtered Orders: {filteredOrders.length}</p>
              <p>Loading: {loading ? 'Yes' : 'No'}</p>
              {shopifyOrders.length > 0 && (
                <details className="mt-2">
                  <summary className="cursor-pointer">Sample Order Data</summary>
                  <pre className="mt-1 text-xs overflow-auto max-h-32">
                    {JSON.stringify(shopifyOrders[0], null, 2)}
                  </pre>
                </details>
              )}
            </div>
            
            {filteredOrders.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No unassigned orders</p>
                <p className="text-sm mt-1">
                  {shopifyOrders.length === 0 
                    ? 'No orders fetched from Shopify' 
                    : unassignedOrders.length === 0 
                      ? 'All orders are fully imported'
                      : 'All orders filtered out by current filters'
                  }
                </p>
                
                {/* Show all orders as fallback */}
                {shopifyOrders.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm font-medium mb-2">All Orders (for debugging):</p>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {shopifyOrders.slice(0, 5).map(order => (
                        <div key={order.id} className="text-left bg-white p-2 rounded border text-xs">
                          <p><strong>Order:</strong> {order.order_number}</p>
                          <p><strong>Status:</strong> {order.import_status || 'unknown'}</p>
                          <p><strong>Main Items:</strong> {(order.main_items || []).length}</p>
                          <p><strong>Total Items:</strong> {(order.line_items || []).length}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              filteredOrders.map(order => {
                const availableItems = getAvailableItemCount(order)
                const totalItems = getTotalItemCount(order)
                const customerName = `${order.customer?.first_name || ''} ${order.customer?.last_name || ''}`.trim()
                
                return (
                  <div
                    key={order.id}
                    className="border rounded-lg p-4 transition-all bg-white hover:border-blue-300 hover:shadow-md min-h-[200px] flex flex-col"
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <h4 className="font-semibold text-gray-900">Order {order.order_number}</h4>
                        {getOrderStatusBadge(order)}
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900">{customerName}</p>
                        <p className="text-xs text-gray-500">{totalItems} item{totalItems !== 1 ? 's' : ''}</p>
                      </div>
                    </div>
                    
                    {/* Selected items notification */}
                    {getSelectedItemsForOrder(order.id).size > 0 && (
                      <div className="flex items-center space-x-2 mb-3 p-2 bg-blue-50 rounded border border-blue-200">
                        <span className="text-blue-700 font-medium text-sm">
                          ✓ {getSelectedItemsForOrder(order.id).size} items selected
                        </span>
                        <Badge variant="default" className="bg-blue-100 text-blue-800 border-blue-200">
                          Ready to assign
                        </Badge>
                      </div>
                    )}
                    
                    {/* Required skills */}
                    <div className="mb-3">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-gray-600 font-medium">Required skills:</span>
                        <div className="flex flex-wrap gap-1">
                          {getOrderRequiredSkills(order).slice(0, 4).map(skill => (
                            <Badge key={skill} variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                              {skill}
                            </Badge>
                          ))}
                          {getOrderRequiredSkills(order).length > 4 && (
                            <Badge variant="outline" className="text-xs">
                              +{getOrderRequiredSkills(order).length - 4}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Items section - fills remaining space */}
                    <div className="flex-1 flex flex-col">
                      <div className="mb-2">
                        <span className="text-xs text-gray-600 font-medium">Items to assign:</span>
                      </div>
                      
                      {/* Draggable items - fills available space */}
                      <div className="flex-1 space-y-2 min-h-[80px]">
                        {(order.line_items || [])
                          .filter(item => parseFloat(item.price || '0') > 0)
                          .slice(0, totalItems)
                          .map(item => {
                            const isAvailable = item.can_be_selected !== false
                            return (
                              <div 
                                key={item.id} 
                                className={`flex items-center space-x-2 p-3 rounded-lg transition-all ${
                                  isAvailable 
                                    ? 'text-gray-700 hover:bg-blue-50 cursor-move border border-dashed border-gray-200 hover:border-blue-400 bg-gray-50 hover:shadow-sm' 
                                    : 'text-gray-500 bg-gray-100'
                                }`}
                                draggable={isAvailable}
                                onDragStart={(e) => {
                                  e.stopPropagation()
                                  if (isAvailable) {
                                    handleItemDragStart(e, item, order)
                                  }
                                }}
                                onDragEnd={handleDragEnd}
                                title={isAvailable ? "Drag this item to a worker to assign" : "Item not available for assignment"}
                              >
                                {isAvailable && (
                                  <GripVertical className="h-4 w-4 text-gray-400 flex-shrink-0" />
                                )}
                                <div className="flex-1">
                                  <div className="flex items-center justify-between">
                                    <span className={`text-sm font-medium ${item.can_be_selected === false ? 'line-through' : ''}`}>
                                      {item.title}
                                    </span>
                                    <div className="flex items-center space-x-1">
                                      {item.headphone_specs?.wood_type && (
                                        <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
                                          {item.headphone_specs.wood_type}
                                        </Badge>
                                      )}
                                      {item.headphone_specs?.requires_custom_work && (
                                        <Badge variant="outline" className="text-xs bg-orange-50 text-orange-700 border-orange-200">
                                          Custom
                                        </Badge>
                                      )}
                                      {item.import_status === 'imported' && (
                                        <Badge variant="secondary" className="text-xs">Imported</Badge>
                                      )}
                                    </div>
                                  </div>
                                  {item.variant_title && (
                                    <p className="text-xs text-gray-500 mt-1">{item.variant_title}</p>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                      </div>
                      
                      {/* Expand button if there are more details */}
                      {totalItems > 0 && (
                        <div className="mt-3 pt-2 border-t border-gray-100">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              toggleOrderExpanded(order.id)
                            }}
                            className="w-full flex items-center justify-center space-x-1 text-xs text-blue-600 hover:text-blue-800 transition-colors py-1"
                          >
                            {expandedOrders.has(order.id) ? (
                              <>
                                <ChevronDown className="h-3 w-3" />
                                <span>Hide details</span>
                              </>
                            ) : (
                              <>
                                <ChevronRight className="h-3 w-3" />
                                <span>View detailed breakdown</span>
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                            
                    {/* Expanded items detail */}
                    {expandedOrders.has(order.id) && (
                      <div className="mt-3 space-y-2 border-t border-gray-200 pt-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <h6 className="text-xs font-medium text-gray-700">All Order Items:</h6>
                            <span className="text-xs text-gray-500">(drag individual items to workers)</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const selectedCount = getSelectedItemsForOrder(order.id).size
                                const availableItems = (order.line_items || []).filter(item => {
                                  const price = parseFloat(item.price || '0')
                                  return price > 0 && item.can_be_selected !== false
                                })
                                
                                if (selectedCount === availableItems.length) {
                                  selectAllItemsInOrder(order.id, false)
                                } else {
                                  selectAllItemsInOrder(order.id, true)
                                }
                              }}
                              className="text-xs h-6"
                            >
                              {(() => {
                                const selectedCount = getSelectedItemsForOrder(order.id).size
                                const availableItems = (order.line_items || []).filter(item => {
                                  const price = parseFloat(item.price || '0')
                                  return price > 0 && item.can_be_selected !== false
                                })
                                return selectedCount === availableItems.length ? 'Deselect All' : 'Select All'
                              })()}
                            </Button>
                          </div>
                        </div>
                        {(order.line_items || [])
                          .filter(item => parseFloat(item.price || '0') > 0)
                          .map(item => {
                            const isAvailable = item.can_be_selected !== false
                            return (
                              <ItemDetailCard 
                                key={item.id} 
                                item={item} 
                                isAvailable={isAvailable}
                                orderId={order.id}
                              />
                            )
                          })}
                          
                        {/* Show any $0 items (accessories/components) if they exist */}
                        {(order.line_items || []).filter(item => parseFloat(item.price || '0') === 0).length > 0 && (
                          <div className="mt-3">
                            <h6 className="text-xs font-medium text-gray-600 mb-2">Included Components (No charge):</h6>
                            {(order.line_items || [])
                              .filter(item => parseFloat(item.price || '0') === 0)
                              .map(item => (
                                <div key={item.id} className="text-xs text-gray-500 bg-gray-50 p-2 rounded border">
                                  • {item.title} {item.variant_title && `(${item.variant_title})`}
                                </div>
                              ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })
            )}
            
            {/* Load More Button */}
            {pagination.hasMore && (
              <div className="text-center py-4">
                <Button 
                  variant="outline" 
                  onClick={loadMoreOrders}
                  disabled={loading}
                >
                  {loading ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4 mr-2" />
                  )}
                  Load More Orders
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right Column - Workers */}
        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="h-5 w-5" />
              <span>Available Workers</span>
              <Badge variant="outline">{workers.length}</Badge>
            </CardTitle>
          </CardHeader>
          
          <CardContent className="space-y-3 max-h-[800px] overflow-y-auto">
            {workers.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No active workers</p>
                <p className="text-sm mt-1">Add workers to start assigning orders</p>
              </div>
            ) : (
              workers.map(worker => {
                // Check skill match with dragged item
                const draggedItemSkills = draggedItem ? getItemRequiredSkills(draggedItem.item) : []
                const skillMatches = draggedItem ? 
                  draggedItemSkills.filter(skill => worker.skills.includes(skill)).length : 0
                const hasGoodSkillMatch = skillMatches >= Math.ceil(draggedItemSkills.length * 0.5)
                
                return (
                  <div
                    key={worker.id}
                    onDragOver={(e) => handleDragOver(e, worker.id)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, worker.id)}
                    className={`border-2 border-dashed rounded-lg p-6 transition-all min-h-[120px] ${
                      dragOverWorker === worker.id
                        ? hasGoodSkillMatch
                          ? 'border-green-400 bg-green-50 scale-105'
                          : 'border-blue-400 bg-blue-50 scale-105'
                        : draggedItem
                          ? hasGoodSkillMatch
                            ? 'border-green-200 hover:border-green-300 bg-green-50'
                            : 'border-gray-200 hover:border-gray-300 bg-gray-50'
                          : 'border-gray-200 hover:border-gray-300 bg-gray-50'
                    }`}
                  >
                  <div className="flex items-center space-x-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold ${
                      dragOverWorker === worker.id ? 'bg-blue-500' : 'bg-gray-400'
                    }`}>
                      {worker.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                    </div>
                    
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900">{worker.name}</h4>
                      
                      {worker.skills.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {worker.skills.slice(0, 3).map(skill => (
                            <Badge key={skill} variant="secondary" className="text-xs">
                              {skill}
                            </Badge>
                          ))}
                          {worker.skills.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{worker.skills.length - 3}
                            </Badge>
                          )}
                        </div>
                      )}
                      
                      <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
                        <span className="flex items-center space-x-1">
                          <UserCheck className="h-3 w-3" />
                          <span>Active</span>
                        </span>
                        <span className="flex items-center space-x-1">
                          <Package className="h-3 w-3" />
                          <span>{worker.assignedTasks?.length || 0} tasks</span>
                        </span>
                      </div>
                    </div>
                    
                    {dragOverWorker === worker.id && (
                      <div className="flex items-center space-x-2">
                        <Target className="h-6 w-6 text-blue-500" />
                        <span className="text-sm font-medium text-blue-600">Drop here</span>
                      </div>
                    )}
                  </div>
                  
                  {dragOverWorker !== worker.id && (
                    <div className="mt-3 border-t border-gray-200 pt-3">
                      {worker.assignedTasks && worker.assignedTasks.length > 0 ? (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-medium text-gray-700">Current Tasks:</span>
                            <span className="text-xs text-gray-500">{worker.assignedTasks.length} active</span>
                          </div>
                          <div className="max-h-32 overflow-y-auto">
                            {(() => {
                              // Group tasks by model name and count them
                              const modelGroups = worker.assignedTasks.reduce((groups, task) => {
                                // Extract model name from product name (e.g., "ZMF Caldera Pads" -> "Caldera")
                                const productName = task.order_item.product_name
                                let modelName = productName
                                
                                // Try to extract ZMF model name
                                const zmfMatch = productName.match(/ZMF\s+(\w+)/i)
                                if (zmfMatch) {
                                  modelName = zmfMatch[1]
                                } else {
                                  // Fallback: use first word
                                  modelName = productName.split(' ')[0]
                                }
                                
                                if (!groups[modelName]) {
                                  groups[modelName] = {
                                    count: 0,
                                    tasks: [],
                                    inProgress: 0,
                                    hasUrgent: false
                                  }
                                }
                                
                                groups[modelName].count++
                                groups[modelName].tasks.push(task)
                                if (task.status === 'in_progress') {
                                  groups[modelName].inProgress++
                                }
                                if (task.priority === 'urgent') {
                                  groups[modelName].hasUrgent = true
                                }
                                
                                return groups
                              }, {} as Record<string, { count: number; tasks: any[]; inProgress: number; hasUrgent: boolean }>)
                              
                              return (
                                <div className="grid grid-cols-2 gap-2">
                                  {Object.entries(modelGroups).map(([modelName, group]) => (
                                    <div 
                                      key={modelName} 
                                      className="relative bg-white border border-gray-200 rounded-lg p-2 shadow-sm hover:shadow-md transition-all cursor-pointer group"
                                      title={`${group.count} ${modelName} tasks - ${group.inProgress} in progress`}
                                    >
                                      {/* Stack effect */}
                                      {group.count > 1 && (
                                        <>
                                          <div className="absolute -top-0.5 -right-0.5 w-full h-full bg-gray-100 rounded-lg -z-10"></div>
                                          <div className="absolute -top-1 -right-1 w-full h-full bg-gray-50 rounded-lg -z-20"></div>
                                        </>
                                      )}
                                      
                                      {/* Model name */}
                                      <div className="text-center">
                                        <h6 className="font-semibold text-gray-900 text-sm truncate">
                                          {modelName}
                                        </h6>
                                        
                                        {/* Count and status */}
                                        <div className="flex items-center justify-center space-x-1 mt-1">
                                          {group.count > 1 && (
                                            <span className="text-xs font-medium text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded">
                                              ×{group.count}
                                            </span>
                                          )}
                                          {group.inProgress > 0 && (
                                            <div className="flex items-center space-x-1">
                                              <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                                              <span className="text-xs text-green-600 font-medium">
                                                {group.inProgress}
                                              </span>
                                            </div>
                                          )}
                                          {group.hasUrgent && (
                                            <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div>
                                          )}
                                        </div>
                                        
                                        {/* Task type */}
                                        <div className="mt-1">
                                          <Badge 
                                            variant="outline" 
                                            className="text-xs bg-gray-50"
                                          >
                                            {group.tasks[0].task_type}
                                          </Badge>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )
                                                          })()}
                          </div>
                          <div className="text-center text-xs text-gray-400 mt-2 pt-2 border-t border-gray-100">
                            Drop items here
                          </div>
                        </div>
                      ) : (
                        <div className="text-center text-sm text-gray-400">
                          Drop items here to assign
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
              })
            )}
          </CardContent>
        </Card>
      </div>

      {/* Assignment Confirmation Dialog */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Items to Worker</DialogTitle>
            <DialogDescription>
              Assign selected items from Order #{selectedOrder?.order_number} to {workers.find(w => w.id === selectedWorker)?.name}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {selectedOrder && (
              <div className="bg-gray-50 rounded-lg p-3">
                <h4 className="font-medium text-gray-900 mb-2">Order Details</h4>
                <div className="text-sm text-gray-600 space-y-1">
                  <p><strong>Order:</strong> #{selectedOrder.order_number}</p>
                  <p><strong>Customer:</strong> {`${selectedOrder.customer?.first_name || ''} ${selectedOrder.customer?.last_name || ''}`.trim()}</p>
                  <p><strong>Selected Items:</strong> {getSelectedItemsForOrder(selectedOrder.id).size} items to assign</p>
                </div>
                
                {/* Show selected items that will be assigned */}
                <div className="mt-3 max-h-40 overflow-y-auto space-y-2">
                  <h5 className="text-xs font-medium text-gray-700">Selected items to be assigned:</h5>
                  {(selectedOrder.line_items || [])
                    .filter(item => getSelectedItemsForOrder(selectedOrder.id).has(item.id))
                    .map(item => (
                      <div key={item.id} className="bg-white p-2 rounded border text-xs">
                        <div className="flex justify-between items-start">
                          <span className="font-medium">{item.title}</span>
                          <span className="text-gray-500">${parseFloat(item.price || '0').toFixed(2)}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          {item.headphone_specs?.wood_type && (
                            <Badge variant="outline" className="text-xs">
                              {item.headphone_specs.wood_type}
                            </Badge>
                          )}
                          {item.headphone_specs?.requires_custom_work && (
                            <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-800">
                              Custom
                            </Badge>
                          )}
                          {item.estimated_tasks && (
                            <span className="text-gray-500 text-xs">
                              Tasks: {item.estimated_tasks.join(', ')}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  
                  {/* Show notice if no items selected */}
                  {getSelectedItemsForOrder(selectedOrder.id).size === 0 && (
                    <div className="text-center py-4 text-gray-500">
                      <p className="text-sm">No items selected for assignment</p>
                      <p className="text-xs mt-1">Please select items from the order before assigning</p>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="workflow">Production Workflow</Label>
              <Select value={selectedWorkflow} onValueChange={setSelectedWorkflow}>
                <SelectTrigger>
                  <SelectValue placeholder="Select workflow..." />
                </SelectTrigger>
                <SelectContent>
                  {workflows.map(workflow => (
                    <SelectItem key={workflow.id} value={workflow.id}>
                      {workflow.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-center space-x-2 text-blue-800">
                <ArrowRight className="h-4 w-4" />
                <span className="text-sm font-medium">
                  Items will be imported and assigned for production
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={() => setShowAssignDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={assignOrderToWorker}
              disabled={!selectedWorkflow || processing}
            >
              {processing ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Assigning...
                </>
              ) : (
                <>
                  <UserCheck className="h-4 w-4 mr-2" />
                  Assign Items
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
} 