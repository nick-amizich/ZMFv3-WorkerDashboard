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
import { Plus, Edit, Package, FileText, AlertCircle, Check } from 'lucide-react'
import { logBusiness, logError } from '@/lib/logger-client'

interface Part {
  id: string
  part_name: string
  part_type: 'cup' | 'baffle'
  model_name: string
  has_left_right: boolean
  part_od: number | null
  min_stock_height: number | null
  max_stock_height: number | null
  min_stock_length_width: number | null
  max_stock_length_width: number | null
  status: 'active' | 'deprecated' | 'development'
  master_drawing_url: string | null
  qc_drawing_url: string | null
  barcode: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export function PartsCatalogManager() {
  const [parts, setParts] = useState<Part[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingPart, setEditingPart] = useState<Part | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'cup' | 'baffle'>('all')
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'deprecated' | 'development'>('all')
  const { toast } = useToast()
  const supabase = createClient()

  useEffect(() => {
    loadParts()
  }, [])

  async function loadParts() {
    try {
      const { data, error } = await supabase
        .from('parts_catalog')
        .select('*')
        .order('part_name')

      if (error) throw error
      setParts(data || [])
    } catch (error) {
      logError(error as Error, 'PARTS_CATALOG', { action: 'load' })
      toast({
        title: 'Error loading parts',
        description: 'Failed to load parts catalog',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  async function savePart(formData: FormData) {
    try {
      const partData = {
        part_name: formData.get('part_name') as string,
        part_type: formData.get('part_type') as 'cup' | 'baffle',
        model_name: formData.get('model_name') as string,
        has_left_right: formData.get('has_left_right') === 'true',
        part_od: formData.get('part_od') ? parseFloat(formData.get('part_od') as string) : null,
        min_stock_height: formData.get('min_stock_height') ? parseFloat(formData.get('min_stock_height') as string) : null,
        max_stock_height: formData.get('max_stock_height') ? parseFloat(formData.get('max_stock_height') as string) : null,
        min_stock_length_width: formData.get('min_stock_length_width') ? parseFloat(formData.get('min_stock_length_width') as string) : null,
        max_stock_length_width: formData.get('max_stock_length_width') ? parseFloat(formData.get('max_stock_length_width') as string) : null,
        status: formData.get('status') as 'active' | 'deprecated' | 'development',
        master_drawing_url: formData.get('master_drawing_url') as string || null,
        qc_drawing_url: formData.get('qc_drawing_url') as string || null,
        barcode: formData.get('barcode') as string || null,
        notes: formData.get('notes') as string || null,
      }

      if (editingPart) {
        const { error } = await supabase
          .from('parts_catalog')
          .update(partData)
          .eq('id', editingPart.id)

        if (error) throw error

        logBusiness('Part updated', 'PARTS_CATALOG', { 
          partId: editingPart.id, 
          partName: partData.part_name 
        })

        toast({
          title: 'Part updated',
          description: `${partData.part_name} has been updated successfully`,
        })
      } else {
        const { error } = await supabase
          .from('parts_catalog')
          .insert([partData])

        if (error) throw error

        logBusiness('Part created', 'PARTS_CATALOG', { 
          partName: partData.part_name,
          partType: partData.part_type
        })

        toast({
          title: 'Part created',
          description: `${partData.part_name} has been added to the catalog`,
        })
      }

      setIsDialogOpen(false)
      setEditingPart(null)
      loadParts()
    } catch (error) {
      logError(error as Error, 'PARTS_CATALOG', { action: 'save' })
      toast({
        title: 'Error saving part',
        description: error instanceof Error ? error.message : 'Failed to save part',
        variant: 'destructive',
      })
    }
  }

  const filteredParts = parts.filter(part => {
    const matchesSearch = part.part_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         part.model_name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesType = filterType === 'all' || part.part_type === filterType
    const matchesStatus = filterStatus === 'all' || part.status === filterStatus
    return matchesSearch && matchesType && matchesStatus
  })

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filter Parts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label>Search</Label>
              <Input
                placeholder="Search parts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div>
              <Label>Type</Label>
              <Select value={filterType} onValueChange={(value: any) => setFilterType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="cup">Cup</SelectItem>
                  <SelectItem value="baffle">Baffle</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={filterStatus} onValueChange={(value: any) => setFilterStatus(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="deprecated">Deprecated</SelectItem>
                  <SelectItem value="development">Development</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Part
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>
                      {editingPart ? 'Edit Part' : 'Add New Part'}
                    </DialogTitle>
                  </DialogHeader>
                  <PartForm 
                    part={editingPart} 
                    onSubmit={savePart}
                    onCancel={() => {
                      setIsDialogOpen(false)
                      setEditingPart(null)
                    }}
                  />
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Parts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full text-center py-8">Loading parts...</div>
        ) : filteredParts.length === 0 ? (
          <div className="col-span-full text-center py-8 text-muted-foreground">
            No parts found matching your criteria
          </div>
        ) : (
          filteredParts.map((part) => (
            <PartCard 
              key={part.id} 
              part={part}
              onEdit={() => {
                setEditingPart(part)
                setIsDialogOpen(true)
              }}
            />
          ))
        )}
      </div>
    </div>
  )
}

function PartCard({ part, onEdit }: { part: Part; onEdit: () => void }) {
  const statusColors = {
    active: 'default',
    deprecated: 'destructive',
    development: 'secondary',
  } as const

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">{part.part_name}</CardTitle>
            <CardDescription>{part.model_name}</CardDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={onEdit}>
            <Edit className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Badge variant={part.part_type === 'cup' ? 'default' : 'secondary'}>
            <Package className="h-3 w-3 mr-1" />
            {part.part_type}
          </Badge>
          <Badge variant={statusColors[part.status]}>
            {part.status}
          </Badge>
          {part.has_left_right && (
            <Badge variant="outline">L/R</Badge>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 text-sm">
          {part.part_od && (
            <div>
              <span className="text-muted-foreground">OD:</span> {part.part_od}mm
            </div>
          )}
          {part.min_stock_height && (
            <div>
              <span className="text-muted-foreground">Min Height:</span> {part.min_stock_height}mm
            </div>
          )}
          {part.max_stock_height && (
            <div>
              <span className="text-muted-foreground">Max Height:</span> {part.max_stock_height}mm
            </div>
          )}
        </div>

        <div className="flex gap-2">
          {part.master_drawing_url && (
            <a 
              href={part.master_drawing_url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:underline flex items-center gap-1"
            >
              <FileText className="h-3 w-3" />
              Master Drawing
            </a>
          )}
          {part.qc_drawing_url && (
            <a 
              href={part.qc_drawing_url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:underline flex items-center gap-1"
            >
              <FileText className="h-3 w-3" />
              QC Drawing
            </a>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function PartForm({ 
  part, 
  onSubmit, 
  onCancel 
}: { 
  part: Part | null; 
  onSubmit: (data: FormData) => void;
  onCancel: () => void;
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
          <TabsTrigger value="documents">Documents</TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="part_name">Part Name</Label>
              <Input
                id="part_name"
                name="part_name"
                defaultValue={part?.part_name}
                required
              />
            </div>
            <div>
              <Label htmlFor="model_name">Model Name</Label>
              <Input
                id="model_name"
                name="model_name"
                defaultValue={part?.model_name}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="part_type">Part Type</Label>
              <Select name="part_type" defaultValue={part?.part_type || 'cup'}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cup">Cup</SelectItem>
                  <SelectItem value="baffle">Baffle</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="status">Status</Label>
              <Select name="status" defaultValue={part?.status || 'active'}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="deprecated">Deprecated</SelectItem>
                  <SelectItem value="development">Development</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Label htmlFor="has_left_right" className="flex items-center gap-2">
              <input
                type="checkbox"
                id="has_left_right"
                name="has_left_right"
                value="true"
                defaultChecked={part?.has_left_right}
                className="rounded border-gray-300"
              />
              Has Left/Right Variants
            </Label>
          </div>

          <div>
            <Label htmlFor="barcode">Barcode</Label>
            <Input
              id="barcode"
              name="barcode"
              defaultValue={part?.barcode || ''}
            />
          </div>
        </TabsContent>

        <TabsContent value="dimensions" className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="part_od">Part OD (mm)</Label>
              <Input
                id="part_od"
                name="part_od"
                type="number"
                step="0.001"
                defaultValue={part?.part_od || ''}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Stock Height Range (mm)</Label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Input
                  id="min_stock_height"
                  name="min_stock_height"
                  type="number"
                  step="0.001"
                  placeholder="Minimum"
                  defaultValue={part?.min_stock_height || ''}
                />
              </div>
              <div>
                <Input
                  id="max_stock_height"
                  name="max_stock_height"
                  type="number"
                  step="0.001"
                  placeholder="Maximum"
                  defaultValue={part?.max_stock_height || ''}
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Stock Length/Width Range (mm)</Label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Input
                  id="min_stock_length_width"
                  name="min_stock_length_width"
                  type="number"
                  step="0.001"
                  placeholder="Minimum"
                  defaultValue={part?.min_stock_length_width || ''}
                />
              </div>
              <div>
                <Input
                  id="max_stock_length_width"
                  name="max_stock_length_width"
                  type="number"
                  step="0.001"
                  placeholder="Maximum"
                  defaultValue={part?.max_stock_length_width || ''}
                />
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="documents" className="space-y-4">
          <div>
            <Label htmlFor="master_drawing_url">Master Drawing URL</Label>
            <Input
              id="master_drawing_url"
              name="master_drawing_url"
              type="url"
              defaultValue={part?.master_drawing_url || ''}
            />
          </div>

          <div>
            <Label htmlFor="qc_drawing_url">QC Drawing URL</Label>
            <Input
              id="qc_drawing_url"
              name="qc_drawing_url"
              type="url"
              defaultValue={part?.qc_drawing_url || ''}
            />
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <textarea
              id="notes"
              name="notes"
              className="w-full min-h-[100px] px-3 py-2 text-sm rounded-md border border-input bg-background"
              defaultValue={part?.notes || ''}
            />
          </div>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          {part ? 'Update Part' : 'Create Part'}
        </Button>
      </div>
    </form>
  )
}