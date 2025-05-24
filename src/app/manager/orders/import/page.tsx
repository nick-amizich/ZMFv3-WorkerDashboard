'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/hooks/use-toast'
import { RefreshCw, Package, AlertCircle, Clock, Download, Filter } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface ShopifyLineItem {
  id: number
  title: string
  variant_title?: string
  quantity: number
  price: string
  sku: string
  headphone_specs: {
    product_category: string
    material?: string
    color?: string
    pad_type?: string
    cable_type?: string
    custom_engraving?: string
    requires_custom_work: boolean
  }
  estimated_tasks: string[]
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
}

export default function OrderImportPage() {
  const [orders, setOrders] = useState<ShopifyOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [importing, setImporting] = useState(false)
  const [selectedItems, setSelectedItems] = useState<{[orderId: number]: number[]}>({})
  const [filter, setFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const { toast } = useToast()

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/shopify/sync', {
        method: 'POST'
      })
      
      if (!response.ok) throw new Error('Failed to fetch orders')
      
      const result = await response.json()
      
      if (result.success) {
        setOrders(result.orders || [])
        toast({
          title: 'Orders loaded',
          description: `Found ${result.count} orders from Shopify`
        })
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      toast({
        title: 'Failed to load orders',
        description: 'Could not fetch orders from Shopify',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  const handleLineItemToggle = (orderId: number, lineItemId: number, checked: boolean) => {
    setSelectedItems(prev => {
      const orderSelections = prev[orderId] || []
      
      if (checked) {
        return {
          ...prev,
          [orderId]: [...orderSelections, lineItemId]
        }
      } else {
        return {
          ...prev,
          [orderId]: orderSelections.filter(id => id !== lineItemId)
        }
      }
    })
  }

  const handleOrderToggle = (orderId: number, checked: boolean) => {
    const order = orders.find(o => o.id === orderId)
    if (!order) return

    if (checked) {
      setSelectedItems(prev => ({
        ...prev,
        [orderId]: order.line_items.map(item => item.id)
      }))
    } else {
      setSelectedItems(prev => {
        const newSelected = { ...prev }
        delete newSelected[orderId]
        return newSelected
      })
    }
  }

  const importSelected = async () => {
    const itemsToImport = Object.entries(selectedItems).filter(([_, items]) => items.length > 0)
    
    if (itemsToImport.length === 0) {
      toast({
        title: 'No items selected',
        description: 'Please select at least one item to import',
        variant: 'destructive'
      })
      return
    }

    setImporting(true)
    
    try {
      let totalItemsImported = 0
      let totalTasksCreated = 0
      
      for (const [orderId, lineItemIds] of itemsToImport) {
        const response = await fetch('/api/shopify/import', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            orderId: Number(orderId),
            lineItemIds
          })
        })
        
        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Import failed')
        }
        
        const result = await response.json()
        totalItemsImported += result.itemsCreated || 0
        totalTasksCreated += result.tasksCreated || 0
      }
      
      toast({
        title: 'Import successful',
        description: `Imported ${totalItemsImported} items and created ${totalTasksCreated} tasks`
      })
      
      // Clear selections after successful import
      setSelectedItems({})
      
    } catch (error) {
      toast({
        title: 'Import failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive'
      })
    } finally {
      setImporting(false)
    }
  }

  // Quick import single order
  const importSingleOrder = async (order: ShopifyOrder) => {
    setImporting(true)
    
    try {
      const response = await fetch('/api/shopify/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          orderId: order.id,
          lineItemIds: order.line_items.map(item => item.id)
        })
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Import failed')
      }
      
      const result = await response.json()
      
      toast({
        title: 'Order imported',
        description: `Imported ${result.itemsCreated || 0} items from Order #${order.order_number}`
      })
      
      // Remove this order from available orders
      setOrders(prev => prev.filter(o => o.id !== order.id))
      
    } catch (error) {
      toast({
        title: 'Import failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive'
      })
    } finally {
      setImporting(false)
    }
  }

  const filteredOrders = orders.filter(order => {
    const matchesSearch = filter === '' || 
      order.order_number.toLowerCase().includes(filter.toLowerCase()) ||
      order.customer?.email?.toLowerCase().includes(filter.toLowerCase()) ||
      order.line_items.some(item => 
        item.title.toLowerCase().includes(filter.toLowerCase())
      )
    
    const matchesCategory = categoryFilter === 'all' ||
      order.line_items.some(item => 
        item.headphone_specs.product_category === categoryFilter
      )
    
    return matchesSearch && matchesCategory
  })

  const getSelectedCount = () => {
    return Object.values(selectedItems).reduce((total, items) => total + items.length, 0)
  }

  const getPriorityBadge = (lineItem: ShopifyLineItem) => {
    if (lineItem.headphone_specs.requires_custom_work) {
      return <Badge variant="destructive">Custom Work</Badge>
    }
    if (lineItem.headphone_specs.product_category === 'headphone') {
      return <Badge variant="default">Production</Badge>
    }
    return <Badge variant="secondary">Accessory</Badge>
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading Shopify orders...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Import Orders</h2>
          <p className="text-muted-foreground">
            Review and selectively import orders from Shopify into production
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button 
            variant="outline"
            onClick={fetchOrders}
            disabled={loading}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button 
            onClick={importSelected}
            disabled={importing || getSelectedCount() === 0}
            className="bg-green-600 hover:bg-green-700"
          >
            {importing ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Import Selected ({getSelectedCount()})
              </>
            )}
          </Button>
        </div>
      </div>
      
      {/* Quick Import Summary */}
      {getSelectedCount() > 0 && (
        <Alert className="border-green-200 bg-green-50">
          <Package className="h-4 w-4" />
          <AlertDescription>
            <strong>{getSelectedCount()} items selected</strong> from {Object.keys(selectedItems).length} orders ready for import.
            <div className="mt-2 flex gap-2">
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => setSelectedItems({})}
              >
                Clear Selection
              </Button>
              <Button 
                size="sm" 
                onClick={() => {
                  filteredOrders.forEach(order => {
                    handleOrderToggle(order.id, true)
                  })
                }}
              >
                Select All Visible
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Import Mode & Filters */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Import Modes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Import Modes
            </CardTitle>
            <CardDescription>
              Choose how you want to import orders
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg border">
              <div>
                <h4 className="font-medium">Single Order Import</h4>
                <p className="text-sm text-muted-foreground">Import entire orders with one click</p>
              </div>
              <Badge variant="outline">Quick Import buttons</Badge>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg border">
              <div>
                <h4 className="font-medium">Selective Import</h4>
                <p className="text-sm text-muted-foreground">Choose specific items from orders</p>
              </div>
              <Badge variant="outline">Checkboxes</Badge>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg border">
              <div>
                <h4 className="font-medium">Bulk Import</h4>
                <p className="text-sm text-muted-foreground">Import all visible orders at once</p>
              </div>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => {
                  filteredOrders.forEach(order => {
                    order.line_items.forEach(item => {
                      handleLineItemToggle(order.id, item.id, true)
                    })
                  })
                }}
                disabled={importing}
              >
                Select All Visible
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filters & Search
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Input
                  placeholder="Search orders, customers, or products..."
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="headphone">Headphones</SelectItem>
                  <SelectItem value="accessory">Accessories</SelectItem>
                  <SelectItem value="cable">Cables</SelectItem>
                  <SelectItem value="electronics">Electronics</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Import Statistics */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-blue-600">{filteredOrders.length}</p>
              <p className="text-sm text-muted-foreground">Orders Available</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">
                {filteredOrders.reduce((sum, order) => sum + order.line_items.length, 0)}
              </p>
              <p className="text-sm text-muted-foreground">Total Items</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-orange-600">{getSelectedCount()}</p>
              <p className="text-sm text-muted-foreground">Items Selected</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-purple-600">
                {filteredOrders.reduce((sum, order) => 
                  sum + order.line_items.filter(item => 
                    item.headphone_specs.requires_custom_work
                  ).length, 0
                )}
              </p>
              <p className="text-sm text-muted-foreground">Custom Work Items</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Orders List */}
      <div className="space-y-4">
        {filteredOrders.map((order) => {
          const orderSelections = selectedItems[order.id] || []
          const allItemsSelected = orderSelections.length === order.line_items.length
          const someItemsSelected = orderSelections.length > 0 && !allItemsSelected

          return (
            <Card key={order.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Checkbox
                      checked={allItemsSelected}
                      onCheckedChange={(checked: boolean) => handleOrderToggle(order.id, checked)}
                    />
                    <div>
                      <CardTitle className="text-lg">
                        Order #{order.order_number}
                      </CardTitle>
                      <CardDescription>
                        {order.customer && `${order.customer.first_name} ${order.customer.last_name}`} • 
                        ${order.total_price} • 
                        {new Date(order.created_at).toLocaleDateString()}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant={order.financial_status === 'paid' ? 'default' : 'secondary'}>
                      {order.financial_status}
                    </Badge>
                    {order.fulfillment_status && (
                      <Badge variant="outline">
                        {order.fulfillment_status}
                      </Badge>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation()
                        importSingleOrder(order)
                      }}
                      disabled={importing}
                      className="ml-2"
                    >
                      <Download className="h-3 w-3 mr-1" />
                      Quick Import
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {order.line_items.map((lineItem, index) => (
                    <div key={lineItem.id}>
                      <div className="flex items-start space-x-3 p-3 rounded-lg bg-muted/30">
                        <Checkbox
                          checked={orderSelections.includes(lineItem.id)}
                          onCheckedChange={(checked: boolean) => 
                            handleLineItemToggle(order.id, lineItem.id, checked)
                          }
                        />
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-medium">{lineItem.title}</h4>
                              {lineItem.variant_title && (
                                <p className="text-sm text-muted-foreground">
                                  {lineItem.variant_title}
                                </p>
                              )}
                              <p className="text-sm text-muted-foreground">
                                SKU: {lineItem.sku || 'N/A'} • Qty: {lineItem.quantity} • ${lineItem.price}
                              </p>
                            </div>
                            <div className="flex items-center space-x-2">
                              {getPriorityBadge(lineItem)}
                              <Badge variant="outline">
                                {lineItem.headphone_specs.product_category}
                              </Badge>
                            </div>
                          </div>
                          
                          {/* Headphone Specs */}
                          {lineItem.headphone_specs.product_category === 'headphone' && (
                            <div className="text-xs text-muted-foreground space-y-1">
                              <div className="flex flex-wrap gap-2">
                                {lineItem.headphone_specs.material && (
                                  <span className="bg-background px-2 py-1 rounded">
                                    Material: {lineItem.headphone_specs.material}
                                  </span>
                                )}
                                {lineItem.headphone_specs.color && (
                                  <span className="bg-background px-2 py-1 rounded">
                                    Color: {lineItem.headphone_specs.color}
                                  </span>
                                )}
                                {lineItem.headphone_specs.pad_type && (
                                  <span className="bg-background px-2 py-1 rounded">
                                    Pads: {lineItem.headphone_specs.pad_type}
                                  </span>
                                )}
                                {lineItem.headphone_specs.cable_type && (
                                  <span className="bg-background px-2 py-1 rounded">
                                    Cable: {lineItem.headphone_specs.cable_type}
                                  </span>
                                )}
                              </div>
                              {lineItem.headphone_specs.custom_engraving && (
                                <div className="text-orange-600 font-medium">
                                  Custom Engraving: &quot;{lineItem.headphone_specs.custom_engraving}&quot;
                                </div>
                              )}
                            </div>
                          )}
                          
                          {/* Required Tasks */}
                          <div className="flex items-center space-x-2">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">
                              Tasks: {lineItem.estimated_tasks.join(', ')}
                            </span>
                          </div>
                        </div>
                      </div>
                      {index < order.line_items.length - 1 && <Separator className="my-2" />}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {filteredOrders.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Package className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No orders found</h3>
            <p className="text-muted-foreground text-center">
              {filter || categoryFilter !== 'all' 
                ? 'Try adjusting your filters or refresh to load more orders.'
                : 'No orders available for import. Try refreshing to check for new orders.'
              }
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
} 