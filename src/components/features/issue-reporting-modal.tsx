'use client'

import { useState, useEffect, useCallback } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useToast } from '@/hooks/use-toast'
import { 
  AlertTriangle, 
  Camera, 
  X, 
  Upload, 
  Workflow, 
  Clock, 
  User, 
  Package,
  Zap,
  History,
  CheckCircle,
  XCircle
} from 'lucide-react'

interface Task {
  id: string
  task_description: string
  stage: string
  status: string
  batch_id?: string
  order_item_id?: string
  batch?: {
    id: string
    name: string
    workflow_template?: {
      id: string
      name: string
      stages: any[]
    }
  }
  order_item?: {
    id: string
    product_name: string
    order?: {
      order_number: string
    }
  }
}

interface PreviousIssue {
  id: string
  title: string
  description: string
  severity: string
  resolution_status: string
  created_at: string
  resolved_at?: string
}

interface IssueTemplate {
  title: string
  description: string
  type: string
  severity: string
}

interface IssueReportingModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  task?: Task
  batchId?: string
  orderItemId?: string
  stage?: string
  workflowContext?: {
    workflowName: string
    currentStage: string
    nextStages: string[]
  }
}

const ISSUE_TYPES = [
  { value: 'defect', label: 'Product Defect', icon: '🔍' },
  { value: 'material', label: 'Material Issue', icon: '🪵' },
  { value: 'tooling', label: 'Tool/Equipment', icon: '🔨' },
  { value: 'process', label: 'Process Problem', icon: '⚙️' },
  { value: 'other', label: 'Other', icon: '❓' }
]

const SEVERITY_LEVELS = [
  { 
    value: 'low', 
    label: 'Low', 
    color: 'bg-green-100 text-green-800',
    description: 'Minor issue, can be addressed later' 
  },
  { 
    value: 'medium', 
    label: 'Medium', 
    color: 'bg-yellow-100 text-yellow-800',
    description: 'Needs attention, may delay work' 
  },
  { 
    value: 'high', 
    label: 'High', 
    color: 'bg-orange-100 text-orange-800',
    description: 'Urgent, blocks current work' 
  },
  { 
    value: 'critical', 
    label: 'Critical', 
    color: 'bg-red-100 text-red-800',
    description: 'Critical failure, immediate action required' 
  }
]

// Stage-specific issue templates
const STAGE_TEMPLATES: Record<string, IssueTemplate[]> = {
  sanding: [
    {
      title: 'Wood grain issue',
      description: 'Unexpected grain pattern or wood defect discovered during sanding',
      type: 'material',
      severity: 'medium'
    },
    {
      title: 'Sandpaper wear',
      description: 'Sandpaper wearing out quickly or not achieving desired finish',
      type: 'tooling',
      severity: 'low'
    },
    {
      title: 'Surface imperfection',
      description: 'Scratches, gouges, or other surface damage found',
      type: 'defect',
      severity: 'high'
    }
  ],
  finishing: [
    {
      title: 'UV coating bubbles',
      description: 'Bubbles or uneven coating application',
      type: 'process',
      severity: 'high'
    },
    {
      title: 'Curing issue',
      description: 'UV coating not curing properly under lights',
      type: 'tooling',
      severity: 'medium'
    }
  ],
  assembly: [
    {
      title: 'Component fit issue',
      description: 'Parts not fitting together as expected',
      type: 'defect',
      severity: 'high'
    },
    {
      title: 'Missing hardware',
      description: 'Required screws, washers, or other hardware missing',
      type: 'material',
      severity: 'medium'
    }
  ],
  initial_qc: [
    {
      title: 'Dimensional variance',
      description: 'Measurements outside acceptable tolerances',
      type: 'defect',
      severity: 'high'
    },
    {
      title: 'Visual defect',
      description: 'Cosmetic issue that affects product quality',
      type: 'defect',
      severity: 'medium'
    }
  ],
  acoustic_testing: [
    {
      title: 'Frequency response issue',
      description: 'Audio measurements outside specification',
      type: 'defect',
      severity: 'critical'
    },
    {
      title: 'Testing equipment malfunction',
      description: 'Calibration or equipment issue affecting measurements',
      type: 'tooling',
      severity: 'high'
    }
  ]
}

