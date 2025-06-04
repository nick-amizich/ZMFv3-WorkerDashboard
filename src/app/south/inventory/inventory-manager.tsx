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
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { 
  Plus, 
  TreePine, 
  Package, 
  AlertCircle,
  CheckCircle,
  Barcode,
  Image as ImageIcon,
  Bot,
  DollarSign,
  Calendar,
  Minus,
  TrendingDown,
  TrendingUp
} from 'lucide-react'
import { logBusiness, logError } from '@/lib/logger-client'

interface WoodInventory {
  id: string
  wood_species: string
  wood_form: string
  quantity: number
  size_category: string | null
  thickness: string | null
  dimensions_json: any
  location: string | null
  wood_quality: string | null
  robot_ready: boolean
  barcode: string | null
  image_url: string | null
  supplier: string | null
  purchase_date: string | null
  cost_per_unit: number | null
  min_quantity_alert: number | null
  notes: string | null
  created_at: string | null
  updated_at: string | null
}

interface InventoryStatus {
  id: string | null
  wood_species: string | null
  wood_form: string | null
  quantity: number | null
  size_category: string | null
  location: string | null
  robot_ready: boolean | null
  compatible_parts: number | null
  min_quantity_alert: number | null
  stock_level: string | null
}

export function InventoryManager() {
  const [inventory, setInventory] = useState<WoodInventory[]>([])
  const [inventoryStatus, setInventoryStatus] = useState<InventoryStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isAdjustDialogOpen, setIsAdjustDialogOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<WoodInventory | null>(null)
  const [filterSpecies, setFilterSpecies] = useState<string>('all')
  const [filterStockLevel, setFilterStockLevel] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const { toast } = useToast()
  const supabase = createClient()

  useEffect(() => {
    loadInventory()
  }, [])

  async function loadInventory() {
    try {
      const [inventoryRes, statusRes] = await Promise.all([
        supabase
          .from('wood_inventory')
          .select('*')
          .order('wood_species'),
        supabase
          .from('inventory_status')
          .select('*')
          .order('wood_species')
      ])

      if (inventoryRes.error) throw inventoryRes.error
      if (statusRes.error) throw statusRes.error

      setInventory(inventoryRes.data || [])
      setInventoryStatus(statusRes.data || [])
    } catch (error) {
      logError(error as Error, 'INVENTORY', { action: 'load' })
      toast({
        title: 'Error loading inventory',
        description: 'Failed to load inventory data',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  async function saveInventoryItem(formData: FormData) {
    try {
      const dimensions = {
        length: formData.get('length') ? parseFloat(formData.get('length') as string) : null,
        width: formData.get('width') ? parseFloat(formData.get('width') as string) : null,
        height: formData.get('height') ? parseFloat(formData.get('height') as string) : null,
      }

      const inventoryData = {
        wood_species: formData.get('wood_species') as string,
        wood_form: formData.get('wood_form') as string,
        quantity: parseInt(formData.get('quantity') as string),
        size_category: formData.get('size_category') as string,
        thickness: formData.get('thickness') as string || null,
        dimensions_json: dimensions,
        location: formData.get('location') as string,
        wood_quality: formData.get('wood_quality') as string || null,
        robot_ready: formData.get('robot_ready') === 'true',
        barcode: formData.get('barcode') as string || null,
        image_url: formData.get('image_url') as string || null,
        supplier: formData.get('supplier') as string || null,
        purchase_date: formData.get('purchase_date') as string || null,
        cost_per_unit: formData.get('cost_per_unit') ? parseFloat(formData.get('cost_per_unit') as string) : null,
        min_quantity_alert: parseInt(formData.get('min_quantity_alert') as string) || 10,
        notes: formData.get('notes') as string || null,
      }

      const { error } = await supabase
        .from('wood_inventory')
        .insert([inventoryData])

      if (error) throw error

      logBusiness('Inventory item added', 'INVENTORY', { 
        species: inventoryData.wood_species,
        quantity: inventoryData.quantity,
        location: inventoryData.location
      })

      toast({
        title: 'Inventory added',
        description: `Added ${inventoryData.quantity} ${inventoryData.wood_species} to inventory`,
      })

      setIsDialogOpen(false)
      loadInventory()
    } catch (error) {
      logError(error as Error, 'INVENTORY', { action: 'save' })
      toast({
        title: 'Error saving inventory',
        description: error instanceof Error ? error.message : 'Failed to save inventory item',
        variant: 'destructive',
      })
    }
  }

  async function adjustQuantity(id: string, adjustment: number, reason: string) {
    try {
      const item = inventory.find(i => i.id === id)
      if (!item) return

      const newQuantity = Math.max(0, item.quantity + adjustment)

      const { error } = await supabase
        .from('wood_inventory')
        .update({ quantity: newQuantity })
        .eq('id', id)

      if (error) throw error

      logBusiness('Inventory adjusted', 'INVENTORY', { 
        itemId: id,
        species: item.wood_species,
        adjustment,
        newQuantity,
        reason
      })

      toast({
        title: 'Inventory adjusted',
        description: `${item.wood_species} quantity ${adjustment > 0 ? 'increased' : 'decreased'} by ${Math.abs(adjustment)}`,
      })

      setIsAdjustDialogOpen(false)
      setSelectedItem(null)
      loadInventory()
    } catch (error) {
      logError(error as Error, 'INVENTORY', { action: 'adjust' })
      toast({
        title: 'Error adjusting inventory',
        description: 'Failed to adjust inventory quantity',
        variant: 'destructive',
      })
    }
  }

  // Get unique species for filter
  const uniqueSpecies = Array.from(new Set(inventory.map(item => item.wood_species)))

  // Filter inventory
  const filteredInventory = inventoryStatus.filter(item => {
    const matchesSearch = item.wood_species.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.location.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesSpecies = filterSpecies === 'all' || item.wood_species === filterSpecies
    const matchesStockLevel = filterStockLevel === 'all' || item.stock_level === filterStockLevel
    return matchesSearch && matchesSpecies && matchesStockLevel
  })

  // Calculate summary stats
  const totalItems = inventory.reduce((sum, item) => sum + item.quantity, 0)
  const lowStockCount = inventoryStatus.filter(item => item.stock_level === 'low').length
  const totalValue = inventory.reduce((sum, item) => sum + (item.quantity * (item.cost_per_unit || 0)), 0)

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalItems}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Across {uniqueSpecies.length} species
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Low Stock Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{lowStockCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Need reordering
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Robot Ready
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {inventory.filter(i => i.robot_ready).length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Items ready for automation
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalValue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Inventory value
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Actions */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Inventory Management</CardTitle>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Inventory
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Add Wood Inventory</DialogTitle>
                </DialogHeader>
                <InventoryForm 
                  onSubmit={saveInventoryItem}
                  onCancel={() => setIsDialogOpen(false)}
                />
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Search</Label>
              <Input
                placeholder="Search species or location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div>
              <Label>Wood Species</Label>
              <Select value={filterSpecies} onValueChange={setFilterSpecies}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Species</SelectItem>
                  {uniqueSpecies.map(species => (
                    <SelectItem key={species} value={species}>
                      {species}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Stock Level</Label>
              <Select value={filterStockLevel} onValueChange={setFilterStockLevel}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  <SelectItem value="low">Low Stock</SelectItem>
                  <SelectItem value="medium">Medium Stock</SelectItem>
                  <SelectItem value="good">Good Stock</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Inventory Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full text-center py-8">Loading inventory...</div>
        ) : filteredInventory.length === 0 ? (
          <div className="col-span-full text-center py-8 text-muted-foreground">
            No inventory items found
          </div>
        ) : (
          filteredInventory.map((status) => {
            const item = inventory.find(i => i.id === status.id)
            if (!item) return null

            const stockPercentage = (item.quantity / (item.min_quantity_alert * 3)) * 100
            const stockColor = status.stock_level === 'low' ? 'bg-red-500' :
                             status.stock_level === 'medium' ? 'bg-yellow-500' : 'bg-green-500'

            return (
              <Card key={item.id} className="overflow-hidden">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <TreePine className="h-5 w-5" />
                        {item.wood_species}
                      </CardTitle>
                      <CardDescription>
                        {item.wood_form} • {item.size_category}
                      </CardDescription>
                    </div>
                    <Badge variant={status.stock_level === 'low' ? 'destructive' : 'default'}>
                      {status.stock_level}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Stock Level</span>
                      <span className="font-medium">{item.quantity} units</span>
                    </div>
                    <Progress value={Math.min(100, stockPercentage)} className="h-2" />
                    <div className="text-xs text-muted-foreground mt-1">
                      Min alert: {item.min_quantity_alert} units
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Location:</span>
                      <div className="font-medium">{item.location}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Quality:</span>
                      <div className="font-medium">{item.wood_quality || 'Standard'}</div>
                    </div>
                    {item.thickness && (
                      <div>
                        <span className="text-muted-foreground">Thickness:</span>
                        <div className="font-medium">{item.thickness}</div>
                      </div>
                    )}
                    {item.supplier && (
                      <div>
                        <span className="text-muted-foreground">Supplier:</span>
                        <div className="font-medium">{item.supplier}</div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {item.robot_ready && (
                      <Badge variant="secondary" className="text-xs">
                        <Bot className="h-3 w-3 mr-1" />
                        Robot Ready
                      </Badge>
                    )}
                    {status.compatible_parts > 0 && (
                      <Badge variant="outline" className="text-xs">
                        {status.compatible_parts} compatible parts
                      </Badge>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => {
                        setSelectedItem(item)
                        setIsAdjustDialogOpen(true)
                      }}
                    >
                      Adjust Stock
                    </Button>
                    {item.barcode && (
                      <Button size="sm" variant="ghost">
                        <Barcode className="h-4 w-4" />
                      </Button>
                    )}
                    {item.image_url && (
                      <Button size="sm" variant="ghost">
                        <ImageIcon className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>

      {/* Adjust Quantity Dialog */}
      <Dialog open={isAdjustDialogOpen} onOpenChange={setIsAdjustDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust Inventory Quantity</DialogTitle>
          </DialogHeader>
          {selectedItem && (
            <AdjustQuantityForm
              item={selectedItem}
              onSubmit={(adjustment, reason) => adjustQuantity(selectedItem.id, adjustment, reason)}
              onCancel={() => {
                setIsAdjustDialogOpen(false)
                setSelectedItem(null)
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function InventoryForm({ 
  onSubmit, 
  onCancel 
}: { 
  onSubmit: (data: FormData) => void
  onCancel: () => void
}) {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    onSubmit(formData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Tabs defaultValue="basic" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="basic">Basic Info</TabsTrigger>
          <TabsTrigger value="dimensions">Dimensions</TabsTrigger>
          <TabsTrigger value="additional">Additional</TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="wood_species">Wood Species</Label>
              <Input
                id="wood_species"
                name="wood_species"
                placeholder="e.g., Walnut, Cherry, Maple"
                required
              />
            </div>
            <div>
              <Label htmlFor="wood_form">Wood Form</Label>
              <Select name="wood_form" defaultValue="block">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="block">Block</SelectItem>
                  <SelectItem value="board">Board</SelectItem>
                  <SelectItem value="veneer">Veneer</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
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
              />
            </div>
            <div>
              <Label htmlFor="size_category">Size Category</Label>
              <Select name="size_category" defaultValue="medium">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="small">Small</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="large">Large</SelectItem>
                  <SelectItem value="block">Block</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="location">Storage Location</Label>
              <Input
                id="location"
                name="location"
                placeholder="e.g., Rack A3, Bin 12"
                required
              />
            </div>
            <div>
              <Label htmlFor="wood_quality">Wood Quality</Label>
              <Input
                id="wood_quality"
                name="wood_quality"
                placeholder="e.g., Premium, Standard, Defect"
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="dimensions" className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="length">Length (mm)</Label>
              <Input
                id="length"
                name="length"
                type="number"
                step="0.1"
              />
            </div>
            <div>
              <Label htmlFor="width">Width (mm)</Label>
              <Input
                id="width"
                name="width"
                type="number"
                step="0.1"
              />
            </div>
            <div>
              <Label htmlFor="height">Height (mm)</Label>
              <Input
                id="height"
                name="height"
                type="number"
                step="0.1"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="thickness">Thickness</Label>
            <Input
              id="thickness"
              name="thickness"
              placeholder="e.g., 4/4, 8/4, 12/4"
            />
          </div>
        </TabsContent>

        <TabsContent value="additional" className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="supplier">Supplier</Label>
              <Input
                id="supplier"
                name="supplier"
                placeholder="Supplier name"
              />
            </div>
            <div>
              <Label htmlFor="purchase_date">Purchase Date</Label>
              <Input
                id="purchase_date"
                name="purchase_date"
                type="date"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="cost_per_unit">Cost per Unit ($)</Label>
              <Input
                id="cost_per_unit"
                name="cost_per_unit"
                type="number"
                step="0.01"
              />
            </div>
            <div>
              <Label htmlFor="min_quantity_alert">Min Quantity Alert</Label>
              <Input
                id="min_quantity_alert"
                name="min_quantity_alert"
                type="number"
                defaultValue="10"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="barcode">Barcode</Label>
              <Input
                id="barcode"
                name="barcode"
                placeholder="Scan or enter barcode"
              />
            </div>
            <div>
              <Label htmlFor="image_url">Image URL</Label>
              <Input
                id="image_url"
                name="image_url"
                type="url"
                placeholder="https://..."
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Label htmlFor="robot_ready" className="flex items-center gap-2">
              <input
                type="checkbox"
                id="robot_ready"
                name="robot_ready"
                value="true"
                className="rounded border-gray-300"
              />
              Robot Ready
            </Label>
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <textarea
              id="notes"
              name="notes"
              className="w-full min-h-[80px] px-3 py-2 text-sm rounded-md border border-input bg-background"
              placeholder="Any additional notes..."
            />
          </div>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          Add Inventory
        </Button>
      </div>
    </form>
  )
}

function AdjustQuantityForm({
  item,
  onSubmit,
  onCancel
}: {
  item: WoodInventory
  onSubmit: (adjustment: number, reason: string) => void
  onCancel: () => void
}) {
  const [adjustment, setAdjustment] = useState(0)
  const [reason, setReason] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (adjustment !== 0 && reason) {
      onSubmit(adjustment, reason)
    }
  }

  const newQuantity = Math.max(0, item.quantity + adjustment)

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-gray-50 p-4 rounded-lg">
        <div className="text-sm space-y-1">
          <div><strong>Item:</strong> {item.wood_species} ({item.wood_form})</div>
          <div><strong>Current Quantity:</strong> {item.quantity} units</div>
          <div><strong>Location:</strong> {item.location}</div>
        </div>
      </div>

      <div>
        <Label>Adjustment Amount</Label>
        <div className="flex items-center gap-2 mt-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => setAdjustment(adjustment - 1)}
          >
            <Minus className="h-4 w-4" />
          </Button>
          <Input
            type="number"
            value={adjustment}
            onChange={(e) => setAdjustment(parseInt(e.target.value) || 0)}
            className="w-24 text-center"
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => setAdjustment(adjustment + 1)}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <div className="mt-2 text-sm">
          New quantity will be: <strong>{newQuantity}</strong>
          {adjustment !== 0 && (
            <span className={adjustment > 0 ? 'text-green-600' : 'text-red-600'}>
              {' '}({adjustment > 0 ? '+' : ''}{adjustment})
            </span>
          )}
        </div>
      </div>

      <div>
        <Label htmlFor="reason">Reason for Adjustment</Label>
        <Select value={reason} onValueChange={setReason}>
          <SelectTrigger>
            <SelectValue placeholder="Select a reason" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="received_shipment">Received Shipment</SelectItem>
            <SelectItem value="used_production">Used in Production</SelectItem>
            <SelectItem value="quality_issue">Quality Issue</SelectItem>
            <SelectItem value="inventory_count">Physical Count Adjustment</SelectItem>
            <SelectItem value="damaged">Damaged/Unusable</SelectItem>
            <SelectItem value="returned">Returned to Supplier</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button 
          type="submit" 
          disabled={adjustment === 0 || !reason}
          variant={adjustment < 0 ? 'destructive' : 'default'}
        >
          {adjustment > 0 ? 'Add' : 'Remove'} Stock
        </Button>
      </div>
    </form>
  )
}