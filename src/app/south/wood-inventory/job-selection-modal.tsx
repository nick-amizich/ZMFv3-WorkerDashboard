'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  TreePine,
  Layers,
  Package,
  Clock,
  AlertTriangle
} from 'lucide-react'

interface MachiningJob {
  id: string
  job_number: string
  model: string | null
  species_required: string
  thickness_required: number
  quantity_required: number
  scheduled_date: string
  priority: number
  status: string
  notes: string | null
}

interface JobSelectionModalProps {
  job: MachiningJob
  isOpen: boolean
  onClose: () => void
  onStartJob: () => void
}

export function JobSelectionModal({ job, isOpen, onClose, onStartJob }: JobSelectionModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl">Start Job #{job.job_number}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-lg mb-3">Job Requirements</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <TreePine className="h-4 w-4" />
                  Species
                </span>
                <span className="font-semibold text-lg">{job.species_required}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <Layers className="h-4 w-4" />
                  Thickness
                </span>
                <span className="font-semibold text-lg">{job.thickness_required}"</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <Package className="h-4 w-4" />
                  Quantity
                </span>
                <span className="font-semibold text-lg">{job.quantity_required} blocks</span>
              </div>
            </div>
          </div>

          {job.model && (
            <div>
              <p className="text-sm text-muted-foreground">Model</p>
              <p className="font-medium">{job.model}</p>
            </div>
          )}

          {job.priority <= 3 && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <span className="text-sm font-medium text-orange-900">
                High Priority Job - Please complete as soon as possible
              </span>
            </div>
          )}

          {job.notes && (
            <div>
              <p className="text-sm text-muted-foreground">Notes</p>
              <p className="text-sm">{job.notes}</p>
            </div>
          )}

          <div className="text-sm text-muted-foreground">
            <p className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Starting this job will track your time and material usage
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onStartJob}>
            Start Job & Pull Materials
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}