export function IssueReportingModal({
  open,
  onOpenChange,
  task,
  batchId,
  orderItemId,
  stage,
  workflowContext
}: IssueReportingModalProps) {
  const { toast } = useToast()
  
  // Form state
  const [issueType, setIssueType] = useState('')
  const [severity, setSeverity] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [images, setImages] = useState<File[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Context state
  const [previousIssues, setPreviousIssues] = useState<PreviousIssue[]>([])
  const [loadingPrevious, setLoadingPrevious] = useState(false)
  const [stageTemplates, setStageTemplates] = useState<IssueTemplate[]>([])
  
  // Determine context from props
  const contextStage = stage || task?.stage || workflowContext?.currentStage || ''
  const contextBatchId = batchId || task?.batch_id
  const contextOrderItemId = orderItemId || task?.order_item_id
  const contextWorkflow = workflowContext || (task?.batch?.workflow_template ? {
    workflowName: task.batch.workflow_template.name,
    currentStage: contextStage,
    nextStages: []
  } : undefined)

  // Load previous issues for this stage
  const loadPreviousIssues = useCallback(async () => {
    if (!contextStage || !open) return
    
    setLoadingPrevious(true)
    try {
      const response = await fetch(`/api/issues/by-stage/${contextStage}`)
      if (response.ok) {
        const issues = await response.json()
        setPreviousIssues(issues.slice(0, 5)) // Show last 5
      }
    } catch (error) {
      console.error('Error loading previous issues:', error)
    } finally {
      setLoadingPrevious(false)
    }
  }, [contextStage, open])

  // Load stage-specific templates
  useEffect(() => {
    if (contextStage && STAGE_TEMPLATES[contextStage]) {
      setStageTemplates(STAGE_TEMPLATES[contextStage])
    } else {
      setStageTemplates([])
    }
  }, [contextStage])

  // Load previous issues when modal opens
  useEffect(() => {
    if (open) {
      loadPreviousIssues()
    }
  }, [open, loadPreviousIssues])

  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      setIssueType('')
      setSeverity('')
      setTitle('')
      setDescription('')
      setImages([])
      setPreviousIssues([])
      setStageTemplates([])
    }
  }, [open])

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    if (files.length + images.length > 5) {
      toast({
        title: 'Too many images',
        description: 'Maximum 5 images allowed per issue',
        variant: 'destructive'
      })
      return
    }
    setImages(prev => [...prev, ...files])
  }

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index))
  }

  const applyTemplate = (template: IssueTemplate) => {
    setTitle(template.title)
    setDescription(template.description)
    setIssueType(template.type)
    setSeverity(template.severity)
    toast({
      title: 'Template applied',
      description: 'You can modify the details as needed'
    })
  }

  const handleSubmit = async () => {
    if (!issueType || !severity || !title.trim() || !description.trim()) {
      toast({
        title: 'Missing information',
        description: 'Please fill in all required fields',
        variant: 'destructive'
      })
      return
    }

    setIsSubmitting(true)
    
    try {
      // Upload images first if any
      const imageUrls: string[] = []
      if (images.length > 0) {
        // TODO: Implement image upload to storage
        // For now, we'll just use placeholder URLs
        images.forEach((_, index) => {
          imageUrls.push(`/api/placeholder-image-${Date.now()}-${index}`)
        })
      }

      const response = await fetch('/api/issues/report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          task_id: task?.id,
          batch_id: contextBatchId,
          order_item_id: contextOrderItemId,
          stage: contextStage,
          issue_type: issueType,
          severity,
          title,
          description,
          image_urls: imageUrls
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to report issue')
      }

      const result = await response.json()

      toast({
        title: 'Issue reported successfully',
        description: `Issue #${result.id} has been created and logged`
      })

      onOpenChange(false)
    } catch (error) {
      toast({
        title: 'Failed to report issue',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Report Production Issue
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Context Information */}
            {(contextWorkflow || task || contextStage) && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Workflow className="h-4 w-4" />
                    Context
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {contextWorkflow && (
                    <div className="flex items-center gap-2 text-sm">
                      <Zap className="h-3 w-3" />
                      <span className="font-medium">Workflow:</span>
                      <span>{contextWorkflow.workflowName}</span>
                    </div>
                  )}
                  {contextStage && (
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-3 w-3" />
                      <span className="font-medium">Stage:</span>
                      <Badge variant="outline">{contextStage.replace(/_/g, ' ')}</Badge>
                    </div>
                  )}
                  {task?.batch && (
                    <div className="flex items-center gap-2 text-sm">
                      <Package className="h-3 w-3" />
                      <span className="font-medium">Batch:</span>
                      <span>{task.batch.name}</span>
                    </div>
                  )}
                  {task?.order_item && (
                    <div className="flex items-center gap-2 text-sm">
                      <User className="h-3 w-3" />
                      <span className="font-medium">Product:</span>
                      <span>{task.order_item.product_name}</span>
                      {task.order_item.order && (
                        <span className="text-muted-foreground">
                          (Order #{task.order_item.order.order_number})
                        </span>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Issue Details Form */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="issue-type">Issue Type</Label>
                  <Select value={issueType} onValueChange={setIssueType}>
                    <SelectTrigger id="issue-type">
                      <SelectValue placeholder="Select issue type" />
                    </SelectTrigger>
                    <SelectContent>
                      {ISSUE_TYPES.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          <div className="flex items-center gap-2">
                            <span>{type.icon}</span>
                            <span>{type.label}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="severity">Severity</Label>
                  <Select value={severity} onValueChange={setSeverity}>
                    <SelectTrigger id="severity">
                      <SelectValue placeholder="Select severity" />
                    </SelectTrigger>
                    <SelectContent>
                      {SEVERITY_LEVELS.map(level => (
                        <SelectItem key={level.value} value={level.value}>
                          <div className="flex items-center justify-between w-full">
                            <span>{level.label}</span>
                            <Badge className={level.color} variant="secondary">
                              {level.label}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {severity && (
                    <p className="text-xs text-muted-foreground">
                      {SEVERITY_LEVELS.find(l => l.value === severity)?.description}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">Issue Title</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Brief description of the issue"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Detailed Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Provide detailed information about the issue, what you observed, and any steps taken..."
                  rows={4}
                />
              </div>

              {/* Image Upload */}
              <div className="space-y-2">
                <Label>Photos (Optional)</Label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                  <div className="text-center">
                    <Camera className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                    <p className="text-sm text-gray-500 mb-2">
                      Add photos to help explain the issue
                    </p>
                    <Input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageUpload}
                      className="hidden"
                      id="image-upload"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => document.getElementById('image-upload')?.click()}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Choose Photos
                    </Button>
                  </div>
                  
                  {images.length > 0 && (
                    <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {images.map((file, index) => (
                        <div key={index} className="relative">
                          <img
                            src={URL.createObjectURL(file)}
                            alt={`Preview ${index + 1}`}
                            className="w-full h-20 object-cover rounded border"
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            className="absolute -top-2 -right-2 h-6 w-6 p-0"
                            onClick={() => removeImage(index)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting || !issueType || !severity || !title.trim() || !description.trim()}
              >
                {isSubmitting ? 'Reporting...' : 'Report Issue'}
              </Button>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Quick Templates */}
            {stageTemplates.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Common Issues for {contextStage?.replace(/_/g, ' ')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {stageTemplates.map((template, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      className="w-full text-left justify-start h-auto p-3"
                      onClick={() => applyTemplate(template)}
                    >
                      <div>
                        <div className="font-medium text-sm">{template.title}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {template.description}
                        </div>
                      </div>
                    </Button>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Previous Issues */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <History className="h-4 w-4" />
                  Recent Issues in {contextStage?.replace(/_/g, ' ')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingPrevious ? (
                  <div className="text-center text-sm text-muted-foreground">
                    Loading...
                  </div>
                ) : previousIssues.length > 0 ? (
                  <div className="space-y-2">
                    {previousIssues.map((issue) => (
                      <div key={issue.id} className="p-2 border rounded text-xs">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium">{issue.title}</span>
                          {issue.resolution_status === 'resolved' ? (
                            <CheckCircle className="h-3 w-3 text-green-500" />
                          ) : (
                            <XCircle className="h-3 w-3 text-orange-500" />
                          )}
                        </div>
                        <p className="text-muted-foreground">{issue.description}</p>
                        <div className="flex justify-between mt-1">
                          <Badge variant="outline" className="text-xs">
                            {issue.severity}
                          </Badge>
                          <span className="text-muted-foreground">
                            {new Date(issue.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-sm text-muted-foreground">
                    No recent issues in this stage
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Help */}
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                For critical issues that stop production, contact your supervisor immediately. 
                This form will also send notifications to relevant team members.
              </AlertDescription>
            </Alert>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
} 