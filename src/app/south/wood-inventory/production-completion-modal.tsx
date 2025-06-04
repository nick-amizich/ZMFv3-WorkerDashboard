'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useToast } from '@/hooks/use-toast'
import { 
  ScanLine,
  Package,
  MapPin,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Layers,
  TreePine
} from 'lucide-react'
import { logBusiness, logError } from '@/lib/logger-client'

interface MachiningJob {
  id: string
  job_number: string
  species_required: string
  thickness_required: number
  quantity_required: number
  actual_quantity_produced?: number | null
  notes?: string | null
}

interface StorageLocation {
  id: string
  location_code: string
  display_name: string
  location_type: string
  capacity_units: number
  current_units: number
  qr_code: string | null
}

interface ProductionCompletionModalProps {
  job: MachiningJob
  isOpen: boolean
  onClose: () => void
  onComplete: () => void
}

export function ProductionCompletionModal({ job, isOpen, onClose, onComplete }: ProductionCompletionModalProps) {
  const [quantityProduced, setQuantityProduced] = useState(job.quantity_required.toString())
  const [storageMode, setStorageMode] = useState<'scan' | 'select'>('select')
  const [locationInput, setLocationInput] = useState('')
  const [selectedLocation, setSelectedLocation] = useState<StorageLocation | null>(null)
  const [storageLocations, setStorageLocations] = useState<StorageLocation[]>([])
  const [qualityNotes, setQualityNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [processing, setProcessing] = useState(false)
  const { toast } = useToast()
  const supabase = createClient()

  useEffect(() => {
    if (isOpen) {
      loadStorageLocations()
      // Pre-fill with expected quantity
      setQuantityProduced(job.quantity_required.toString())
    }
  }, [isOpen])

  async function loadStorageLocations() {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('storage_locations')
        .select('*')
        .eq('is_active', true)
        .in('location_type', ['cabinet', 'drawer', 'shelf'])
        .order('location_code')

      if (error) throw error

      setStorageLocations(data || [])
    } catch (error) {
      logError(error as Error, 'PRODUCTION_COMPLETION', { action: 'load_locations' })
      toast({
        title: 'Error',
        description: 'Failed to load storage locations',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  async function handleLocationScan() {
    if (!locationInput) return

    try {
      const { data, error } = await supabase
        .from('storage_locations')
        .select('*')
        .or(`qr_code.eq.${locationInput},location_code.eq.${locationInput}`)
        .single()

      if (error) throw error

      if (!data) {
        toast({
          title: 'Not found',
          description: 'No storage location found with this code',
          variant: 'destructive',
        })
        return
      }

      setSelectedLocation(data)
      setLocationInput('')
      
      toast({
        title: 'Location selected',
        description: `Selected ${data.display_name}`,
      })
    } catch (error) {
      logError(error as Error, 'PRODUCTION_COMPLETION', { action: 'scan_location' })
      toast({
        title: 'Error',
        description: 'Failed to scan location',
        variant: 'destructive',
      })
    }
  }

  async function completeProduction() {
    const quantity = parseInt(quantityProduced)
    
    if (!quantity || quantity <= 0) {
      toast({
        title: 'Invalid quantity',
        description: 'Please enter a valid quantity produced',
        variant: 'destructive',
      })
      return
    }

    if (!selectedLocation) {
      toast({
        title: 'No location selected',
        description: 'Please select a storage location',
        variant: 'destructive',
      })
      return
    }

    // Check if location has capacity
    const remainingCapacity = selectedLocation.capacity_units - selectedLocation.current_units
    if (quantity > remainingCapacity) {
      toast({
        title: 'Insufficient capacity',
        description: `Location only has space for ${remainingCapacity} more units`,
        variant: 'destructive',
      })
      return
    }

    try {
      setProcessing(true)

      // Record production output
      const { data: blocksId, error } = await supabase.rpc('record_production_output', {
        p_job_id: job.id,
        p_species: job.species_required,
        p_thickness: job.thickness_required,
        p_quantity: quantity,
        p_location_id: selectedLocation.id
      })

      if (error) throw error

      // Update job with actual production quantity and completion
      const { error: updateError } = await supabase
        .from('machining_jobs')
        .update({
          actual_quantity_produced: quantity,
          status: 'completed',
          completed_at: new Date().toISOString(),
          notes: qualityNotes || null
        })
        .eq('id', job.id)

      if (updateError) throw updateError

      // Update storage location capacity
      const { error: locationError } = await supabase
        .from('storage_locations')
        .update({
          current_units: selectedLocation.current_units + quantity
        })
        .eq('id', selectedLocation.id)

      if (locationError) throw locationError

      const variance = quantity - job.quantity_required
      const variancePercent = ((variance / job.quantity_required) * 100).toFixed(1)

      logBusiness('Production completed', 'PRODUCTION_COMPLETION', {
        jobId: job.id,
        jobNumber: job.job_number,
        quantityRequired: job.quantity_required,
        quantityProduced: quantity,
        variance,
        variancePercent,
        locationId: selectedLocation.id,
        locationCode: selectedLocation.location_code
      })

      toast({
        title: 'Production completed',
        description: `Job #${job.job_number} completed with ${quantity} blocks`,
      })

      onComplete()
    } catch (error) {
      logError(error as Error, 'PRODUCTION_COMPLETION', { action: 'complete_production' })
      toast({
        title: 'Error',
        description: 'Failed to complete production',
        variant: 'destructive',
      })
    } finally {
      setProcessing(false)
    }
  }

  const quantity = parseInt(quantityProduced) || 0
  const variance = quantity - job.quantity_required
  const variancePercent = job.quantity_required > 0 ? (variance / job.quantity_required) * 100 : 0

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl">Complete Job #{job.job_number}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* Job Summary */}
          <Card className="bg-gray-50">
            <CardContent className="pt-4">
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Species</p>
                  <p className="font-medium flex items-center gap-1">
                    <TreePine className="h-4 w-4" />
                    {job.species_required}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Thickness</p>
                  <p className="font-medium">{job.thickness_required}"</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Required</p>
                  <p className="font-medium flex items-center gap-1">
                    <Package className="h-4 w-4" />
                    {job.quantity_required} blocks
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Production Output */}
          <div className="space-y-2">
            <Label>Blocks Completed</Label>
            <Input
              type="number"
              min="0"
              value={quantityProduced}
              onChange={(e) => setQuantityProduced(e.target.value)}
              placeholder="Enter actual quantity produced"
              className="text-lg font-semibold"
            />
            
            {/* Variance Indicator */}
            {quantity > 0 && (
              <div className={`flex items-center gap-2 text-sm ${
                variance === 0 ? 'text-green-600' :
                variance > 0 ? 'text-blue-600' :
                'text-orange-600'
              }`}>
                {variance === 0 ? (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    <span>Exact match (Planned: {job.quantity_required})</span>
                  </>
                ) : variance > 0 ? (
                  <>
                    <TrendingUp className="h-4 w-4" />
                    <span>+{variance} blocks ({variancePercent > 0 ? '+' : ''}{variancePercent.toFixed(0)}% over plan)</span>
                  </>
                ) : (
                  <>
                    <TrendingDown className="h-4 w-4" />
                    <span>{variance} blocks ({variancePercent.toFixed(0)}% under plan)</span>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Storage Location Selection */}
          <div className="space-y-2">
            <Label>Storage Location</Label>
            <div className="flex gap-2 mb-2">
              <Button
                variant={storageMode === 'scan' ? 'default' : 'outline'}
                onClick={() => setStorageMode('scan')}
                size="sm"
                className="flex-1"
              >
                <ScanLine className="h-4 w-4 mr-2" />
                Scan Location
              </Button>
              <Button
                variant={storageMode === 'select' ? 'default' : 'outline'}
                onClick={() => setStorageMode('select')}
                size="sm"
                className="flex-1"
              >
                <MapPin className="h-4 w-4 mr-2" />
                Select Location
              </Button>
            </div>

            {storageMode === 'scan' ? (
              <div className="flex gap-2">
                <Input
                  placeholder="Scan QR code or enter location code..."
                  value={locationInput}
                  onChange={(e) => setLocationInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleLocationScan()
                    }
                  }}
                />
                <Button onClick={handleLocationScan}>
                  <CheckCircle className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Select
                value={selectedLocation?.id || ''}
                onValueChange={(value) => {
                  const location = storageLocations.find(l => l.id === value)
                  setSelectedLocation(location || null)
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select storage location" />
                </SelectTrigger>
                <SelectContent>
                  {storageLocations.map(location => {
                    const availableSpace = location.capacity_units - location.current_units
                    return (
                      <SelectItem 
                        key={location.id} 
                        value={location.id}
                        disabled={availableSpace < quantity}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span>{location.display_name}</span>
                          <span className="text-sm text-muted-foreground ml-2">
                            ({availableSpace} spaces available)
                          </span>
                        </div>
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            )}

            {selectedLocation && (
              <Alert className="mt-2">
                <MapPin className="h-4 w-4" />
                <AlertDescription>
                  <div className="flex items-center justify-between">
                    <span>
                      <strong>{selectedLocation.display_name}</strong> - {selectedLocation.location_code}
                    </span>
                    <Badge variant="outline">
                      {selectedLocation.capacity_units - selectedLocation.current_units} spaces left
                    </Badge>
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Quality Notes */}
          <div className="space-y-2">
            <Label>Quality Notes (Optional)</Label>
            <Textarea
              placeholder="Any quality issues, defects, or special notes..."
              value={qualityNotes}
              onChange={(e) => setQualityNotes(e.target.value)}
              rows={3}
            />
          </div>

          {/* Summary */}
          <Card className="bg-green-50 border-green-200">
            <CardContent className="pt-4">
              <h4 className="font-semibold mb-2 text-green-900">Production Summary</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Species:</span>
                  <span className="font-medium">{job.species_required}, {job.thickness_required}" thick</span>
                </div>
                <div className="flex justify-between">
                  <span>Quantity:</span>
                  <span className="font-medium">{quantity} blocks (4.6" x 4.6")</span>
                </div>
                {selectedLocation && (
                  <div className="flex justify-between">
                    <span>Location:</span>
                    <span className="font-medium">{selectedLocation.display_name}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={processing}>
            Cancel
          </Button>
          <Button 
            onClick={completeProduction}
            disabled={!quantity || !selectedLocation || processing}
          >
            {processing ? 'Processing...' : 'Complete Job'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}