'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Textarea } from '@/components/ui/textarea'
import { Slider } from '@/components/ui/slider'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { CheckCircle, XCircle, AlertCircle, Camera, Mic, Loader2 } from 'lucide-react'

interface QualityCheckpoint {
  id: string
  stage: string
  checkpoint_type: 'pre_work' | 'in_process' | 'post_work' | 'gate'
  required_checks: string[]
  pass_criteria: Record<string, any>
  description?: string
}

interface QualityCheckpointCompletionModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  checkpoint: QualityCheckpoint | null
  componentId: string
  taskId: string
  onComplete: () => void
}

export function QualityCheckpointCompletionModal({
  open,
  onOpenChange,
  checkpoint,
  componentId,
  taskId,
  onComplete
}: QualityCheckpointCompletionModalProps) {
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<'passed' | 'failed' | 'needs_rework'>('passed')
  const [checkResults, setCheckResults] = useState<Record<string, boolean>>({})
  const [scores, setScores] = useState({
    looks: 90,
    hardware: 90,
    sound: 90
  })
  const [notes, setNotes] = useState('')
  const [defectType, setDefectType] = useState('')
  const { toast } = useToast()

  if (!checkpoint) return null

  const handleCheckChange = (check: string, value: boolean) => {
    setCheckResults(prev => ({ ...prev, [check]: value }))
    
    // Auto-update status based on checks
    const allChecks = { ...checkResults, [check]: value }
    const failedChecks = Object.values(allChecks).filter(v => v === false).length
    
    if (failedChecks === 0) {
      setStatus('passed')
    } else if (failedChecks > 2) {
      setStatus('failed')
    } else {
      setStatus('needs_rework')
    }
  }

  const handleSubmit = async () => {
    setLoading(true)
    
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Get worker ID
      const { data: worker } = await supabase
        .from('workers')
        .select('id')
        .eq('auth_user_id', user.id)
        .single()
      
      if (!worker) throw new Error('Worker not found')

      // Create inspection result
      const overallScore = Math.round((scores.looks + scores.hardware + scores.sound) / 3)
      
      const { error: inspectionError } = await supabase
        .from('inspection_results')
        .insert({
          component_tracking_id: componentId,
          checkpoint_id: checkpoint.id,
          inspector_id: worker.id,
          status,
          overall_score: overallScore,
          check_results: checkResults,
          defect_types: status !== 'passed' ? [defectType] : [],
          notes,
          metadata: {
            task_id: taskId,
            scores,
            checkpoint_type: checkpoint.checkpoint_type
          }
        })

      if (inspectionError) throw inspectionError

      // If failed, create quality hold
      if (status === 'failed') {
        const { error: holdError } = await supabase
          .from('quality_holds')
          .insert({
            component_tracking_id: componentId,
            reported_by: worker.id,
            hold_reason: `Failed ${checkpoint.checkpoint_type} inspection: ${defectType}`,
            severity: 'high',
            status: 'open'
          })

        if (holdError) throw holdError
      }

      toast({
        title: 'Inspection completed',
        description: status === 'passed' 
          ? 'Component passed quality checkpoint' 
          : status === 'needs_rework'
          ? 'Component marked for rework'
          : 'Quality hold created for component',
      })

      onComplete()
      onOpenChange(false)
    } catch (error) {
      console.error('Error completing checkpoint:', error)
      toast({
        title: 'Error',
        description: 'Failed to complete quality checkpoint',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (s: typeof status) => {
    switch (s) {
      case 'passed': return 'text-green-600'
      case 'failed': return 'text-red-600'
      case 'needs_rework': return 'text-yellow-600'
    }
  }

  const getStatusIcon = (s: typeof status) => {
    switch (s) {
      case 'passed': return CheckCircle
      case 'failed': return XCircle
      case 'needs_rework': return AlertCircle
    }
  }

  const StatusIcon = getStatusIcon(status)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Quality Checkpoint: {checkpoint.checkpoint_type.replace('_', ' ').toUpperCase()}</DialogTitle>
          <DialogDescription>
            {checkpoint.description || 'Complete the quality inspection for this component'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Required Checks */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Required Checks</Label>
            <div className="space-y-2">
              {checkpoint.required_checks.map((check) => (
                <div key={check} className="flex items-center justify-between p-3 border rounded-lg">
                  <Label htmlFor={check} className="font-normal cursor-pointer flex-1">
                    {check}
                  </Label>
                  <RadioGroup
                    id={check}
                    value={checkResults[check] === true ? 'pass' : checkResults[check] === false ? 'fail' : ''}
                    onValueChange={(value) => handleCheckChange(check, value === 'pass')}
                    className="flex flex-row gap-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="pass" id={`${check}-pass`} />
                      <Label htmlFor={`${check}-pass`} className="font-normal text-green-600 cursor-pointer">
                        Pass
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="fail" id={`${check}-fail`} />
                      <Label htmlFor={`${check}-fail`} className="font-normal text-red-600 cursor-pointer">
                        Fail
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
              ))}
            </div>
          </div>

          {/* Quality Scores */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Quality Scores</Label>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <Label>Looks/Finish</Label>
                  <span className="text-sm font-medium">{scores.looks}/100</span>
                </div>
                <Slider
                  value={[scores.looks]}
                  onValueChange={([value]) => setScores(prev => ({ ...prev, looks: value }))}
                  max={100}
                  step={5}
                  className="w-full"
                />
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <Label>Hardware/Fit</Label>
                  <span className="text-sm font-medium">{scores.hardware}/100</span>
                </div>
                <Slider
                  value={[scores.hardware]}
                  onValueChange={([value]) => setScores(prev => ({ ...prev, hardware: value }))}
                  max={100}
                  step={5}
                  className="w-full"
                />
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <Label>Sound Quality</Label>
                  <span className="text-sm font-medium">{scores.sound}/100</span>
                </div>
                <Slider
                  value={[scores.sound]}
                  onValueChange={([value]) => setScores(prev => ({ ...prev, sound: value }))}
                  max={100}
                  step={5}
                  className="w-full"
                />
              </div>
            </div>
          </div>

          {/* Status Summary */}
          <Alert className={`border-2 ${
            status === 'passed' ? 'border-green-200 bg-green-50' :
            status === 'needs_rework' ? 'border-yellow-200 bg-yellow-50' :
            'border-red-200 bg-red-50'
          }`}>
            <StatusIcon className={`h-4 w-4 ${getStatusColor(status)}`} />
            <AlertDescription className="flex items-center justify-between">
              <span className={`font-medium ${getStatusColor(status)}`}>
                {status === 'passed' ? 'Component Passes Inspection' :
                 status === 'needs_rework' ? 'Component Needs Rework' :
                 'Component Failed Inspection'}
              </span>
              <Badge variant={status === 'passed' ? 'default' : 'destructive'}>
                Overall Score: {Math.round((scores.looks + scores.hardware + scores.sound) / 3)}
              </Badge>
            </AlertDescription>
          </Alert>

          {/* Defect Type (if not passed) */}
          {status !== 'passed' && (
            <div className="space-y-2">
              <Label htmlFor="defect-type">Primary Defect Type</Label>
              <select
                id="defect-type"
                value={defectType}
                onChange={(e) => setDefectType(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
                required
              >
                <option value="">Select defect type...</option>
                <option value="cosmetic">Cosmetic/Finish Issue</option>
                <option value="alignment">Alignment/Fit Issue</option>
                <option value="hardware">Hardware/Component Issue</option>
                <option value="functionality">Functionality Issue</option>
                <option value="sound">Sound Quality Issue</option>
                <option value="other">Other</option>
              </select>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes {status !== 'passed' && <span className="text-red-500">*</span>}</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any additional observations or details..."
              rows={3}
              required={status !== 'passed'}
            />
          </div>

          {/* Future: Photo/Voice Capture */}
          <div className="flex gap-2 pt-2">
            <Button variant="outline" size="sm" disabled>
              <Camera className="h-4 w-4 mr-2" />
              Add Photo
            </Button>
            <Button variant="outline" size="sm" disabled>
              <Mic className="h-4 w-4 mr-2" />
              Add Voice Note
            </Button>
            <span className="text-xs text-muted-foreground self-center ml-2">Coming soon</span>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || (status !== 'passed' && (!defectType || !notes))}
            className={
              status === 'passed' ? 'bg-green-600 hover:bg-green-700' :
              status === 'needs_rework' ? 'bg-yellow-600 hover:bg-yellow-700' :
              'bg-red-600 hover:bg-red-700'
            }
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <StatusIcon className="mr-2 h-4 w-4" />
                Complete Inspection
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}