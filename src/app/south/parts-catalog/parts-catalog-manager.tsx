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
import { Plus, Edit, Package, FileText, AlertCircle, Check, Cpu, Wrench, Calendar, BarChart3 } from 'lucide-react'
import { logBusiness, logError } from '@/lib/logger-client'

interface Part {
  id: string
  part_name: string
  part_type: 'cup' | 'baffle' | 'driver_mount' | 'connector' | 'other'
  species?: string
  specifications?: any
  material_cost?: number
  estimated_labor_hours?: number
  is_active: boolean
  created_at: string
  updated_at: string
}

interface PartSpecifications {
  part_od?: string
  part_id?: string
  cnc_part_1?: string
  cnc_part_2?: string
  work_offset_part_1?: string
  work_offset_part_2?: string
  jaws_part_1?: string
  jaws_part_2?: string
  hsm_work_offset_number_part_1?: string
  hsm_work_offset_number_part_2?: string
  has_left_and_right?: string
  min_stock_height?: string
  max_stock_height?: string
  x_axis_offset_part_1?: string
  y_axis_offset_part_1?: string
  z_axis_offset_part_1?: string
  x_axis_offset_part_2?: string
  y_axis_offset_part_2?: string
  z_axis_offset_part_2?: string
  machining_qc?: string
  part_status?: string
  date_last_validated?: string
  part_barcode?: string
  master_drawing?: string
  qc_drawing?: string
  d1?: string
  d1_tolerance_mm?: string
}

