'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { RefreshCw, AlertCircle, ChevronDown, ChevronUp, Search, Filter, Calendar, Package, User, DollarSign, Settings } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

interface OrderItem {
  id: string
  product_name: string
  variant_title?: string
  quantity: number
  price: number
  sku?: string
  product_data?: {
    headphone_specs?: {
      product_category: string
      material?: string
      color?: string
      pad_type?: string
      cable_type?: string
      custom_engraving?: string
      requires_custom_work?: boolean
      properties?: Array<{ name: string; value: string }>
    }
  }
  // Globo Product Options properties
  isGloboParent?: boolean
  isGloboChild?: boolean
  globoGroupId?: string
  globoParentGroup?: string
  globoFieldName?: string
  globoChildren?: OrderItem[]
}

interface Order {
  id: string
  order_number: string
  customer_name: string
  customer_email?: string
  total_price: number
  order_date: string
  status: string
  synced_at: string
  raw_data?: any
  order_items?: OrderItem[]
}

type SortField = 'order_date' | 'total_price' | 'order_number' | 'customer_name' | 'status'
type SortDirection = 'asc' | 'desc'

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set())
  const [expandedGloboItems, setExpandedGloboItems] = useState<Set<string>>(new Set())
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortField, setSortField] = useState<SortField>('order_date')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [lastSyncResult, setLastSyncResult] = useState<any>(null)
  const { toast } = useToast()
  
  const fetchOrders = useCallback(async () => {
    try {
      const response = await fetch('/api/orders')
      if (!response.ok) throw new Error('Failed to fetch orders')
      const data = await response.json()
      
      // Enhance orders with item count from raw_data if order_items is empty
      const enhancedOrders = data.map((order: Order) => ({
        ...order,
        itemCount: order.order_items?.length || 
                  (order.raw_data?.line_items ? order.raw_data.line_items.length : 0)
      }))
      
      setOrders(enhancedOrders)
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load orders',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }, [toast])
  
  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])
  
  const handleSync = async () => {
    setSyncing(true)
    try {
      const response = await fetch('/api/shopify/sync', {
        method: 'POST'
      })
      
      if (!response.ok) throw new Error('Sync failed')
      
      const result = await response.json()
      setLastSyncResult(result)
      
      if (result.success) {
        toast({
          title: 'Orders fetched',
          description: `Found ${result.count || 0} orders available for review`
        })
      } else {
        toast({
          title: 'Sync failed',
          description: result.error || 'Could not fetch orders',
          variant: 'destructive'
        })
      }
      
      // Refresh the orders list
      await fetchOrders()
    } catch (error) {
      toast({
        title: 'Sync failed',
        description: 'Could not sync with Shopify',
        variant: 'destructive'
      })
    } finally {
      setSyncing(false)
    }
  }

  const toggleOrderExpansion = (orderId: string) => {
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

  const toggleGloboChildrenExpansion = (itemId: string) => {
    setExpandedGloboItems(prev => {
      const newSet = new Set(prev)
      if (newSet.has(itemId)) {
        newSet.delete(itemId)
      } else {
        newSet.add(itemId)
      }
      return newSet
    })
  }

  const filteredAndSortedOrders = orders
    .filter(order => {
      const matchesSearch = searchTerm === '' || 
        order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.customer_email?.toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchesStatus = statusFilter === 'all' || order.status === statusFilter
      
      return matchesSearch && matchesStatus
    })
    .sort((a, b) => {
      let aValue: any, bValue: any
      
      switch (sortField) {
        case 'order_date':
          aValue = new Date(a.order_date)
          bValue = new Date(b.order_date)
          break
        case 'total_price':
          aValue = a.total_price
          bValue = b.total_price
          break
        case 'order_number':
          aValue = a.order_number
          bValue = b.order_number
          break
        case 'customer_name':
          aValue = a.customer_name
          bValue = b.customer_name
          break
        case 'status':
          aValue = a.status
          bValue = b.status
          break
        default:
          return 0
      }
      
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
      return 0
    })

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'pending': return 'secondary'
      case 'processing': return 'default'
      case 'completed': return 'default'
      case 'cancelled': return 'destructive'
      default: return 'secondary'
    }
  }

  // Helper function to analyze Globo parent/child relationships
  const analyzeGloboRelationships = (items: any[]) => {
    const parentItems: any[] = []
    const childItems: any[] = []
    const globoGroups: { [key: string]: any[] } = {}

    // First pass: separate parents and children
    items.forEach(item => {
      const properties = item.product_data?.headphone_specs?.properties || []
      
      // Check if this is a parent (has _has_gpo or _gpo_product_group)
      const hasGpo = properties.find((prop: any) => prop.name === '_has_gpo')
      const gpoGroup = properties.find((prop: any) => prop.name === '_gpo_product_group')
      
      // Check if this is a child (has _gpo_parent_product_group)
      const parentGroup = properties.find((prop: any) => prop.name === '_gpo_parent_product_group')
      
      if (parentGroup) {
        // This is a child item
        const groupId = parentGroup.value
        if (!globoGroups[groupId]) {
          globoGroups[groupId] = []
        }
        globoGroups[groupId].push({
          ...item,
          isGloboChild: true,
          globoParentGroup: groupId,
          globoFieldName: properties.find((prop: any) => prop.name === '_gpo_field_name')?.value
        })
        childItems.push(item)
      } else if (hasGpo || gpoGroup) {
        // This is a parent item
        const groupId = gpoGroup?.value || hasGpo?.value
        parentItems.push({
          ...item,
          isGloboParent: true,
          globoGroupId: groupId,
          globoChildren: []
        })
      } else {
        // Regular item (no Globo relationship)
        parentItems.push(item)
      }
    })

    // Second pass: attach children to parents
    parentItems.forEach(parent => {
      if (parent.isGloboParent && parent.globoGroupId) {
        parent.globoChildren = globoGroups[parent.globoGroupId] || []
      }
    })

    return parentItems
  }

  const getOrderItemsDisplay = (order: Order) => {
    // First try to get from order_items table
    if (order.order_items && order.order_items.length > 0) {
      return analyzeGloboRelationships(order.order_items)
    }
    
    // Fallback to raw_data from Shopify
    if (order.raw_data?.line_items && Array.isArray(order.raw_data.line_items)) {
      const rawItems = order.raw_data.line_items.map((item: any, index: number) => ({
        id: item.id?.toString() || index.toString(),
        product_name: item.title || item.name || 'Unknown Product',
        variant_title: item.variant_title,
        quantity: item.quantity || 1,
        price: parseFloat(item.price || '0'),
        sku: item.sku,
        product_data: {
          headphone_specs: {
            product_category: determineProductCategory(item.title || '', item.variant_title || ''),
            material: extractMaterial(item.variant_title || ''),
            color: extractColor(item.variant_title || ''),
            custom_engraving: extractCustomEngraving(item.properties || []),
            properties: item.properties || []
          }
        }
      }))
      
      return analyzeGloboRelationships(rawItems)
    }
    
    return []
  }

  // Helper functions to extract headphone specs from raw Shopify data
  const determineProductCategory = (title: string, variant: string): string => {
    const text = (title + ' ' + variant).toLowerCase()
    if (text.includes('headphone') || text.includes('atrium') || text.includes('aeolus') || text.includes('verite') || text.includes('auteur')) {
      return 'headphone'
    } else if (text.includes('pad') || text.includes('cushion')) {
      return 'accessory'
    } else if (text.includes('cable')) {
      return 'cable'
    }
    return 'unknown'
  }

  const extractMaterial = (variantTitle: string): string | null => {
    const materials = ['Aluminum', 'Wood', 'Carbon', 'Steel', 'Titanium', 'Zebra', 'Cherry', 'Mahogany']
    for (const material of materials) {
      if (variantTitle?.toLowerCase().includes(material.toLowerCase())) {
        return material
      }
    }
    return null
  }

  const extractColor = (variantTitle: string): string | null => {
    const colors = ['Black', 'Silver', 'Natural', 'White', 'Red', 'Blue', 'Gold', 'Coffee']
    for (const color of colors) {
      if (variantTitle?.toLowerCase().includes(color.toLowerCase())) {
        return color
      }
    }
    return null
  }

  const extractCustomEngraving = (properties: any[]): string | null => {
    for (const prop of properties || []) {
      const key = prop.name?.toLowerCase() || ''
      if (key.includes('engraving') || key.includes('personalization') || key.includes('custom')) {
        return prop.value
      }
    }
    return null
  }

  // Helper function to get Globo child summary
  const getGloboChildSummary = (children: OrderItem[]) => {
    if (!children || children.length === 0) return ''
    
    const components = children.map(child => {
      if (child.globoFieldName) {
        return child.globoFieldName.split('(')[0].trim() // Extract just the field name
      }
      return child.product_name
    })
    
    return `${children.length} components: ${components.join(', ')}`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading orders...</p>
        </div>
      </div>
    )
  }
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Orders</h2>
          <p className="text-muted-foreground">
            {filteredAndSortedOrders.length} of {orders.length} orders
          </p>
        </div>
        <Button 
          variant="outline"
          onClick={handleSync}
          disabled={syncing}
        >
          {syncing ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Syncing...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Sync with Shopify
            </>
          )}
        </Button>
      </div>

      {/* Sync Results */}
      {lastSyncResult && lastSyncResult.count >= 0 && (
        <Alert className="border-blue-200">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Last sync found {lastSyncResult.count} orders available for import.{' '}
            <Button variant="link" size="sm" className="p-0 h-auto" asChild>
              <a href="/manager/orders/import">Review and import orders →</a>
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filters & Search
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search orders..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={sortField} onValueChange={(value) => setSortField(value as SortField)}>
              <SelectTrigger>
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="order_date">Order Date</SelectItem>
                <SelectItem value="total_price">Total Price</SelectItem>
                <SelectItem value="order_number">Order Number</SelectItem>
                <SelectItem value="customer_name">Customer Name</SelectItem>
                <SelectItem value="status">Status</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={sortDirection} onValueChange={(value) => setSortDirection(value as SortDirection)}>
              <SelectTrigger>
                <SelectValue placeholder="Direction" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="desc">Newest First</SelectItem>
                <SelectItem value="asc">Oldest First</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Orders Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredAndSortedOrders.map((order) => {
          const isExpanded = expandedOrders.has(order.id)
          const orderItems = getOrderItemsDisplay(order)
          
          return (
            <Card key={order.id} className="transition-all duration-200 hover:shadow-md">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <CardTitle className="text-lg flex items-center gap-2">
                      Order #{order.order_number}
                      <Badge variant={getStatusBadgeVariant(order.status)}>
                        {order.status}
                      </Badge>
                    </CardTitle>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {order.customer_name || 'Guest Customer'}
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(order.order_date).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="pt-0">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1">
                        <DollarSign className="h-4 w-4 text-green-600" />
                        <span className="font-medium">${order.total_price}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Package className="h-4 w-4 text-blue-600" />
                        <span className="text-sm">{orderItems.length} items</span>
                      </div>
                    </div>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleOrderExpansion(order.id)}
                      className="flex items-center gap-1"
                    >
                      {isExpanded ? (
                        <>
                          <ChevronUp className="h-4 w-4" />
                          Hide Items
                        </>
                      ) : (
                        <>
                          <ChevronDown className="h-4 w-4" />
                          View Items
                        </>
                      )}
                    </Button>
                  </div>
                  
                  {/* Expanded Items */}
                  {isExpanded && orderItems.length > 0 && (
                    <>
                      <Separator />
                      <div className="space-y-2">
                        <h4 className="font-medium text-sm">Order Items:</h4>
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                          {orderItems.map((item: OrderItem, index: number) => {
                            const isGloboChildrenExpanded = expandedGloboItems.has(item.id)
                            
                            return (
                              <div key={item.id || index} className="space-y-1">
                                {/* Main Item (Parent or Regular) */}
                                <div className="p-2 bg-muted/30 rounded text-sm space-y-1">
                                  <div className="font-medium flex items-center justify-between">
                                    <span>{item.product_name}</span>
                                    {item.isGloboParent && item.globoChildren && item.globoChildren.length > 0 && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => toggleGloboChildrenExpansion(item.id)}
                                        className="h-6 px-2 text-xs"
                                      >
                                        {isGloboChildrenExpanded ? (
                                          <>
                                            <ChevronUp className="h-3 w-3 mr-1" />
                                            Hide Components
                                          </>
                                        ) : (
                                          <>
                                            <ChevronDown className="h-3 w-3 mr-1" />
                                            Show Components
                                          </>
                                        )}
                                      </Button>
                                    )}
                                  </div>
                                  
                                  {item.variant_title && (
                                    <div className="text-muted-foreground text-xs">
                                      {item.variant_title}
                                    </div>
                                  )}
                                  
                                  <div className="flex justify-between items-center text-xs">
                                    <span>Qty: {item.quantity}</span>
                                    <span>${item.price}</span>
                                    {item.sku && <span className="text-muted-foreground">SKU: {item.sku}</span>}
                                  </div>
                                  
                                  {/* Globo Child Summary */}
                                  {item.isGloboParent && item.globoChildren && item.globoChildren.length > 0 && (
                                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-2">
                                      <div className="flex items-center gap-2">
                                        <div className="flex items-center gap-1">
                                          <Package className="h-3 w-3 text-blue-600" />
                                          <span className="text-xs font-medium text-blue-800">
                                            {item.globoChildren.length} Component{item.globoChildren.length !== 1 ? 's' : ''}
                                          </span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <div className="text-xs text-blue-600 truncate">
                                            {(item.globoChildren || []).map(child => {
                                              if (child.globoFieldName) {
                                                return child.globoFieldName.split('(')[0].trim()
                                              }
                                              return child.product_name
                                            }).filter(Boolean).join(' • ')}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                  
                                  {/* Headphone Specifications */}
                                  {item.product_data?.headphone_specs && (
                                    <div className="text-xs space-y-1">
                                      <div className="flex flex-wrap gap-1">
                                        {item.product_data.headphone_specs.material && (
                                          <span className="bg-blue-100 text-blue-800 px-1 py-0.5 rounded text-xs">
                                            {item.product_data.headphone_specs.material}
                                          </span>
                                        )}
                                        {item.product_data.headphone_specs.color && (
                                          <span className="bg-green-100 text-green-800 px-1 py-0.5 rounded text-xs">
                                            {item.product_data.headphone_specs.color}
                                          </span>
                                        )}
                                        {item.product_data.headphone_specs.product_category && (
                                          <span className="bg-purple-100 text-purple-800 px-1 py-0.5 rounded text-xs">
                                            {item.product_data.headphone_specs.product_category}
                                          </span>
                                        )}
                                      </div>
                                      
                                      {/* Custom Properties (excluding Globo internal ones) */}
                                      {item.product_data.headphone_specs.properties && 
                                       Array.isArray(item.product_data.headphone_specs.properties) && 
                                       item.product_data.headphone_specs.properties.some((prop: any) => !prop.name.startsWith('_')) && (
                                        <div className="border-t pt-2 mt-2">
                                          <div className="font-medium text-xs mb-2 flex items-center gap-1">
                                            <Settings className="h-3 w-3" />
                                            Custom Configuration
                                          </div>
                                          <div className="grid grid-cols-1 gap-2">
                                            {item.product_data.headphone_specs.properties
                                              .filter((prop: any) => !prop.name.startsWith('_'))
                                              .map((prop: any, propIndex: number) => {
                                                // Clean up the property name (remove parenthetical model info)
                                                const cleanName = prop.name.split('(')[0].trim()
                                                const modelInfo = prop.name.includes('(') ? prop.name.match(/\(([^)]+)\)/)?.[1] : null
                                                
                                                // Determine option category for styling
                                                const getOptionStyle = (name: string) => {
                                                  const lowerName = name.toLowerCase()
                                                  if (lowerName.includes('wood') || lowerName.includes('material')) {
                                                    return { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-800', icon: '🌳' }
                                                  } else if (lowerName.includes('color') || lowerName.includes('finish')) {
                                                    return { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-800', icon: '🎨' }
                                                  } else if (lowerName.includes('pad') || lowerName.includes('cushion')) {
                                                    return { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-800', icon: '🛏️' }
                                                  } else if (lowerName.includes('cable') || lowerName.includes('cord')) {
                                                    return { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-800', icon: '🔌' }
                                                  } else if (lowerName.includes('headband') || lowerName.includes('strap')) {
                                                    return { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-800', icon: '👑' }
                                                  } else {
                                                    return { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-800', icon: '⚙️' }
                                                  }
                                                }
                                                
                                                const style = getOptionStyle(cleanName)
                                                
                                                return (
                                                  <div
                                                    key={propIndex}
                                                    className={`p-2 rounded-md border ${style.bg} ${style.border} transition-all hover:shadow-sm`}
                                                  >
                                                    <div className="flex items-start justify-between gap-2">
                                                      <div className="flex-1 min-w-0">
                                                        <div className={`font-medium text-xs ${style.text} flex items-center gap-1`}>
                                                          <span className="text-xs">{style.icon}</span>
                                                          <span className="truncate">{cleanName}</span>
                                                        </div>
                                                        {modelInfo && (
                                                          <div className="text-xs text-gray-500 mt-0.5 truncate">
                                                            {modelInfo}
                                                          </div>
                                                        )}
                                                      </div>
                                                      <div className={`text-xs font-semibold ${style.text} text-right`}>
                                                        {prop.value}
                                                      </div>
                                                    </div>
                                                  </div>
                                                )
                                              })}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                  
                                  {item.product_data?.headphone_specs?.custom_engraving && (
                                    <div className="text-orange-600 text-xs font-medium">
                                      Custom: {item.product_data.headphone_specs.custom_engraving}
                                    </div>
                                  )}
                                </div>
                                
                                {/* Globo Child Components (Expandable) */}
                                {item.isGloboParent && item.globoChildren && item.globoChildren.length > 0 && isGloboChildrenExpanded && (
                                  <div className="ml-4 space-y-1">
                                    <div className="text-xs font-medium text-muted-foreground mb-2">
                                      Components (usually included in main item):
                                    </div>
                                    {item.globoChildren.map((child: OrderItem, childIndex: number) => (
                                      <div
                                        key={child.id || childIndex}
                                        className="p-2 bg-gray-100 border-l-2 border-gray-300 rounded text-sm opacity-75 space-y-1"
                                      >
                                        <div className="font-medium text-gray-600 flex items-center">
                                          <span className="mr-2">└</span>
                                          {child.product_name}
                                          {child.globoFieldName && (
                                            <span className="ml-2 text-xs bg-gray-200 px-1 rounded">
                                              {child.globoFieldName}
                                            </span>
                                          )}
                                        </div>
                                        
                                        {child.variant_title && (
                                          <div className="text-gray-500 text-xs ml-4">
                                            {child.variant_title}
                                          </div>
                                        )}
                                        
                                        <div className="flex justify-between items-center text-xs text-gray-500 ml-4">
                                          <span>Qty: {child.quantity}</span>
                                          <span>${child.price} {child.price === 0 && '(included)'}</span>
                                          {child.sku && <span>SKU: {child.sku}</span>}
                                        </div>
                                        
                                        {/* Child specifications if any */}
                                        {child.product_data?.headphone_specs?.properties &&
                                         child.product_data.headphone_specs.properties.some((prop: any) => !prop.name.startsWith('_')) && (
                                          <div className="text-xs ml-4 mt-2">
                                            <div className="space-y-1">
                                              {child.product_data.headphone_specs.properties
                                                .filter((prop: any) => !prop.name.startsWith('_'))
                                                .map((prop: any, propIndex: number) => {
                                                  const cleanName = prop.name.split('(')[0].trim()
                                                  return (
                                                    <div key={propIndex} className="flex items-center justify-between p-1 bg-gray-50 rounded text-xs">
                                                      <span className="font-medium text-gray-600">{cleanName}:</span>
                                                      <span className="text-gray-700">{prop.value}</span>
                                                    </div>
                                                  )
                                                })}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </>
                  )}
                  
                  {isExpanded && orderItems.length === 0 && (
                    <>
                      <Separator />
                      <div className="text-center text-muted-foreground text-sm py-4">
                        No items imported yet. Use the{' '}
                        <Button variant="link" size="sm" className="p-0 h-auto" asChild>
                          <a href="/manager/orders/import">Import page</a>
                        </Button>{' '}
                        to bring items into production.
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Empty State */}
      {filteredAndSortedOrders.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Package className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No orders found</h3>
            <p className="text-muted-foreground text-center mb-4">
              {searchTerm || statusFilter !== 'all' 
                ? 'Try adjusting your filters to see more orders.'
                : 'No orders have been synced yet. Try syncing with Shopify to load orders.'
              }
            </p>
            {orders.length === 0 && (
              <Button onClick={handleSync} disabled={syncing}>
                {syncing ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Syncing...
                  </>
                ) : (
                  'Sync with Shopify'
                )}
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}