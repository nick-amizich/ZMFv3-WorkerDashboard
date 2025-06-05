'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { 
  TreePine,
  Package,
  MapPin,
  Ruler,
  AlertTriangle,
  Plus,
  Edit,
  ScanLine,
  Camera,
  Calendar,
  Search,
  Layers,
  Warehouse,
  DollarSign
} from 'lucide-react'
import { logBusiness, logError } from '@/lib/logger-client'

interface WoodInventoryItem {
  id: string
  species: string
  board_feet?: number
  quantity_in_stock: number
  minimum_stock?: number
  supplier?: string
  last_ordered?: string
  last_updated: string
  notes?: any // JSON field containing additional metadata
}

interface WoodInventoryNotes {
  wood_form?: string
  size?: string
  location?: string
  thickness?: string
  quality?: string
  robot_ready?: string
  barcode?: string
  original_id?: string
  created?: string
  last_modified?: string
}

interface InventoryMetrics {
  totalSpecies: number
  totalQuantity: number
  lowStockItems: number
  uniqueLocations: string[]
  robotReadyCount: number
}

export function WoodInventoryDashboard() {
  const [inventory, setInventory] = useState<WoodInventoryItem[]>([])
  const [metrics, setMetrics] = useState<InventoryMetrics>({
    totalSpecies: 0,
    totalQuantity: 0,
    lowStockItems: 0,
    uniqueLocations: [],
    robotReadyCount: 0
  })
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterLocation, setFilterLocation] = useState('all')
  const [filterForm, setFilterForm] = useState('all')
  const [filterQuality, setFilterQuality] = useState('all')
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<WoodInventoryItem | null>(null)
  const { toast } = useToast()
  const supabase = createClient()

  useEffect(() => {
    loadInventory()
  }, [])

  async function loadInventory() {
    try {
      const { data, error } = await supabase
        .from('wood_inventory')
        .select('*')
        .order('species')

      if (error) throw error

      setInventory(data || [])
      calculateMetrics(data || [])
    } catch (error) {
      logError(error as Error, 'WOOD_INVENTORY', { action: 'load' })
      toast({
        title: 'Error loading inventory',
        description: 'Failed to load wood inventory',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  function calculateMetrics(items: WoodInventoryItem[]) {
    const uniqueSpecies = new Set(items.map(i => i.species).filter(Boolean))
    const totalQty = items.reduce((sum, i) => sum + i.quantity_in_stock, 0)
    
    const lowStock = items.filter(i => {
      const minStock = i.minimum_stock || 10
      return i.quantity_in_stock < minStock
    }).length

    // Extract unique locations from notes
    const locations = new Set<string>()
    let robotReady = 0
    
    items.forEach(item => {
      if (item.notes) {
        const notes = typeof item.notes === 'string' ? JSON.parse(item.notes) : item.notes
        if (notes.location) locations.add(notes.location)
        if (notes.robot_ready) robotReady++
      }
    })

    setMetrics({
      totalSpecies: uniqueSpecies.size,
      totalQuantity: totalQty,
      lowStockItems: lowStock,
      uniqueLocations: Array.from(locations),
      robotReadyCount: robotReady
    })
  }

  async function saveItem(formData: FormData) {
    try {
      const notes: WoodInventoryNotes = {
        wood_form: formData.get('wood_form') as string || undefined,
        size: formData.get('size') as string || undefined,
        location: formData.get('location') as string || undefined,
        thickness: formData.get('thickness') as string || undefined,
        quality: formData.get('quality') as string || undefined,
        robot_ready: formData.get('robot_ready') as string || undefined,
        barcode: formData.get('barcode') as string || undefined,
      }

      const itemData = {
        species: formData.get('species') as string,
        quantity_in_stock: parseInt(formData.get('quantity_in_stock') as string) || 0,
        board_feet: formData.get('board_feet') ? parseFloat(formData.get('board_feet') as string) : null,
        minimum_stock: formData.get('minimum_stock') ? parseInt(formData.get('minimum_stock') as string) : 10,
        supplier: formData.get('supplier') as string || null,
        notes: JSON.stringify(notes)
      }

      if (editingItem) {
        const { error } = await supabase
          .from('wood_inventory')
          .update(itemData)
          .eq('id', editingItem.id)

        if (error) throw error

        logBusiness('Wood inventory updated', 'WOOD_INVENTORY', { 
          itemId: editingItem.id, 
          species: itemData.species 
        })

        toast({
          title: 'Inventory updated',
          description: `${itemData.species} has been updated successfully`,
        })
      } else {
        const { error } = await supabase
          .from('wood_inventory')
          .insert([itemData])

        if (error) throw error

        logBusiness('Wood inventory item created', 'WOOD_INVENTORY', { 
          species: itemData.species,
          quantity: itemData.quantity_in_stock
        })

        toast({
          title: 'Item added',
          description: `${itemData.species} has been added to inventory`,
        })
      }

      setIsAddModalOpen(false)
      setEditingItem(null)
      loadInventory()
    } catch (error) {
      logError(error as Error, 'WOOD_INVENTORY', { action: 'save' })
      toast({
        title: 'Error saving item',
        description: error instanceof Error ? error.message : 'Failed to save inventory item',
        variant: 'destructive',
      })
    }
  }

  function parseNotes(notes: any): WoodInventoryNotes {
    if (!notes) return {}
    return typeof notes === 'string' ? JSON.parse(notes) : notes
  }

  const filteredInventory = inventory.filter(item => {
    const notes = parseNotes(item.notes)
    
    const matchesSearch = item.species.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         notes.barcode?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesLocation = filterLocation === 'all' || notes.location === filterLocation
    const matchesForm = filterForm === 'all' || notes.wood_form === filterForm
    const matchesQuality = filterQuality === 'all' || notes.quality === filterQuality
    
    return matchesSearch && matchesLocation && matchesForm && matchesQuality
  })

  const uniqueLocations = Array.from(new Set(
    inventory.map(i => parseNotes(i.notes).location).filter(Boolean)
  ))
  
  const uniqueForms = Array.from(new Set(
    inventory.map(i => parseNotes(i.notes).wood_form).filter(Boolean)
  ))

  const uniqueQualities = Array.from(new Set(
    inventory.map(i => parseNotes(i.notes).quality).filter(Boolean)
  ))

  return (
    <div className="space-y-6">
      {/* Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Species</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalSpecies}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Quantity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalQuantity}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{metrics.lowStockItems}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Locations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.uniqueLocations.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Robot Ready</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{metrics.robotReadyCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filter Inventory</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <Label>Search</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Species, barcode..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            
            <div>
              <Label>Location</Label>
              <Select value={filterLocation} onValueChange={setFilterLocation}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Locations</SelectItem>
                  {uniqueLocations.map(loc => (
                    <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Wood Form</Label>
              <Select value={filterForm} onValueChange={setFilterForm}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Forms</SelectItem>
                  {uniqueForms.map(form => (
                    <SelectItem key={form} value={form}>{form}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Quality</Label>
              <Select value={filterQuality} onValueChange={setFilterQuality}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Qualities</SelectItem>
                  {uniqueQualities.map(quality => (
                    <SelectItem key={quality} value={quality}>{quality}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-end">
              <Button 
                className="w-full"
                onClick={() => {
                  setEditingItem(null)
                  setIsAddModalOpen(true)
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
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
            No inventory items found matching your criteria
          </div>
        ) : (
          filteredInventory.map((item) => (
            <InventoryCard 
              key={item.id} 
              item={item}
              onEdit={() => {
                setEditingItem(item)
                setIsAddModalOpen(true)
              }}
            />
          ))
        )}
      </div>

      {/* Add/Edit Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? 'Edit Inventory Item' : 'Add Inventory Item'}
            </DialogTitle>
          </DialogHeader>
          <InventoryForm 
            item={editingItem}
            onSubmit={saveItem}
            onCancel={() => {
              setIsAddModalOpen(false)
              setEditingItem(null)
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}

function InventoryCard({ item, onEdit }: { item: WoodInventoryItem; onEdit: () => void }) {
  const notes = item.notes ? (typeof item.notes === 'string' ? JSON.parse(item.notes) : item.notes) : {}
  const isLowStock = item.quantity_in_stock < (item.minimum_stock || 10)
  
  return (
    <Card className={`hover:shadow-lg transition-shadow ${isLowStock ? 'border-orange-200' : ''}`}>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <TreePine className="h-4 w-4" />
              {item.species || 'Unknown Species'}
            </CardTitle>
            {notes.wood_form && (
              <CardDescription>{notes.wood_form}</CardDescription>
            )}
          </div>
          <Button variant="ghost" size="icon" onClick={onEdit}>
            <Edit className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {isLowStock && (
            <Badge variant="destructive" className="gap-1">
              <AlertTriangle className="h-3 w-3" />
              Low Stock
            </Badge>
          )}
          {notes.robot_ready && (
            <Badge variant="default" className="gap-1">
              Robot Ready
            </Badge>
          )}
          {notes.thickness && (
            <Badge variant="outline" className="gap-1">
              <Ruler className="h-3 w-3" />
              {notes.thickness}
            </Badge>
          )}
          {notes.quality && (
            <Badge variant="secondary">
              {notes.quality}
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <span className="text-muted-foreground">Quantity:</span> {item.quantity_in_stock}
            {notes.size && <span className="text-xs text-muted-foreground"> ({notes.size})</span>}
          </div>
          {item.board_feet && (
            <div>
              <span className="text-muted-foreground">Board Feet:</span> {item.board_feet}
            </div>
          )}
          {notes.location && (
            <div className="col-span-2 flex items-center gap-1">
              <MapPin className="h-3 w-3 text-muted-foreground" />
              <span className="text-muted-foreground">Location:</span> {notes.location}
            </div>
          )}
        </div>

        {notes.barcode && (
          <div className="flex items-center gap-2 text-xs bg-gray-100 p-2 rounded">
            <ScanLine className="h-3 w-3" />
            <span className="font-mono">{notes.barcode}</span>
          </div>
        )}

        {(notes.created || notes.last_modified) && (
          <div className="text-xs text-muted-foreground flex items-center gap-1 pt-2 border-t">
            <Calendar className="h-3 w-3" />
            {notes.last_modified ? `Modified: ${new Date(notes.last_modified).toLocaleDateString()}` : 
             notes.created ? `Created: ${new Date(notes.created).toLocaleDateString()}` : ''}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function InventoryForm({ 
  item, 
  onSubmit, 
  onCancel 
}: { 
  item: WoodInventoryItem | null;
  onSubmit: (data: FormData) => void;
  onCancel: () => void;
}) {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    onSubmit(formData)
  }

  const notes = item?.notes ? (typeof item.notes === 'string' ? JSON.parse(item.notes) : item.notes) : {}

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
              <Label htmlFor="species">Wood Species *</Label>
              <Input
                id="species"
                name="species"
                defaultValue={item?.species}
                required
              />
            </div>
            <div>
              <Label htmlFor="wood_form">Wood Form</Label>
              <Select name="wood_form" defaultValue={notes.wood_form || 'Board'}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Board">Board</SelectItem>
                  <SelectItem value="Slab">Slab</SelectItem>
                  <SelectItem value="Block">Block</SelectItem>
                  <SelectItem value="Veneer">Veneer</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="quantity_in_stock">Quantity *</Label>
              <Input
                id="quantity_in_stock"
                name="quantity_in_stock"
                type="number"
                defaultValue={item?.quantity_in_stock || 0}
                required
              />
            </div>
            <div>
              <Label htmlFor="board_feet">Board Feet</Label>
              <Input
                id="board_feet"
                name="board_feet"
                type="number"
                step="0.1"
                defaultValue={item?.board_feet || ''}
              />
            </div>
            <div>
              <Label htmlFor="minimum_stock">Min Stock</Label>
              <Input
                id="minimum_stock"
                name="minimum_stock"
                type="number"
                defaultValue={item?.minimum_stock || 10}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="supplier">Supplier</Label>
            <Input
              id="supplier"
              name="supplier"
              defaultValue={item?.supplier || ''}
            />
          </div>
        </TabsContent>

        <TabsContent value="details" className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="size">Size</Label>
              <Select name="size" defaultValue={notes.size || 'Medium'}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Small">Small</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="Large">Large</SelectItem>
                  <SelectItem value="Block">Block</SelectItem>
                  <SelectItem value="Crate/Bin (About 10 Sets)">Crate/Bin (About 10 Sets)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="thickness">Thickness</Label>
              <Select name="thickness" defaultValue={notes.thickness || '4/4'}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="4/4">4/4</SelectItem>
                  <SelectItem value="5/4">5/4</SelectItem>
                  <SelectItem value="6/4">6/4</SelectItem>
                  <SelectItem value="8/4">8/4</SelectItem>
                  <SelectItem value="12/4">12/4</SelectItem>
                  <SelectItem value="16/4">16/4</SelectItem>
                  <SelectItem value="Really Thick">Really Thick</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                name="location"
                defaultValue={notes.location || ''}
                placeholder="e.g., Dock 1, Chris Area"
              />
            </div>
            <div>
              <Label htmlFor="quality">Wood Quality</Label>
              <Select name="quality" defaultValue={notes.quality || 'Normal'}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Normal">Normal</SelectItem>
                  <SelectItem value="Select">Select</SelectItem>
                  <SelectItem value="Premium">Premium</SelectItem>
                  <SelectItem value="10 Heart Wood">10 Heart Wood</SelectItem>
                  <SelectItem value="It's Burl...">It's Burl...</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Label htmlFor="robot_ready" className="flex items-center gap-2">
              <input
                type="checkbox"
                id="robot_ready"
                name="robot_ready"
                value="true"
                defaultChecked={!!notes.robot_ready}
                className="rounded border-gray-300"
              />
              Robot Ready
            </Label>
          </div>
        </TabsContent>

        <TabsContent value="tracking" className="space-y-4">
          <div>
            <Label htmlFor="barcode">Barcode</Label>
            <Input
              id="barcode"
              name="barcode"
              defaultValue={notes.barcode || ''}
            />
          </div>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          {item ? 'Update Item' : 'Add Item'}
        </Button>
      </div>
    </form>
  )
}