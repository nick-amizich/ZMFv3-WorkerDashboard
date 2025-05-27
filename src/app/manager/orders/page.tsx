'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { RefreshCw, AlertCircle, Search, Filter, Calendar, Package, User, DollarSign, Download, Clock, ChevronDown, Loader2, Zap } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { ProductionAssignment } from './production-assignment'

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
    wood_type?: string
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
  main_items?: ShopifyLineItem[]
  extra_items?: ShopifyLineItem[]
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
  
  // Enhanced filtering similar to task assignment
  const [filters, setFilters] = useState({
    productModel: 'all',
    woodType: 'all',
    padType: 'all',
    customWork: 'all'
  })
  
  // Track selected items for batching
  const [selectedForBatch, setSelectedForBatch] = useState<{[orderId: number]: number[]}>({})
  const [creatingBatch, setCreatingBatch] = useState(false)
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

  const handleOrderToggle = (orderId: number, checked: boolean) => {
    const order = shopifyOrders.find(o => o.id === orderId)
    if (!order) return

    if (checked) {
      // Collect all line item IDs from both main and extra items
      const allLineItemIds = [
        ...(order.main_items || []).map(item => item.id),
        ...(order.extra_items || []).map(item => item.id)
      ]
      
      setSelectedItems(prev => ({
        ...prev,
        [orderId]: allLineItemIds
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
      // Collect all line item IDs from both main and extra items
      const allLineItemIds = [
        ...(order.main_items || []).map(item => item.id),
        ...(order.extra_items || []).map(item => item.id)
      ]
      
      const response = await fetch('/api/shopify/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          orderId: order.id,
          lineItemIds: allLineItemIds
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

  // Extract filter options from available orders
  const filterOptions = useMemo(() => {
    const allItems = shopifyOrders.flatMap(order => [...(order.main_items || []), ...(order.extra_items || [])])
    
    const productModels = [...new Set(allItems.map(item => {
      // Extract model name from product name (e.g., "ZMF Auteur" -> "Auteur")
      const match = item.title.match(/ZMF\s+(\w+)/i)
      return match ? match[1] : item.title.split(' ')[0]
    }))].sort()
    
    const woodTypes = [...new Set(allItems
      .map(item => item.headphone_specs?.wood_type)
      .filter((wood): wood is string => Boolean(wood))
    )].sort()
    
    const padTypes = [...new Set(allItems
      .map(item => item.headphone_specs?.pad_type)
      .filter((pad): pad is string => Boolean(pad))
    )].sort()
    
    return { productModels, woodTypes, padTypes }
  }, [shopifyOrders])

  // Apply filters to orders
  const filteredShopifyOrders = useMemo(() => {
    return shopifyOrders.filter(order => {
      // First apply search and category filters
      const searchMatch = !searchTerm || 
        order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.customer?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.customer?.last_name?.toLowerCase().includes(searchTerm.toLowerCase())

      if (!searchMatch) return false

      // Apply enhanced filters to order items
      const allItems = [...(order.main_items || []), ...(order.extra_items || [])]
      const hasMatchingItems = allItems.some(item => {
        const specs = item.headphone_specs
        
        // Product model filter
        if (filters.productModel !== 'all') {
          const itemModel = item.title.match(/ZMF\s+(\w+)/i)?.[1] || item.title.split(' ')[0]
          if (itemModel.toLowerCase() !== filters.productModel.toLowerCase()) return false
        }
        
        // Wood type filter
        if (filters.woodType !== 'all' && specs?.wood_type !== filters.woodType) return false
        
        // Pad type filter  
        if (filters.padType !== 'all' && specs?.pad_type !== filters.padType) return false
        
        // Custom work filter
        if (filters.customWork === 'custom_only' && !specs?.requires_custom_work) return false
        if (filters.customWork === 'standard_only' && specs?.requires_custom_work) return false
        
        return true
      })

      return hasMatchingItems
    })
  }, [shopifyOrders, searchTerm, filters])

  // Create batch from selected items
  const createBatchFromSelected = async () => {
    const selectedItems = Object.entries(selectedForBatch).filter(([_, items]) => items.length > 0)
    
    if (selectedItems.length === 0) {
      toast({
        title: 'No items selected',
        description: 'Please select at least one item to create a batch',
        variant: 'destructive'
      })
      return
    }

    setCreatingBatch(true)
    
    try {
      // First import the selected items
      let allOrderItems = []
      
      for (const [orderId, lineItemIds] of selectedItems) {
        const response = await fetch('/api/shopify/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
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
        allOrderItems.push(...(result.orderItems || []))
      }
      
      // Create batch with imported items
      const batchResponse = await fetch('/api/batches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `Customer Orders - ${new Date().toLocaleDateString()}`,
          type: 'customer',
          description: `Batch created from ${selectedItems.length} order(s)`,
          order_item_ids: allOrderItems.map(item => item.id)
        })
      })
      
      if (!batchResponse.ok) {
        const error = await batchResponse.json()
        throw new Error(error.error || 'Failed to create batch')
      }
      
      const batch = await batchResponse.json()
      
      toast({
        title: 'Batch created successfully',
        description: `Created batch "${batch.name}" with ${allOrderItems.length} items`
      })
      
      // Clear selections
      setSelectedForBatch({})
      
      // Refresh orders
      await fetchShopifyOrders(false)
      
    } catch (error) {
      toast({
        title: 'Failed to create batch',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive'
      })
    } finally {
      setCreatingBatch(false)
    }
  }

  // Handle item selection for batching
  const handleBatchSelection = (orderId: number, lineItemId: number, checked: boolean) => {
    setSelectedForBatch(prev => {
      const current = prev[orderId] || []
      if (checked) {
        return { ...prev, [orderId]: [...current, lineItemId] }
      } else {
        const updated = current.filter(id => id !== lineItemId)
        if (updated.length === 0) {
          const { [orderId]: removed, ...rest } = prev
          return rest
        }
        return { ...prev, [orderId]: updated }
      }
    })
  }

  const getSelectedBatchCount = () => {
    return Object.values(selectedForBatch).reduce((sum, items) => sum + items.length, 0)
  }

  const renderLineItem = (item: ShopifyLineItem, orderId: number, isMainItem: boolean = false) => {
    const isItemSelected = selectedItems[orderId]?.includes(item.id) || false
    const price = parseFloat(item.price || '0')
    
    return (
      <div key={item.id} className={`border rounded-lg p-4 space-y-3 transition-all ${
        isMainItem 
          ? 'border-green-200 bg-green-50/30 shadow-sm' 
          : 'border-gray-200 bg-gray-50/30'
      }`}>
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <Checkbox
              checked={isItemSelected}
              onCheckedChange={(checked) => {
                setSelectedItems(prev => {
                  const newSelected = { ...prev }
                  if (!newSelected[orderId]) newSelected[orderId] = []
                  
                  if (checked) {
                    newSelected[orderId] = [...newSelected[orderId], item.id]
                  } else {
                    newSelected[orderId] = newSelected[orderId].filter(id => id !== item.id)
                  }
                  
                  return newSelected
                })
              }}
            />
            
            <div className="flex-1 min-w-0">
              {/* Product Name & Key Details */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-semibold text-gray-900 text-base">{item.title}</h4>
                  {getPriorityBadge(item)}
                </div>
                
                {/* Variant Title (if different from main title) */}
                {item.variant_title && item.variant_title !== item.title && (
                  <p className="text-sm text-gray-600 font-medium">{item.variant_title}</p>
                )}
                
                {/* Key Specs - Wood Type & Material (Elevated) */}
                {(item.headphone_specs.wood_type || item.headphone_specs.material) && (
                  <div className="flex items-center gap-3">
                    {item.headphone_specs.wood_type && (
                      <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-amber-100 border border-amber-300"></div>
                        <span className="text-sm font-semibold text-amber-800">
                          {item.headphone_specs.wood_type} Wood
                        </span>
                      </div>
                    )}
                    {item.headphone_specs.material && (
                      <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-blue-100 border border-blue-300"></div>
                        <span className="text-sm font-medium text-blue-700">
                          {item.headphone_specs.material}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              {/* Additional Specs Grid */}
              <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                {item.headphone_specs.color && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-gray-500">Color:</span>
                    <span className="font-medium text-gray-700">{item.headphone_specs.color}</span>
                  </div>
                )}
                {item.headphone_specs.pad_type && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-gray-500">Pads:</span>
                    <span className="font-medium text-gray-700">{item.headphone_specs.pad_type}</span>
                  </div>
                )}
                {item.headphone_specs.cable_type && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-gray-500">Cable:</span>
                    <span className="font-medium text-gray-700">{item.headphone_specs.cable_type}</span>
                  </div>
                )}
                {item.sku && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-gray-500">SKU:</span>
                    <span className="font-mono text-gray-600">{item.sku}</span>
                  </div>
                )}
              </div>
              
              {/* Custom Engraving (Special Highlight) */}
              {item.headphone_specs.custom_engraving && (
                <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-medium text-yellow-800">Custom Engraving:</span>
                    <span className="text-xs text-yellow-700">&quot;{item.headphone_specs.custom_engraving}&quot;</span>
                  </div>
                </div>
              )}
              
              {/* Tasks Preview */}
              {item.estimated_tasks && item.estimated_tasks.length > 0 && (
                <div className="mt-3 flex items-center gap-2">
                  <Clock className="h-3 w-3 text-gray-400" />
                  <span className="text-xs text-gray-500">
                    Tasks: {item.estimated_tasks.join(', ')}
                  </span>
                </div>
              )}
            </div>
          </div>
          
          {/* Price & Quantity */}
          <div className="text-right shrink-0 ml-4">
            {item.quantity > 1 && (
              <div className="text-sm font-medium text-gray-700">
                Qty: {item.quantity}
              </div>
            )}
          </div>
        </div>
      </div>
    )
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
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Orders & Production</h2>
          <p className="text-muted-foreground">
            Import orders from Shopify and assign them to production
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/manager/production-flow">
              <Zap className="mr-2 h-4 w-4" />
              Production Flow
            </Link>
          </Button>
        </div>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="production" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="production" className="flex items-center space-x-2">
            <Zap className="h-4 w-4" />
            <span>Production Assignment</span>
          </TabsTrigger>
          <TabsTrigger value="import" className="flex items-center space-x-2">
            <Download className="h-4 w-4" />
            <span>Import from Shopify</span>
          </TabsTrigger>
        </TabsList>

        {/* Production Assignment Tab */}
        <TabsContent value="production">
          <ProductionAssignment />
        </TabsContent>

        {/* Import Orders Tab */}
        <TabsContent value="import" className="space-y-6">
          {/* Import Header */}
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-xl font-semibold">Import Orders</h3>
              <p className="text-muted-foreground">
                Import headphone builds from Shopify into production
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
                    Import ({getSelectedCount()})
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

      {/* Enhanced Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filters & Search
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Filter orders to find specific models, wood types, or custom work
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search and Basic Category */}
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
                <SelectItem value="headphone">Builds</SelectItem>
                <SelectItem value="accessory">Accessories</SelectItem>
                <SelectItem value="cable">Cables</SelectItem>
                <SelectItem value="electronics">Electronics</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Enhanced Product Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="product-model">Product Model</Label>
              <Select 
                value={filters.productModel} 
                onValueChange={(value) => setFilters(prev => ({ ...prev, productModel: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All models" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All models</SelectItem>
                  {filterOptions.productModels.map(model => (
                    <SelectItem key={model} value={model}>
                      {model}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="wood-type">Wood Type</Label>
              <Select 
                value={filters.woodType} 
                onValueChange={(value) => setFilters(prev => ({ ...prev, woodType: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All woods" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All woods</SelectItem>
                  {filterOptions.woodTypes.map(wood => (
                    <SelectItem key={wood} value={wood}>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-amber-100 border border-amber-300"></div>
                        {wood}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="pad-type">Pad Type</Label>
              <Select 
                value={filters.padType} 
                onValueChange={(value) => setFilters(prev => ({ ...prev, padType: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All pads" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All pads</SelectItem>
                  {filterOptions.padTypes.map(pad => (
                    <SelectItem key={pad} value={pad}>
                      {pad}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="custom-work">Custom Work</Label>
              <Select 
                value={filters.customWork} 
                onValueChange={(value) => setFilters(prev => ({ ...prev, customWork: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All orders" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All orders</SelectItem>
                  <SelectItem value="custom_only">Custom work only</SelectItem>
                  <SelectItem value="standard_only">Standard only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Filter Summary & Actions */}
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="px-3 py-1">
                {filteredShopifyOrders.length} order{filteredShopifyOrders.length !== 1 ? 's' : ''} shown
              </Badge>
              {(filters.productModel !== 'all' || filters.woodType !== 'all' || filters.padType !== 'all' || filters.customWork !== 'all') && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setFilters({ productModel: 'all', woodType: 'all', padType: 'all', customWork: 'all' })}
                  className="text-muted-foreground hover:text-foreground"
                >
                  Clear filters
                </Button>
              )}
            </div>
            
            {/* Batch Creation Button */}
            {getSelectedBatchCount() > 0 && (
              <Button 
                onClick={createBatchFromSelected}
                disabled={creatingBatch}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {creatingBatch ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Batch...
                  </>
                ) : (
                  <>
                    <Package className="mr-2 h-4 w-4" />
                    Create Batch ({getSelectedBatchCount()})
                  </>
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Import Statistics */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-blue-600">{filteredShopifyOrders.length}</p>
              <p className="text-sm text-muted-foreground">Orders</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">
                {filteredShopifyOrders.reduce((sum, order) => 
                  sum + (order.main_items?.length || 0), 0
                )}
              </p>
              <p className="text-sm text-muted-foreground">Builds</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-orange-600">{getSelectedCount()}</p>
              <p className="text-sm text-muted-foreground">Selected</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-purple-600">
                {filteredShopifyOrders.reduce((sum, order) => 
                  sum + (order.main_items?.filter(item => 
                    item.headphone_specs.requires_custom_work
                  ).length || 0), 0
                )}
              </p>
              <p className="text-sm text-muted-foreground">Custom Work</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Orders Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredShopifyOrders.map((order) => {
          const totalItems = (order.main_items?.length || 0) + (order.extra_items?.length || 0)
          const selectedCount = selectedItems[order.id]?.length || 0
          const isOrderSelected = selectedCount === totalItems && totalItems > 0
          const isPartiallySelected = selectedCount > 0 && selectedCount < totalItems
          
          return (
            <Card key={order.id} className="transition-all duration-200 hover:shadow-md">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Checkbox 
                      checked={isOrderSelected}
                      ref={(el) => {
                        if (el && isPartiallySelected) {
                          const input = el.querySelector('input')
                          if (input) input.indeterminate = true
                        }
                      }}
                      onCheckedChange={(checked) => handleOrderToggle(order.id, checked as boolean)}
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          #{order.order_number}
                        </h3>
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {order.customer?.first_name} {order.customer?.last_name}
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(order.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => importSingleOrder(order)}
                    disabled={importing}
                    className="shrink-0 text-xs"
                  >
                    Import Build
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Order Summary */}
                <div className="grid grid-cols-3 gap-4 p-3 bg-gray-50 rounded-lg">
                  <div className="text-center">
                    <div className="text-lg font-semibold text-blue-600">
                      {order.main_items?.length || 0}
                    </div>
                    <div className="text-xs text-gray-600">Builds</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold text-orange-600">
                      {order.extra_items?.length || 0}
                    </div>
                    <div className="text-xs text-gray-600">Extras</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold text-green-600">
                      {selectedCount}
                    </div>
                    <div className="text-xs text-gray-600">Selected</div>
                  </div>
                </div>

                {/* Main Items (Headphones) */}
                {order.main_items && order.main_items.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-500"></div>
                      <h4 className="font-semibold text-green-700">
                        Builds ({order.main_items.length})
                      </h4>
                    </div>
                    <div className="space-y-3">
                      {order.main_items.map((item) => renderLineItem(item, order.id, true))}
                    </div>
                  </div>
                )}

                {/* Extras (Collapsible) */}
                {order.extra_items && order.extra_items.length > 0 && (
                  <Collapsible>
                    <CollapsibleTrigger className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded w-full text-left">
                      <ChevronDown className="h-4 w-4 transition-transform duration-200" />
                      <div className="w-2 h-2 rounded-full bg-orange-400"></div>
                      <span className="font-medium text-orange-700">
                        Extras ({order.extra_items.length})
                      </span>
                      <span className="text-xs text-gray-500 ml-auto">
                        Click to expand
                      </span>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-3">
                      <div className="space-y-2 pl-6 border-l-2 border-orange-200">
                        {order.extra_items.map((item) => renderLineItem(item, order.id, false))}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                )}
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
          </TabsContent>
        </Tabs>
    </div>
  )
}