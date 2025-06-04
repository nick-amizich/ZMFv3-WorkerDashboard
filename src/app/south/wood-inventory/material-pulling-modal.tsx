'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { 
  ScanLine,
  Package,
  TreePine,
  MapPin,
  Plus,
  X,
  Check,
  AlertTriangle,
  Layers
} from 'lucide-react'
import { logBusiness, logError } from '@/lib/logger-client'

interface MachiningJob {
  id: string
  job_number: string
  species_required: string
  thickness_required: number
  quantity_required: number
}

interface RawMaterial {
  id: string
  barcode: string
  species: string
  form: string
  thickness_inches: number
  board_feet: number | null
  location_code: string
  location_name: string
  quality_grade: string | null
  estimated_yield_percentage: number
}

interface MaterialPullingModalProps {
  job: MachiningJob
  isOpen: boolean
  onClose: () => void
  onComplete: () => void
}

export function MaterialPullingModal({ job, isOpen, onClose, onComplete }: MaterialPullingModalProps) {
  const [scanMode, setScanMode] = useState<'scan' | 'select'>('select')
  const [barcodeInput, setBarcodeInput] = useState('')
  const [availableMaterials, setAvailableMaterials] = useState<RawMaterial[]>([])
  const [selectedMaterials, setSelectedMaterials] = useState<RawMaterial[]>([])
  const [loading, setLoading] = useState(false)
  const [processing, setProcessing] = useState(false)
  const { toast } = useToast()
  const supabase = createClient()

  useEffect(() => {
    if (isOpen) {
      loadAvailableMaterials()
    }
  }, [isOpen, job.species_required])

  async function loadAvailableMaterials() {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('available_raw_materials')
        .select('*')
        .eq('species', job.species_required)
        .gte('thickness_inches', job.thickness_required - 0.25) // Allow some tolerance
        .order('location_code')

      if (error) throw error

      setAvailableMaterials(data || [])
    } catch (error) {
      logError(error as Error, 'MATERIAL_PULLING', { action: 'load_materials' })
      toast({
        title: 'Error',
        description: 'Failed to load available materials',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  async function handleBarcodeScan() {
    if (!barcodeInput) return

    try {
      const { data, error } = await supabase
        .from('available_raw_materials')
        .select('*')
        .eq('barcode', barcodeInput)
        .single()

      if (error) throw error

      if (!data) {
        toast({
          title: 'Not found',
          description: 'No material found with this barcode',
          variant: 'destructive',
        })
        return
      }

      // Check if already selected
      if (selectedMaterials.some(m => m.id === data.id)) {
        toast({
          title: 'Already selected',
          description: 'This material has already been added',
          variant: 'destructive',
        })
        return
      }

      // Check species match
      if (data.species !== job.species_required) {
        toast({
          title: 'Wrong species',
          description: `This is ${data.species}, but job requires ${job.species_required}`,
          variant: 'destructive',
        })
        return
      }

      setSelectedMaterials([...selectedMaterials, data])
      setBarcodeInput('')
      
      toast({
        title: 'Material added',
        description: `Added ${data.species} from ${data.location_name}`,
      })
    } catch (error) {
      logError(error as Error, 'MATERIAL_PULLING', { action: 'scan_barcode' })
      toast({
        title: 'Error',
        description: 'Failed to scan material',
        variant: 'destructive',
      })
    }
  }

  async function confirmMaterialPulling() {
    if (selectedMaterials.length === 0) {
      toast({
        title: 'No materials selected',
        description: 'Please select at least one material to pull',
        variant: 'destructive',
      })
      return
    }

    try {
      setProcessing(true)

      // Record material consumption for each selected material
      for (const material of selectedMaterials) {
        const { error } = await supabase.rpc('consume_raw_material', {
          p_job_id: job.id,
          p_material_id: material.id,
          p_quantity: 1
        })

        if (error) throw error
      }

      logBusiness('Materials pulled for job', 'MATERIAL_PULLING', {
        jobId: job.id,
        jobNumber: job.job_number,
        materialsCount: selectedMaterials.length,
        totalBoardFeet: selectedMaterials.reduce((sum, m) => sum + (m.board_feet || 0), 0)
      })

      toast({
        title: 'Materials pulled',
        description: `${selectedMaterials.length} materials pulled for Job #${job.job_number}`,
      })

      onComplete()
    } catch (error) {
      logError(error as Error, 'MATERIAL_PULLING', { action: 'confirm_pulling' })
      toast({
        title: 'Error',
        description: 'Failed to record material pulling',
        variant: 'destructive',
      })
    } finally {
      setProcessing(false)
    }
  }

  function addMaterial(material: RawMaterial) {
    if (selectedMaterials.some(m => m.id === material.id)) {
      toast({
        title: 'Already selected',
        description: 'This material has already been added',
        variant: 'destructive',
      })
      return
    }

    setSelectedMaterials([...selectedMaterials, material])
  }

  function removeMaterial(materialId: string) {
    setSelectedMaterials(selectedMaterials.filter(m => m.id !== materialId))
  }

  const totalBoardFeet = selectedMaterials.reduce((sum, m) => sum + (m.board_feet || 0), 0)
  const estimatedYield = selectedMaterials.length > 0
    ? selectedMaterials.reduce((sum, m) => sum + m.estimated_yield_percentage, 0) / selectedMaterials.length
    : 0

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl">Pull Materials for Job #{job.job_number}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* Job Requirements Reminder */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-4">
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <TreePine className="h-4 w-4 text-blue-600" />
                  <span className="font-medium">{job.species_required}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-blue-600" />
                  <span className="font-medium">{job.thickness_required}" thick</span>
                </div>
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-blue-600" />
                  <span className="font-medium">{job.quantity_required} blocks needed</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Material Selection Method */}
          <div className="flex gap-2">
            <Button
              variant={scanMode === 'scan' ? 'default' : 'outline'}
              onClick={() => setScanMode('scan')}
              className="flex-1"
            >
              <ScanLine className="h-4 w-4 mr-2" />
              Scan Barcode
            </Button>
            <Button
              variant={scanMode === 'select' ? 'default' : 'outline'}
              onClick={() => setScanMode('select')}
              className="flex-1"
            >
              <Package className="h-4 w-4 mr-2" />
              Select Material
            </Button>
          </div>

          {/* Scan Mode */}
          {scanMode === 'scan' && (
            <div className="space-y-2">
              <Label>Scan or Enter Barcode</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Scan barcode here..."
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleBarcodeScan()
                    }
                  }}
                  autoFocus
                />
                <Button onClick={handleBarcodeScan}>
                  <Check className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Select Mode */}
          {scanMode === 'select' && (
            <div className="space-y-2">
              <Label>Available {job.species_required} Materials</Label>
              {loading ? (
                <div className="text-center py-4 text-muted-foreground">
                  Loading materials...
                </div>
              ) : availableMaterials.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-orange-500" />
                  <p>No {job.species_required} materials available</p>
                </div>
              ) : (
                <div className="max-h-64 overflow-y-auto space-y-2 border rounded-lg p-2">
                  {availableMaterials.map(material => (
                    <div
                      key={material.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                      onClick={() => addMaterial(material)}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{material.species}</span>
                          <Badge variant="outline">{material.form}</Badge>
                          {material.quality_grade && (
                            <Badge variant="secondary">Grade {material.quality_grade}</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                          <span>{material.thickness_inches}" thick</span>
                          {material.board_feet && <span>{material.board_feet} bf</span>}
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {material.location_name}
                          </span>
                        </div>
                      </div>
                      <Button size="sm" variant="ghost">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Selected Materials */}
          {selectedMaterials.length > 0 && (
            <div className="space-y-2">
              <Label>Selected Materials ({selectedMaterials.length})</Label>
              <div className="space-y-2 border rounded-lg p-2 max-h-48 overflow-y-auto">
                {selectedMaterials.map(material => (
                  <div key={material.id} className="flex items-center justify-between p-2 bg-green-50 rounded">
                    <div>
                      <span className="font-medium">{material.species}</span>
                      <span className="text-sm text-muted-foreground ml-2">
                        {material.thickness_inches}" • {material.board_feet || 0} bf • {material.location_name}
                      </span>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeMaterial(material.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Total Board Feet</p>
                  <p className="font-medium">{totalBoardFeet.toFixed(1)} bf</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Average Yield</p>
                  <p className="font-medium">{estimatedYield.toFixed(0)}%</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={processing}>
            Cancel
          </Button>
          <Button 
            onClick={confirmMaterialPulling}
            disabled={selectedMaterials.length === 0 || processing}
          >
            {processing ? 'Processing...' : `Pull ${selectedMaterials.length} Materials`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}