export function PartsCatalogManager() {
  const [parts, setParts] = useState<Part[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingPart, setEditingPart] = useState<Part | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')
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
      const specifications: PartSpecifications = {
        part_od: formData.get('part_od') as string || undefined,
        part_id: formData.get('part_id') as string || undefined,
        cnc_part_1: formData.get('cnc_part_1') as string || undefined,
        cnc_part_2: formData.get('cnc_part_2') as string || undefined,
        work_offset_part_1: formData.get('work_offset_part_1') as string || undefined,
        work_offset_part_2: formData.get('work_offset_part_2') as string || undefined,
        jaws_part_1: formData.get('jaws_part_1') as string || undefined,
        jaws_part_2: formData.get('jaws_part_2') as string || undefined,
        hsm_work_offset_number_part_1: formData.get('hsm_work_offset_number_part_1') as string || undefined,
        hsm_work_offset_number_part_2: formData.get('hsm_work_offset_number_part_2') as string || undefined,
        has_left_and_right: formData.get('has_left_and_right') as string || undefined,
        min_stock_height: formData.get('min_stock_height') as string || undefined,
        max_stock_height: formData.get('max_stock_height') as string || undefined,
        x_axis_offset_part_1: formData.get('x_axis_offset_part_1') as string || undefined,
        y_axis_offset_part_1: formData.get('y_axis_offset_part_1') as string || undefined,
        z_axis_offset_part_1: formData.get('z_axis_offset_part_1') as string || undefined,
        x_axis_offset_part_2: formData.get('x_axis_offset_part_2') as string || undefined,
        y_axis_offset_part_2: formData.get('y_axis_offset_part_2') as string || undefined,
        z_axis_offset_part_2: formData.get('z_axis_offset_part_2') as string || undefined,
        machining_qc: formData.get('machining_qc') as string || undefined,
        part_status: formData.get('part_status') as string || undefined,
        date_last_validated: formData.get('date_last_validated') as string || undefined,
        part_barcode: formData.get('part_barcode') as string || undefined,
        master_drawing: formData.get('master_drawing') as string || undefined,
        qc_drawing: formData.get('qc_drawing') as string || undefined,
      }

      const partData = {
        part_name: formData.get('part_name') as string,
        part_type: formData.get('part_type') as string,
        species: formData.get('species') as string || null,
        specifications,
        material_cost: formData.get('material_cost') ? parseFloat(formData.get('material_cost') as string) : null,
        estimated_labor_hours: formData.get('estimated_labor_hours') ? parseFloat(formData.get('estimated_labor_hours') as string) : null,
        is_active: formData.get('is_active') === 'true',
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
                         part.species?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         part.specifications?.part_barcode?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesType = filterType === 'all' || part.part_type === filterType
    const matchesStatus = filterStatus === 'all' || 
                         (filterStatus === 'active' && part.is_active) ||
                         (filterStatus === 'inactive' && !part.is_active) ||
                         (filterStatus === 'make_it' && part.specifications?.part_status === 'Make it!') ||
                         (filterStatus === 'one_moment' && part.specifications?.part_status === 'One Moment...')
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
                placeholder="Search parts, species, barcode..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div>
              <Label>Type</Label>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="cup">Cup</SelectItem>
                  <SelectItem value="baffle">Baffle</SelectItem>
                  <SelectItem value="driver_mount">Driver Mount</SelectItem>
                  <SelectItem value="connector">Connector</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="make_it">Make It!</SelectItem>
                  <SelectItem value="one_moment">One Moment...</SelectItem>
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
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
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
  const specs = part.specifications || {}
  
  const getStatusColor = () => {
    if (!part.is_active) return 'secondary'
    if (specs.part_status === 'Make it!') return 'default'
    if (specs.part_status === 'One Moment...') return 'secondary'
    return 'outline'
  }

  const getTypeIcon = () => {
    switch (part.part_type) {
      case 'cup': return Package
      case 'baffle': return BarChart3
      default: return Wrench
    }
  }

  const TypeIcon = getTypeIcon()

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <CardTitle className="text-lg flex items-center gap-2">
              <TypeIcon className="h-4 w-4" />
              {part.part_name}
            </CardTitle>
            {part.species && (
              <CardDescription>{part.species}</CardDescription>
            )}
          </div>
          <Button variant="ghost" size="icon" onClick={onEdit}>
            <Edit className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Badge variant={getStatusColor()}>
            {specs.part_status || (part.is_active ? 'Active' : 'Inactive')}
          </Badge>
          <Badge variant="outline">
            {part.part_type}
          </Badge>
          {specs.has_left_and_right === 'Yes, Both' && (
            <Badge variant="outline">L/R</Badge>
          )}
          {specs.date_last_validated && (
            <Badge variant="secondary" className="text-xs">
              <Calendar className="h-3 w-3 mr-1" />
              {new Date(specs.date_last_validated).toLocaleDateString()}
            </Badge>
          )}
        </div>

        {/* Dimensions */}
        <div className="grid grid-cols-2 gap-2 text-sm">
          {specs.part_od && (
            <div>
              <span className="text-muted-foreground">OD:</span> {specs.part_od}
            </div>
          )}
          {specs.part_id && (
            <div>
              <span className="text-muted-foreground">ID:</span> {specs.part_id}
            </div>
          )}
          {specs.min_stock_height && (
            <div>
              <span className="text-muted-foreground">Min Height:</span> {specs.min_stock_height}
            </div>
          )}
          {specs.max_stock_height && (
            <div>
              <span className="text-muted-foreground">Max Height:</span> {specs.max_stock_height}
            </div>
          )}
        </div>

        {/* CNC Info */}
        {(specs.cnc_part_1 || specs.cnc_part_2) && (
          <div className="space-y-1 text-sm border-t pt-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Cpu className="h-3 w-3" />
              CNC Programs
            </div>
            {specs.cnc_part_1 && (
              <div className="pl-5">
                Part 1: {specs.cnc_part_1} ({specs.work_offset_part_1})
              </div>
            )}
            {specs.cnc_part_2 && (
              <div className="pl-5">
                Part 2: {specs.cnc_part_2} ({specs.work_offset_part_2})
              </div>
            )}
          </div>
        )}

        {/* Barcode */}
        {specs.part_barcode && (
          <div className="text-xs font-mono bg-gray-100 p-1 rounded">
            {specs.part_barcode}
          </div>
        )}

        {/* Drawings */}
        <div className="flex gap-2 pt-2 border-t">
          {specs.master_drawing && (
            <Button 
              size="sm" 
              variant="outline"
              className="text-xs"
              onClick={() => window.open(specs.master_drawing, '_blank')}
            >
              <FileText className="h-3 w-3 mr-1" />
              Master
            </Button>
          )}
          {specs.qc_drawing && (
            <Button 
              size="sm" 
              variant="outline"
              className="text-xs"
              onClick={() => window.open(specs.qc_drawing, '_blank')}
            >
              <FileText className="h-3 w-3 mr-1" />
              QC
            </Button>
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

  const specs = part?.specifications || {}

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Tabs defaultValue="basic" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="basic">Basic Info</TabsTrigger>
          <TabsTrigger value="dimensions">Dimensions</TabsTrigger>
          <TabsTrigger value="cnc">CNC Settings</TabsTrigger>
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
              <Label htmlFor="part_type">Part Type</Label>
              <Select name="part_type" defaultValue={part?.part_type || 'cup'}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cup">Cup</SelectItem>
                  <SelectItem value="baffle">Baffle</SelectItem>
                  <SelectItem value="driver_mount">Driver Mount</SelectItem>
                  <SelectItem value="connector">Connector</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="species">Wood Species/Material</Label>
              <Input
                id="species"
                name="species"
                defaultValue={part?.species || ''}
              />
            </div>
            <div>
              <Label htmlFor="part_status">Part Status</Label>
              <Select name="part_status" defaultValue={specs.part_status || 'Make it!'}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Make it!">Make it!</SelectItem>
                  <SelectItem value="One Moment...">One Moment...</SelectItem>
                  <SelectItem value="No Idea">No Idea</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="has_left_and_right">Has Left and Right?</Label>
              <Select name="has_left_and_right" defaultValue={specs.has_left_and_right || 'No'}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Yes, Both">Yes, Both</SelectItem>
                  <SelectItem value="No">No</SelectItem>
                  <SelectItem value="No Idea">No Idea</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="material_cost">Material Cost ($)</Label>
              <Input
                id="material_cost"
                name="material_cost"
                type="number"
                step="0.01"
                defaultValue={part?.material_cost || ''}
              />
            </div>
            <div>
              <Label htmlFor="estimated_labor_hours">Est. Labor Hours</Label>
              <Input
                id="estimated_labor_hours"
                name="estimated_labor_hours"
                type="number"
                step="0.1"
                defaultValue={part?.estimated_labor_hours || ''}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="part_barcode">Barcode</Label>
              <Input
                id="part_barcode"
                name="part_barcode"
                defaultValue={specs.part_barcode || ''}
              />
            </div>
            <div>
              <Label htmlFor="date_last_validated">Date Last Validated</Label>
              <Input
                id="date_last_validated"
                name="date_last_validated"
                type="date"
                defaultValue={specs.date_last_validated || ''}
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Label htmlFor="is_active" className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_active"
                name="is_active"
                value="true"
                defaultChecked={part?.is_active ?? true}
                className="rounded border-gray-300"
              />
              Part is Active
            </Label>
          </div>
        </TabsContent>

        <TabsContent value="dimensions" className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="part_od">Part OD</Label>
              <Input
                id="part_od"
                name="part_od"
                defaultValue={specs.part_od || ''}
              />
            </div>
            <div>
              <Label htmlFor="part_id">Part ID</Label>
              <Input
                id="part_id"
                name="part_id"
                defaultValue={specs.part_id || ''}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Stock Height Range</Label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Input
                  id="min_stock_height"
                  name="min_stock_height"
                  placeholder="Minimum"
                  defaultValue={specs.min_stock_height || ''}
                />
              </div>
              <div>
                <Input
                  id="max_stock_height"
                  name="max_stock_height"
                  placeholder="Maximum"
                  defaultValue={specs.max_stock_height || ''}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="d1">D1 Dimension</Label>
              <Input
                id="d1"
                name="d1"
                defaultValue={specs.d1 || ''}
              />
            </div>
            <div>
              <Label htmlFor="d1_tolerance_mm">D1 Tolerance (mm)</Label>
              <Input
                id="d1_tolerance_mm"
                name="d1_tolerance_mm"
                defaultValue={specs.d1_tolerance_mm || ''}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="cnc" className="space-y-4">
          <div className="space-y-4 border rounded-lg p-4">
            <h3 className="font-medium">Part 1 Settings</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="cnc_part_1">CNC Program</Label>
                <Input
                  id="cnc_part_1"
                  name="cnc_part_1"
                  defaultValue={specs.cnc_part_1 || ''}
                />
              </div>
              <div>
                <Label htmlFor="work_offset_part_1">Work Offset</Label>
                <Input
                  id="work_offset_part_1"
                  name="work_offset_part_1"
                  defaultValue={specs.work_offset_part_1 || ''}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="jaws_part_1">Jaws</Label>
                <Input
                  id="jaws_part_1"
                  name="jaws_part_1"
                  defaultValue={specs.jaws_part_1 || ''}
                />
              </div>
              <div>
                <Label htmlFor="hsm_work_offset_number_part_1">HSM Work Offset #</Label>
                <Input
                  id="hsm_work_offset_number_part_1"
                  name="hsm_work_offset_number_part_1"
                  defaultValue={specs.hsm_work_offset_number_part_1 || ''}
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="x_axis_offset_part_1">X Axis Offset</Label>
                <Input
                  id="x_axis_offset_part_1"
                  name="x_axis_offset_part_1"
                  defaultValue={specs.x_axis_offset_part_1 || ''}
                />
              </div>
              <div>
                <Label htmlFor="y_axis_offset_part_1">Y Axis Offset</Label>
                <Input
                  id="y_axis_offset_part_1"
                  name="y_axis_offset_part_1"
                  defaultValue={specs.y_axis_offset_part_1 || ''}
                />
              </div>
              <div>
                <Label htmlFor="z_axis_offset_part_1">Z Axis Offset</Label>
                <Input
                  id="z_axis_offset_part_1"
                  name="z_axis_offset_part_1"
                  defaultValue={specs.z_axis_offset_part_1 || ''}
                />
              </div>
            </div>
          </div>

          <div className="space-y-4 border rounded-lg p-4">
            <h3 className="font-medium">Part 2 Settings</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="cnc_part_2">CNC Program</Label>
                <Input
                  id="cnc_part_2"
                  name="cnc_part_2"
                  defaultValue={specs.cnc_part_2 || ''}
                />
              </div>
              <div>
                <Label htmlFor="work_offset_part_2">Work Offset</Label>
                <Input
                  id="work_offset_part_2"
                  name="work_offset_part_2"
                  defaultValue={specs.work_offset_part_2 || ''}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="jaws_part_2">Jaws</Label>
                <Input
                  id="jaws_part_2"
                  name="jaws_part_2"
                  defaultValue={specs.jaws_part_2 || ''}
                />
              </div>
              <div>
                <Label htmlFor="hsm_work_offset_number_part_2">HSM Work Offset #</Label>
                <Input
                  id="hsm_work_offset_number_part_2"
                  name="hsm_work_offset_number_part_2"
                  defaultValue={specs.hsm_work_offset_number_part_2 || ''}
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="x_axis_offset_part_2">X Axis Offset</Label>
                <Input
                  id="x_axis_offset_part_2"
                  name="x_axis_offset_part_2"
                  defaultValue={specs.x_axis_offset_part_2 || ''}
                />
              </div>
              <div>
                <Label htmlFor="y_axis_offset_part_2">Y Axis Offset</Label>
                <Input
                  id="y_axis_offset_part_2"
                  name="y_axis_offset_part_2"
                  defaultValue={specs.y_axis_offset_part_2 || ''}
                />
              </div>
              <div>
                <Label htmlFor="z_axis_offset_part_2">Z Axis Offset</Label>
                <Input
                  id="z_axis_offset_part_2"
                  name="z_axis_offset_part_2"
                  defaultValue={specs.z_axis_offset_part_2 || ''}
                />
              </div>
            </div>
          </div>

          <div>
            <Label htmlFor="machining_qc">Machining QC Notes</Label>
            <textarea
              id="machining_qc"
              name="machining_qc"
              className="w-full min-h-[100px] px-3 py-2 text-sm rounded-md border border-input bg-background"
              defaultValue={specs.machining_qc || ''}
            />
          </div>
        </TabsContent>

        <TabsContent value="documents" className="space-y-4">
          <div>
            <Label htmlFor="master_drawing">Master Drawing URL</Label>
            <Input
              id="master_drawing"
              name="master_drawing"
              type="url"
              defaultValue={specs.master_drawing || ''}
            />
          </div>

          <div>
            <Label htmlFor="qc_drawing">QC Drawing URL</Label>
            <Input
              id="qc_drawing"
              name="qc_drawing"
              type="url"
              defaultValue={specs.qc_drawing || ''}
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