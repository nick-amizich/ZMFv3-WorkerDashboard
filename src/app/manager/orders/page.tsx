'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { useToast } from '@/hooks/use-toast'
import { RefreshCw, AlertCircle, Search, Filter, Calendar, Package, User, DollarSign, Download, Clock } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { cn } from '@/lib/utils'
import Link from 'next/link'

// Types for Shopify import
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
  _import_status?: {
    has_imported_items: boolean
    imported_count: number
    total_count: number
  }
}

export default function OrdersPage() {
  const [shopifyOrders, setShopifyOrders] = useState<ShopifyOrder[]>([])
  const [loading, setLoading] = useState(false)
  const [importing, setImporting] = useState(false)
  const [selectedItems, setSelectedItems] = useState<{[orderId: number]: number[]}>({})
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [lastSyncResult, setLastSyncResult] = useState<any>(null)
  const { toast } = useToast()

  const fetchShopifyOrders = useCallback(async (showToast = true) => {
    setLoading(true)
    try {
      const response = await fetch('/api/shopify/sync', {
        method: 'POST'
      })
      
      if (!response.ok) throw new Error('Failed to fetch orders')
      
      const result = await response.json()
      
      if (result.success) {
        setShopifyOrders(result.orders || [])
        setLastSyncResult(result)
        if (showToast) {
          toast({
            title: 'Orders loaded',
            description: `Found ${result.count} orders from Shopify`
          })
        }
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
    fetchShopifyOrders(false)
  }, [fetchShopifyOrders])

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
    const order = shopifyOrders.find(o => o.id === orderId)
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
            lineItemIds: lineItemIds.map(id => Number(id))
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
      
      // Refresh list
      await fetchShopifyOrders(false)
      
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
        title: 'Import successful',
        description: `Imported ${result.itemsCreated} items and created ${result.tasksCreated} tasks`
      })
      
      // Refresh list
      await fetchShopifyOrders(false)
      
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

  const getSelectedCount = () => {
    return Object.values(selectedItems).reduce((sum, items) => sum + items.length, 0)
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

  // Filter Shopify orders
  const filteredShopifyOrders = shopifyOrders.filter((order: ShopifyOrder) => {
    const matchesSearch = searchTerm === '' || 
      order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customer?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.line_items.some((item: ShopifyLineItem) => 
        item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.sku.toLowerCase().includes(searchTerm.toLowerCase())
      )
    
    const matchesCategory = categoryFilter === 'all' || 
      order.line_items.some((item: ShopifyLineItem) => item.headphone_specs.product_category === categoryFilter)
    
    return matchesSearch && matchesCategory
  })

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
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Import Orders</h2>
          <p className="text-muted-foreground">
            Import orders from Shopify into production
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline"
            onClick={() => fetchShopifyOrders(true)}
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

      {/* Sync Results */}
      {lastSyncResult && lastSyncResult.count >= 0 && (
        <Alert className="border-blue-200">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-1">
              <p>Found {lastSyncResult.count} orders with unimported items from Shopify.</p>
              {lastSyncResult.count === 0 && (
                <p className="text-sm text-muted-foreground">
                  All recent orders have been imported. Check Shopify for new orders.
                </p>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}

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
                  filteredShopifyOrders.forEach(order => {
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

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filters & Search
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search orders, customers, or products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
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

      {/* Import Statistics */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-blue-600">{filteredShopifyOrders.length}</p>
              <p className="text-sm text-muted-foreground">Orders Available</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">
                {filteredShopifyOrders.reduce((sum, order) => sum + order.line_items.length, 0)}
              </p>
              <p className="text-sm text-muted-foreground">Total Items</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-orange-600">{getSelectedCount()}</p>
              <p className="text-sm text-muted-foreground">Items Selected</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-purple-600">
                {filteredShopifyOrders.reduce((sum, order) => 
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

      {/* Orders Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredShopifyOrders.map((order) => {
          const isOrderSelected = selectedItems[order.id]?.length === order.line_items.length
          const isPartiallySelected = selectedItems[order.id]?.length > 0 && selectedItems[order.id]?.length < order.line_items.length
          
          return (
            <Card key={order.id} className="transition-all duration-200 hover:shadow-md">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Checkbox
                      checked={isOrderSelected}
                      ref={(el: HTMLButtonElement | null) => {
                        if (el) (el as any).indeterminate = isPartiallySelected
                      }}
                      onCheckedChange={(checked) => handleOrderToggle(order.id, checked as boolean)}
                    />
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        Order #{order.order_number}
                        <Badge variant="outline">
                          {order.financial_status}
                        </Badge>
                        {order._import_status?.has_imported_items && (
                          <Badge variant="secondary" className="text-xs">
                            {order._import_status.imported_count}/{order._import_status.total_count} imported
                          </Badge>
                        )}
                      </CardTitle>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {order.customer ? `${order.customer.first_name} ${order.customer.last_name}` : 'Guest Customer'}
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(order.created_at).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1">
                            <DollarSign className="h-3 w-3" />
                            ${order.total_price}
                          </div>
                          <div className="flex items-center gap-1">
                            <Package className="h-3 w-3" />
                            {order.line_items.length} items
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => importSingleOrder(order)}
                    disabled={importing}
                  >
                    <Download className="h-3 w-3 mr-1" />
                    Quick Import
                  </Button>
                </div>
              </CardHeader>
              
              <CardContent className="pt-0">
                <div className="space-y-3">
                  {order.line_items.map((item) => {
                    const isItemSelected = selectedItems[order.id]?.includes(item.id) || false
                    
                    return (
                      <div key={item.id} className="border rounded-lg p-3 space-y-2">
                        <div className="flex items-start space-x-3">
                          <Checkbox
                            checked={isItemSelected}
                            onCheckedChange={(checked) => handleLineItemToggle(order.id, item.id, checked as boolean)}
                          />
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className="font-medium text-sm">{item.title}</h4>
                                {item.variant_title && (
                                  <p className="text-xs text-muted-foreground">{item.variant_title}</p>
                                )}
                              </div>
                              <div className="text-right">
                                <div className="font-medium text-sm">${item.price}</div>
                                <div className="text-xs text-muted-foreground">Qty: {item.quantity}</div>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2 flex-wrap">
                              {getPriorityBadge(item)}
                              {item.headphone_specs.material && (
                                <Badge variant="outline" className="text-xs">
                                  {item.headphone_specs.material}
                                </Badge>
                              )}
                              {item.headphone_specs.color && (
                                <Badge variant="outline" className="text-xs">
                                  {item.headphone_specs.color}
                                </Badge>
                              )}
                              {item.sku && (
                                <Badge variant="outline" className="text-xs">
                                  SKU: {item.sku}
                                </Badge>
                              )}
                            </div>
                            
                            {item.estimated_tasks && item.estimated_tasks.length > 0 && (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Clock className="h-3 w-3" />
                                Tasks: {item.estimated_tasks.join(', ')}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Empty State */}
      {filteredShopifyOrders.length === 0 && !loading && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Package className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              {lastSyncResult && lastSyncResult.count === 0 
                ? 'All orders have been imported!' 
                : 'No orders available for import'}
            </h3>
            <p className="text-muted-foreground text-center mb-4">
              {searchTerm || categoryFilter !== 'all' 
                ? 'Try adjusting your filters to see more orders.'
                : lastSyncResult && lastSyncResult.count === 0
                  ? 'All recent Shopify orders have been successfully imported into the production system.'
                  : 'No new orders found from Shopify. Try syncing to refresh the list.'
              }
            </p>
            <div className="flex gap-2">
              <Button onClick={() => fetchShopifyOrders(true)} disabled={loading}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Check for New Orders
              </Button>
              <Button variant="outline" asChild>
                <Link href="/manager/tasks">
                  View Production Tasks
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}