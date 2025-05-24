'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Card, CardContent } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { 
  CheckCircle2, 
  XCircle, 
  Camera, 
  Ruler, 
  AlertTriangle, 
  Info,
  Clock,
  Lightbulb,
  TrendingUp,
  Shield
} from 'lucide-react'

interface QualityCheck {
  id: string
  description: string
  requires_photo: boolean
  requires_measurement: boolean
  acceptance_criteria: string
  common_failures: string[]
}

interface QualityCheckpoint {
  id: string
  stage: string
  checkpoint_type: 'pre_work' | 'in_process' | 'post_work' | 'gate'
  severity: 'critical' | 'major' | 'minor'
  checks: QualityCheck[]
  on_failure: 'block_progress' | 'warn_continue' | 'log_only'
}

interface QualityPattern {
  issue_type: string
  frequency: number
  typical_cause: string
  prevention_tip: string
}

interface QualityCheckpointModalProps {
  open: boolean
  onClose: () => void
  taskId: string
  stage: string
  checkpointType: 'pre_work' | 'post_work'
  productName: string
  onComplete: (passed: boolean) => void
}

export function QualityCheckpointModal({
  open,
  onClose,
  taskId,
  stage,
  checkpointType,
  productName,
  onComplete
}: QualityCheckpointModalProps) {
  const [checkpoint, setCheckpoint] = useState<QualityCheckpoint | null>(null)
  const [patterns, setPatterns] = useState<QualityPattern[]>([])
  const [checkResults, setCheckResults] = useState<{[checkId: string]: boolean}>({})
  const [failedChecks, setFailedChecks] = useState<string[]>([])
  const [notes, setNotes] = useState('')
  const [photos, setPhotos] = useState<{[checkId: string]: string}>({})
  const [measurements, setMeasurements] = useState<{[checkId: string]: number}>({})
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (open && stage && checkpointType) {
      fetchCheckpointData()
    }
  }, [open, stage, checkpointType])

  const fetchCheckpointData = async () => {
    setLoading(true)
    try {
      // Fetch checkpoint configuration
      const checkpointResponse = await fetch(`/api/quality/checkpoints?stage=${stage}&type=${checkpointType}`)
      if (checkpointResponse.ok) {
        const checkpointData = await checkpointResponse.json()
        setCheckpoint(checkpointData)
        
        // Initialize all checks as unchecked
        const initialResults: {[key: string]: boolean} = {}
        checkpointData.checks.forEach((check: QualityCheck) => {
          initialResults[check.id] = false
        })
        setCheckResults(initialResults)
      }

      // Fetch quality patterns for this stage
      const patternsResponse = await fetch(`/api/quality/patterns?stage=${stage}`)
      if (patternsResponse.ok) {
        const patternsData = await patternsResponse.json()
        setPatterns(patternsData)
      }
    } catch (error) {
      console.error('Error fetching checkpoint data:', error)
      toast({
        title: 'Failed to load quality checks',
        description: 'Please try again or contact support',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCheckChange = (checkId: string, passed: boolean) => {
    setCheckResults(prev => ({ ...prev, [checkId]: passed }))
    
    if (!passed) {
      setFailedChecks(prev => [...prev, checkId])
    } else {
      setFailedChecks(prev => prev.filter(id => id !== checkId))
    }
  }

  const handlePhotoCapture = async (checkId: string) => {
    // In a real app, this would open camera or file picker
    // For now, we'll simulate with a placeholder
    toast({
      title: 'Photo capture',
      description: 'Camera integration coming soon. Photo marked as captured.'
    })
    setPhotos(prev => ({ ...prev, [checkId]: 'photo_captured' }))
  }

  const handleMeasurement = (checkId: string, value: number) => {
    setMeasurements(prev => ({ ...prev, [checkId]: value }))
  }

  const handleSubmit = async () => {
    if (!checkpoint) return

    // Validate required photos and measurements
    const missingRequirements = checkpoint.checks.filter(check => {
      if (check.requires_photo && !photos[check.id]) return true
      if (check.requires_measurement && !measurements[check.id]) return true
      return false
    })

    if (missingRequirements.length > 0) {
      toast({
        title: 'Missing required items',
        description: 'Please complete all photo and measurement requirements',
        variant: 'destructive'
      })
      return
    }

    setSubmitting(true)
    
    try {
      const allPassed = Object.values(checkResults).every(result => result === true)
      const failedCheckIds = Object.entries(checkResults)
        .filter(([_, passed]) => !passed)
        .map(([checkId, _]) => checkId)

      const response = await fetch('/api/quality/inspections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task_id: taskId,
          checkpoint_id: checkpoint.id,
          passed: allPassed,
          failed_checks: failedCheckIds,
          notes,
          photo_urls: Object.values(photos),
          measurement_data: measurements
        })
      })

      if (!response.ok) throw new Error('Failed to submit inspection')

      const canProceed = allPassed || checkpoint.on_failure !== 'block_progress'
      
      if (allPassed) {
        toast({
          title: 'Quality check passed! ✅',
          description: 'Great work! You can proceed with the task.'
        })
      } else if (canProceed) {
        toast({
          title: 'Quality issues noted',
          description: 'Issues have been recorded. You may continue working.',
          variant: 'default'
        })
      } else {
        toast({
          title: 'Quality check failed',
          description: 'Critical issues found. Please address them before continuing.',
          variant: 'destructive'
        })
      }

      onComplete(canProceed)
      onClose()
    } catch (error) {
      toast({
        title: 'Submission failed',
        description: 'Could not save quality check results',
        variant: 'destructive'
      })
    } finally {
      setSubmitting(false)
    }
  }

  const getCheckTypeInfo = () => {
    switch (checkpointType) {
      case 'pre_work':
        return {
          title: 'Pre-Work Quality Checks',
          description: 'Verify these items before starting work',
          icon: Shield,
          color: 'text-blue-600'
        }
      case 'post_work':
        return {
          title: 'Post-Work Quality Checks',
          description: 'Confirm quality standards after completing work',
          icon: CheckCircle2,
          color: 'text-green-600'
        }
      default:
        return {
          title: 'Quality Checkpoint',
          description: 'Complete all required checks',
          icon: CheckCircle2,
          color: 'text-gray-600'
        }
    }
  }

  const typeInfo = getCheckTypeInfo()
  const TypeIcon = typeInfo.icon
  const completedChecks = Object.values(checkResults).filter(result => result === true).length
  const totalChecks = checkpoint?.checks.length || 0
  const progress = totalChecks > 0 ? (completedChecks / totalChecks) * 100 : 0

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl">
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <TypeIcon className={`h-6 w-6 ${typeInfo.color}`} />
            <div>
              <DialogTitle className="text-xl">{typeInfo.title}</DialogTitle>
              <DialogDescription>{typeInfo.description}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Product and Stage Info */}
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <p className="text-sm text-gray-600">Product</p>
              <p className="font-medium">{productName}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Stage</p>
              <p className="font-medium capitalize">{stage}</p>
            </div>
          </div>

          {/* Progress Bar */}
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-600">Check Progress</span>
              <span className="font-medium">{completedChecks} of {totalChecks}</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Quality Patterns Alert */}
          {patterns.length > 0 && (
            <Alert className="border-orange-200 bg-orange-50">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <AlertDescription>
                <div className="space-y-2">
                  <p className="font-medium text-orange-800">Common Issues at This Stage:</p>
                  {patterns.slice(0, 2).map((pattern, index) => (
                    <div key={index} className="flex items-start gap-2 text-sm">
                      <Lightbulb className="h-3 w-3 text-orange-600 mt-0.5" />
                      <div>
                        <span className="text-orange-700">{pattern.typical_cause}</span>
                        <span className="text-orange-600 ml-2">• Tip: {pattern.prevention_tip}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Quality Checks */}
          <div className="space-y-4">
            {checkpoint?.checks.map((check, index) => (
              <Card key={check.id} className={checkResults[check.id] ? 'border-green-200' : ''}>
                <CardContent className="p-4">
                  <div className="space-y-3">
                    {/* Check Header */}
                    <div className="flex items-start gap-3">
                      <Checkbox
                        id={check.id}
                        checked={checkResults[check.id]}
                        onCheckedChange={(checked) => handleCheckChange(check.id, checked as boolean)}
                        className="mt-1"
                      />
                      <div className="flex-1 space-y-2">
                        <Label htmlFor={check.id} className="text-base font-medium cursor-pointer">
                          {index + 1}. {check.description}
                        </Label>
                        
                        {/* Acceptance Criteria */}
                        <div className="flex items-start gap-2 text-sm text-gray-600">
                          <Info className="h-3 w-3 mt-0.5" />
                          <span>{check.acceptance_criteria}</span>
                        </div>

                        {/* Common Failures */}
                        {check.common_failures.length > 0 && (
                          <div className="flex items-start gap-2 text-sm text-orange-600">
                            <AlertTriangle className="h-3 w-3 mt-0.5" />
                            <span>Watch for: {check.common_failures.join(', ')}</span>
                          </div>
                        )}

                        {/* Requirements */}
                        <div className="flex gap-2 mt-2">
                          {check.requires_photo && (
                            <Button
                              size="sm"
                              variant={photos[check.id] ? "secondary" : "outline"}
                              onClick={() => handlePhotoCapture(check.id)}
                              disabled={submitting}
                            >
                              <Camera className="h-3 w-3 mr-1" />
                              {photos[check.id] ? 'Photo Captured' : 'Take Photo'}
                            </Button>
                          )}
                          
                          {check.requires_measurement && (
                            <div className="flex items-center gap-2">
                              <Ruler className="h-3 w-3 text-gray-500" />
                              <input
                                type="number"
                                step="0.01"
                                placeholder="Measurement"
                                className="w-24 px-2 py-1 text-sm border rounded"
                                value={measurements[check.id] || ''}
                                onChange={(e) => handleMeasurement(check.id, parseFloat(e.target.value))}
                                disabled={submitting}
                              />
                              <span className="text-sm text-gray-500">mm</span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Status Icon */}
                      <div>
                        {checkResults[check.id] ? (
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                        ) : (
                          <XCircle className="h-5 w-5 text-gray-300" />
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Notes Section */}
          <div className="space-y-2">
            <Label htmlFor="notes">Additional Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Add any observations or comments..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              disabled={submitting}
            />
          </div>

          {/* Severity Warning */}
          {checkpoint?.severity === 'critical' && failedChecks.length > 0 && (
            <Alert className="border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                <strong>Critical checkpoint:</strong> Failed checks will prevent task progression.
              </AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="flex justify-between items-center pt-4 border-t">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Clock className="h-4 w-4" />
              <span>Avg. time: 2-3 minutes</span>
            </div>
            
            <div className="flex gap-3">
              <Button variant="outline" onClick={onClose} disabled={submitting}>
                Cancel
              </Button>
              <Button 
                onClick={handleSubmit}
                disabled={submitting || totalChecks === 0}
                className={failedChecks.length > 0 && checkpoint?.on_failure === 'block_progress' 
                  ? 'bg-orange-600 hover:bg-orange-700' 
                  : 'bg-green-600 hover:bg-green-700'
                }
              >
                {submitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Submitting...
                  </>
                ) : (
                  <>
                    {failedChecks.length > 0 ? 'Submit with Issues' : 'Submit & Continue'}
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}