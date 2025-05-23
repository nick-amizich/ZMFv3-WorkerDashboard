'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { useToast } from '@/hooks/use-toast'
import { CheckCircle2, XCircle } from 'lucide-react'

interface QCModalProps {
  open: boolean
  onClose: () => void
  taskId: string
  productName: string
  onComplete: () => void
}

export function QCModal({ open, onClose, taskId, productName, onComplete }: QCModalProps) {
  const [results, setResults] = useState({
    looks: '',
    hardware: '',
    sound: '',
    notes: ''
  })
  const [submitting, setSubmitting] = useState(false)
  const { toast } = useToast()
  
  const handleSubmit = async () => {
    // Validate all fields are filled
    if (!results.looks || !results.hardware || !results.sound) {
      toast({
        title: 'Missing fields',
        description: 'Please complete all quality checks',
        variant: 'destructive'
      })
      return
    }
    
    setSubmitting(true)
    try {
      const response = await fetch(`/api/tasks/${taskId}/qc`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          results,
          overall_status: (results.looks === 'pass' && results.hardware === 'pass' && results.sound === 'pass') 
            ? 'pass' 
            : 'fail'
        })
      })
      
      if (!response.ok) throw new Error('Failed to submit QC results')
      
      toast({
        title: 'QC completed',
        description: 'Quality control results saved successfully'
      })
      
      onComplete()
      onClose()
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save QC results',
        variant: 'destructive'
      })
    } finally {
      setSubmitting(false)
    }
  }
  
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Quality Control Check</DialogTitle>
          <DialogDescription>
            Perform quality control for {productName}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          <div className="space-y-3">
            <Label>Visual Inspection</Label>
            <RadioGroup
              value={results.looks}
              onValueChange={(value) => setResults({ ...results, looks: value })}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="pass" id="looks-pass" />
                <Label htmlFor="looks-pass" className="flex items-center cursor-pointer">
                  <CheckCircle2 className="w-4 h-4 mr-2 text-green-600" />
                  Pass - No visual defects
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="fail" id="looks-fail" />
                <Label htmlFor="looks-fail" className="flex items-center cursor-pointer">
                  <XCircle className="w-4 h-4 mr-2 text-red-600" />
                  Fail - Visual defects found
                </Label>
              </div>
            </RadioGroup>
          </div>
          
          <div className="space-y-3">
            <Label>Hardware Check</Label>
            <RadioGroup
              value={results.hardware}
              onValueChange={(value) => setResults({ ...results, hardware: value })}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="pass" id="hardware-pass" />
                <Label htmlFor="hardware-pass" className="flex items-center cursor-pointer">
                  <CheckCircle2 className="w-4 h-4 mr-2 text-green-600" />
                  Pass - All components secure
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="fail" id="hardware-fail" />
                <Label htmlFor="hardware-fail" className="flex items-center cursor-pointer">
                  <XCircle className="w-4 h-4 mr-2 text-red-600" />
                  Fail - Hardware issues found
                </Label>
              </div>
            </RadioGroup>
          </div>
          
          <div className="space-y-3">
            <Label>Sound Test</Label>
            <RadioGroup
              value={results.sound}
              onValueChange={(value) => setResults({ ...results, sound: value })}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="pass" id="sound-pass" />
                <Label htmlFor="sound-pass" className="flex items-center cursor-pointer">
                  <CheckCircle2 className="w-4 h-4 mr-2 text-green-600" />
                  Pass - Sound quality good
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="fail" id="sound-fail" />
                <Label htmlFor="sound-fail" className="flex items-center cursor-pointer">
                  <XCircle className="w-4 h-4 mr-2 text-red-600" />
                  Fail - Sound issues detected
                </Label>
              </div>
            </RadioGroup>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="notes">Additional Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Enter any additional observations..."
              value={results.notes}
              onChange={(e) => setResults({ ...results, notes: e.target.value })}
              rows={3}
            />
          </div>
        </div>
        
        <div className="flex justify-end space-x-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={submitting || !results.looks || !results.hardware || !results.sound}
          >
            {submitting ? 'Submitting...' : 'Submit QC Results'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}