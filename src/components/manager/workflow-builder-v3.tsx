'use client'

import React, { useState, useCallback, useMemo } from 'react'
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult
} from '@hello-pangea/dnd'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import {
  ArrowRight,
  Clock,
  Save,
  Eye,
  Trash2,
  Settings,
  Users,
  Zap,
  AlertCircle,
  CheckCircle,
  XCircle,
  GitBranch,
  ShieldCheck
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

// Enhanced types for v3 quality workflows
interface QualityCheckpoint {
  id: string
  name: string
  type: 'pre_work' | 'in_process' | 'post_work' | 'gate'
  required_checks: string[]
  photo_required: boolean
  measurements_required: boolean
  pass_threshold: number
}

interface ConditionalTransition {
  condition_type: 'quality_pass' | 'quality_fail' | 'quality_score' | 'specific_issue' | 'all_complete'
  operator?: 'equals' | 'greater_than' | 'less_than' | 'contains'
  value?: string | number
  target_stage: string
}

interface EnhancedStage {
  id: string
  stage: string
  name: string
  description?: string
  estimated_hours?: number
  required_skills?: string[]
  is_optional: boolean
  is_automated: boolean
  auto_assign_rule?: 'least_busy' | 'round_robin' | 'specific_worker' | 'manual'
  // V3 additions
  quality_checkpoints?: QualityCheckpoint[]
  conditional_transitions?: ConditionalTransition[]
  quality_requirements?: {
    min_quality_score?: number
    required_certifications?: string[]
    environmental_conditions?: {
      max_temperature?: number
      max_humidity?: number
    }
  }
}

interface EnhancedWorkflowTemplate {
  id?: string
  name: string
  description: string
  trigger_rules: {
    product_types?: string[]
    customer_types?: string[]
    order_tags?: string[]
    priority_levels?: string[]
    manual_only?: boolean
  }
  stages: EnhancedStage[]
  stage_transitions: Array<{
    from_stage: string
    to_stage: string[]
    auto_transition: boolean
    condition?: string
  }>
  quality_gates?: {
    stage: string
    gate_type: 'hold' | 'rework' | 'escalate'
    criteria: Record<string, any>
  }[]
  is_active: boolean
}

// Standard stages with quality checkpoints
const STANDARD_STAGES_V3: EnhancedStage[] = [
  {
    id: 'wood_prep',
    stage: 'wood_prep',
    name: 'Wood Preparation',
    description: 'Prepare and shape wood pieces',
    estimated_hours: 2,
    required_skills: ['wood_working'],
    is_optional: false,
    is_automated: false,
    quality_checkpoints: [
      {
        id: 'wood_moisture',
        name: 'Wood Moisture Check',
        type: 'pre_work',
        required_checks: ['moisture_content', 'grain_inspection'],
        photo_required: true,
        measurements_required: true,
        pass_threshold: 90
      }
    ]
  },
  {
    id: 'initial_qc',
    stage: 'initial_qc',
    name: 'Initial QC Gate',
    description: 'First quality control inspection',
    estimated_hours: 0.5,
    required_skills: ['qc'],
    is_optional: false,
    is_automated: true,
    auto_assign_rule: 'round_robin' as const,
    quality_checkpoints: [
      {
        id: 'visual_inspection',
        name: 'Visual Inspection',
        type: 'gate',
        required_checks: ['surface_quality', 'dimensions', 'color_match'],
        photo_required: true,
        measurements_required: true,
        pass_threshold: 95
      }
    ],
    conditional_transitions: [
      {
        condition_type: 'quality_fail',
        target_stage: 'rework'
      },
      {
        condition_type: 'quality_pass',
        target_stage: 'assembly'
      }
    ]
  },
  {
    id: 'rework',
    stage: 'rework',
    name: 'Rework Station',
    description: 'Fix quality issues identified in QC',
    estimated_hours: 1,
    required_skills: ['wood_working', 'finishing'],
    is_optional: true,
    is_automated: false,
    quality_checkpoints: [
      {
        id: 'rework_complete',
        name: 'Rework Verification',
        type: 'post_work',
        required_checks: ['issue_resolved', 'no_new_defects'],
        photo_required: true,
        measurements_required: false,
        pass_threshold: 100
      }
    ]
  },
  {
    id: 'assembly',
    stage: 'assembly',
    name: 'Assembly',
    description: 'Assemble headphone components',
    estimated_hours: 3,
    required_skills: ['assembly'],
    is_optional: false,
    is_automated: false,
    quality_checkpoints: [
      {
        id: 'assembly_fitment',
        name: 'Component Fitment Check',
        type: 'in_process',
        required_checks: ['driver_alignment', 'seal_integrity', 'hinge_function'],
        photo_required: false,
        measurements_required: true,
        pass_threshold: 98
      }
    ]
  },
  {
    id: 'acoustic_testing',
    stage: 'acoustic_testing',
    name: 'Acoustic Testing',
    description: 'Test audio quality and frequency response',
    estimated_hours: 1,
    required_skills: ['acoustic_testing'],
    is_optional: false,
    is_automated: false,
    quality_checkpoints: [
      {
        id: 'acoustic_performance',
        name: 'Acoustic Performance Test',
        type: 'gate',
        required_checks: ['frequency_response', 'distortion', 'channel_balance'],
        photo_required: false,
        measurements_required: true,
        pass_threshold: 95
      }
    ],
    conditional_transitions: [
      {
        condition_type: 'quality_score',
        operator: 'less_than',
        value: 95,
        target_stage: 'acoustic_rework'
      },
      {
        condition_type: 'quality_score',
        operator: 'greater_than',
        value: 95,
        target_stage: 'final_qc'
      }
    ]
  },
  {
    id: 'final_qc',
    stage: 'final_qc',
    name: 'Final QC',
    description: 'Final quality inspection before packaging',
    estimated_hours: 0.5,
    required_skills: ['qc'],
    is_optional: false,
    is_automated: true,
    auto_assign_rule: 'round_robin' as const,
    quality_checkpoints: [
      {
        id: 'final_inspection',
        name: 'Final Quality Gate',
        type: 'gate',
        required_checks: ['cosmetic', 'functional', 'accessories'],
        photo_required: true,
        measurements_required: false,
        pass_threshold: 100
      }
    ]
  }
]

interface WorkflowBuilderV3Props {
  onSave?: (workflow: EnhancedWorkflowTemplate) => void
  onPreview?: (workflow: EnhancedWorkflowTemplate) => void
  initialWorkflow?: EnhancedWorkflowTemplate
  readOnly?: boolean
}

export function WorkflowBuilderV3({ 
  onSave, 
  onPreview, 
  initialWorkflow,
  readOnly = false 
}: WorkflowBuilderV3Props) {
  const { toast } = useToast()
  
  // Workflow state
  const [workflow, setWorkflow] = useState<EnhancedWorkflowTemplate>(
    initialWorkflow || {
      name: '',
      description: '',
      trigger_rules: { manual_only: true },
      stages: [],
      stage_transitions: [],
      quality_gates: [],
      is_active: false
    }
  )
  
  // UI state
  const [selectedStage, setSelectedStage] = useState<EnhancedStage | null>(null)
  const [showStageSettings, setShowStageSettings] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isPreviewLoading, setIsPreviewLoading] = useState(false)

  // Generate stage transitions with quality-based routing
  const generateTransitions = useCallback((stages: EnhancedStage[]): any[] => {
    const transitions: any[] = []
    
    for (let i = 0; i < stages.length; i++) {
      const currentStage = stages[i]
      
      // If stage has conditional transitions, use those
      if (currentStage.conditional_transitions && currentStage.conditional_transitions.length > 0) {
        currentStage.conditional_transitions.forEach(ct => {
          transitions.push({
            from_stage: currentStage.stage,
            to_stage: [ct.target_stage],
            auto_transition: currentStage.is_automated,
            condition: JSON.stringify(ct)
          })
        })
      } else if (i < stages.length - 1) {
        // Default linear transition
        const nextStage = stages[i + 1]
        transitions.push({
          from_stage: currentStage.stage,
          to_stage: [nextStage.stage],
          auto_transition: currentStage.is_automated,
          condition: 'all_complete'
        })
      }
    }
    
    return transitions
  }, [])

  // Handle drag end for workflow stages
  const handleDragEnd = useCallback((result: DropResult) => {
    if (!result.destination || readOnly) return
    
    const { source, destination, draggableId } = result
    
    if (source.droppableId === 'stage-library' && destination.droppableId === 'workflow-canvas') {
      // Adding a stage from library to workflow
      const stageTemplate = STANDARD_STAGES_V3.find(s => s.id === draggableId)
      if (!stageTemplate) return
      
      // Check if stage already exists
      if (workflow.stages.find(s => s.stage === stageTemplate.stage)) {
        toast({
          title: 'Stage already exists',
          description: `The ${stageTemplate.name} stage is already in this workflow`,
          variant: 'destructive'
        })
        return
      }
      
      const newStage: EnhancedStage = {
        ...stageTemplate,
        id: `${stageTemplate.stage}-${Date.now()}`
      }
      
      const newStages = [...workflow.stages]
      newStages.splice(destination.index, 0, newStage)
      
      const newTransitions = generateTransitions(newStages)
      
      setWorkflow({
        ...workflow,
        stages: newStages,
        stage_transitions: newTransitions
      })
      
      toast({
        title: 'Stage added',
        description: `${newStage.name} has been added to the workflow`
      })
    } else if (source.droppableId === 'workflow-canvas' && destination.droppableId === 'workflow-canvas') {
      // Reordering stages within workflow
      const newStages = [...workflow.stages]
      const [reorderedStage] = newStages.splice(source.index, 1)
      newStages.splice(destination.index, 0, reorderedStage)
      
      const newTransitions = generateTransitions(newStages)
      
      setWorkflow({
        ...workflow,
        stages: newStages,
        stage_transitions: newTransitions
      })
    }
  }, [workflow, readOnly, generateTransitions, toast])

  // Handle stage configuration
  const handleStageUpdate = useCallback((updatedStage: EnhancedStage) => {
    const newStages = workflow.stages.map(stage => 
      stage.id === updatedStage.id ? updatedStage : stage
    )
    
    const newTransitions = generateTransitions(newStages)
    
    setWorkflow({
      ...workflow,
      stages: newStages,
      stage_transitions: newTransitions
    })
    
    setShowStageSettings(false)
    setSelectedStage(null)
  }, [workflow, generateTransitions])

  // Remove stage from workflow
  const removeStage = useCallback((stageId: string) => {
    const newStages = workflow.stages.filter(stage => stage.id !== stageId)
    const newTransitions = generateTransitions(newStages)
    
    setWorkflow({
      ...workflow,
      stages: newStages,
      stage_transitions: newTransitions
    })
    
    toast({
      title: 'Stage removed',
      description: 'Stage has been removed from the workflow'
    })
  }, [workflow, generateTransitions, toast])

  // Calculate workflow statistics with quality metrics
  const workflowStats = useMemo(() => {
    const totalStages = workflow.stages.length
    const automatedStages = workflow.stages.filter(s => s.is_automated).length
    const totalEstimatedHours = workflow.stages.reduce((sum, s) => sum + (s.estimated_hours || 0), 0)
    const qualityGates = workflow.stages.filter(s => 
      s.quality_checkpoints?.some(qc => qc.type === 'gate')
    ).length
    const conditionalPaths = workflow.stages.filter(s => 
      s.conditional_transitions && s.conditional_transitions.length > 0
    ).length
    
    return {
      totalStages,
      automatedStages,
      manualStages: totalStages - automatedStages,
      automationPercentage: totalStages > 0 ? Math.round((automatedStages / totalStages) * 100) : 0,
      totalEstimatedHours,
      qualityGates,
      conditionalPaths
    }
  }, [workflow.stages])

  // Save workflow
  const handleSave = async () => {
    if (!workflow.name.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please enter a workflow name',
        variant: 'destructive'
      })
      return
    }
    
    if (workflow.stages.length === 0) {
      toast({
        title: 'Validation Error',
        description: 'Please add at least one stage to the workflow',
        variant: 'destructive'
      })
      return
    }
    
    setIsSaving(true)
    
    try {
      if (onSave) {
        await onSave(workflow)
        toast({
          title: 'Workflow saved',
          description: `${workflow.name} has been saved successfully`
        })
      }
    } catch (error) {
      console.error('Error saving workflow:', error)
      toast({
        title: 'Save failed',
        description: 'Failed to save workflow. Please try again.',
        variant: 'destructive'
      })
    } finally {
      setIsSaving(false)
    }
  }

  // Preview workflow
  const handlePreview = async () => {
    if (workflow.stages.length === 0) {
      toast({
        title: 'Nothing to preview',
        description: 'Please add stages to preview the workflow',
        variant: 'destructive'
      })
      return
    }
    
    setIsPreviewLoading(true)
    
    try {
      if (onPreview) {
        await onPreview(workflow)
      }
    } catch (error) {
      console.error('Error previewing workflow:', error)
      toast({
        title: 'Preview failed',
        description: 'Failed to generate workflow preview',
        variant: 'destructive'
      })
    } finally {
      setIsPreviewLoading(false)
    }
  }

  // Render workflow path visualization
  const renderWorkflowPath = () => {
    return (
      <div className="flex items-start space-x-4 overflow-x-auto pb-4">
        {workflow.stages.map((stage, index) => (
          <div key={stage.id} className="flex items-start space-x-4">
            <Draggable
              draggableId={stage.id}
              index={index}
              isDragDisabled={readOnly}
            >
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.draggableProps}
                  {...provided.dragHandleProps}
                  className="relative"
                >
                  <Card
                    className={`min-w-64 cursor-grab ${
                      snapshot.isDragging ? 'rotate-2 shadow-lg z-50' : ''
                    }`}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm">{stage.name}</CardTitle>
                        <div className="flex items-center space-x-1">
                          {stage.quality_checkpoints && stage.quality_checkpoints.length > 0 && (
                            <Badge variant="secondary" className="text-xs">
                              <ShieldCheck className="h-3 w-3 mr-1" />
                              {stage.quality_checkpoints.length} QC
                            </Badge>
                          )}
                          {!readOnly && (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setSelectedStage(stage)
                                  setShowStageSettings(true)
                                }}
                              >
                                <Settings className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => removeStage(stage.id)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <p className="text-xs text-gray-500 mb-2">{stage.description}</p>
                      <div className="flex items-center justify-between mb-2">
                        <Badge
                          variant={stage.is_automated ? 'default' : 'outline'}
                          className="text-xs"
                        >
                          {stage.is_automated ? 'Automated' : 'Manual'}
                        </Badge>
                        <span className="text-xs text-gray-500">
                          {stage.estimated_hours}h
                        </span>
                      </div>
                      
                      {/* Quality checkpoints indicators */}
                      {stage.quality_checkpoints && stage.quality_checkpoints.length > 0 && (
                        <div className="space-y-1 mt-2 pt-2 border-t">
                          {stage.quality_checkpoints.map(qc => (
                            <div key={qc.id} className="flex items-center justify-between text-xs">
                              <span className="text-gray-600">{qc.name}</span>
                              <Badge variant="outline" className="text-xs">
                                {qc.type}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                  
                  {/* Conditional paths visualization */}
                  {stage.conditional_transitions && stage.conditional_transitions.length > 1 && (
                    <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2">
                      <GitBranch className="h-4 w-4 text-blue-500" />
                    </div>
                  )}
                </div>
              )}
            </Draggable>
            
            {index < workflow.stages.length - 1 && (
              <div className="flex flex-col items-center justify-center mt-8">
                <ArrowRight className="h-5 w-5 text-gray-400" />
                {stage.conditional_transitions && stage.conditional_transitions.length > 0 && (
                  <div className="text-xs text-gray-500 mt-1">
                    {stage.conditional_transitions.length} paths
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-none border-b bg-white p-4">
        <div className="flex items-center justify-between">
          <div className="flex-1 max-w-xl">
            <Input
              placeholder="Workflow name (e.g., Premium Quality-Driven Build)"
              value={workflow.name}
              onChange={(e) => setWorkflow({ ...workflow, name: e.target.value })}
              disabled={readOnly}
              className="text-lg font-medium"
            />
            <Textarea
              placeholder="Describe when this workflow should be used..."
              value={workflow.description}
              onChange={(e) => setWorkflow({ ...workflow, description: e.target.value })}
              disabled={readOnly}
              className="mt-2"
              rows={2}
            />
          </div>
          
          <div className="flex items-center space-x-2 ml-4">
            {/* Enhanced workflow statistics */}
            <div className="flex items-center space-x-4 text-sm text-gray-600 mr-4">
              <div className="flex items-center space-x-1">
                <Clock className="h-4 w-4" />
                <span>{workflowStats.totalEstimatedHours}h total</span>
              </div>
              <div className="flex items-center space-x-1">
                <Zap className="h-4 w-4" />
                <span>{workflowStats.automationPercentage}% auto</span>
              </div>
              <div className="flex items-center space-x-1">
                <ShieldCheck className="h-4 w-4" />
                <span>{workflowStats.qualityGates} gates</span>
              </div>
              <div className="flex items-center space-x-1">
                <GitBranch className="h-4 w-4" />
                <span>{workflowStats.conditionalPaths} branches</span>
              </div>
            </div>
            
            {!readOnly && (
              <>
                <Button
                  variant="outline"
                  onClick={handlePreview}
                  disabled={isPreviewLoading || workflow.stages.length === 0}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  {isPreviewLoading ? 'Loading...' : 'Preview'}
                </Button>
                
                <Button
                  onClick={handleSave}
                  disabled={isSaving || !workflow.name.trim() || workflow.stages.length === 0}
                >
                  <Save className="h-4 w-4 mr-2" />
                  {isSaving ? 'Saving...' : 'Save Workflow'}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        <DragDropContext onDragEnd={handleDragEnd}>
          {/* Stage Library */}
          <div className="w-80 border-r bg-gray-50 p-4 overflow-y-auto">
            <h3 className="font-medium text-gray-900 mb-4">Quality-Driven Stages</h3>
            
            <Droppable droppableId="stage-library" isDropDisabled={true}>
              {(provided) => (
                <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-2">
                  {STANDARD_STAGES_V3.map((stage, index) => (
                    <Draggable
                      key={stage.id}
                      draggableId={stage.id}
                      index={index}
                      isDragDisabled={readOnly}
                    >
                      {(provided, snapshot) => (
                        <Card
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className={`cursor-grab ${snapshot.isDragging ? 'rotate-2 shadow-lg' : ''} ${
                            workflow.stages.find(s => s.stage === stage.stage) ? 'opacity-50' : ''
                          }`}
                        >
                          <CardContent className="p-3">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h4 className="font-medium text-sm">{stage.name}</h4>
                                <p className="text-xs text-gray-500 mt-1">{stage.description}</p>
                                {stage.quality_checkpoints && stage.quality_checkpoints.length > 0 && (
                                  <div className="flex items-center mt-2 text-xs text-blue-600">
                                    <ShieldCheck className="h-3 w-3 mr-1" />
                                    {stage.quality_checkpoints.length} quality checks
                                  </div>
                                )}
                                {stage.conditional_transitions && stage.conditional_transitions.length > 0 && (
                                  <div className="flex items-center mt-1 text-xs text-purple-600">
                                    <GitBranch className="h-3 w-3 mr-1" />
                                    Conditional routing
                                  </div>
                                )}
                              </div>
                              <div className="flex flex-col items-end space-y-1 ml-2">
                                <Badge
                                  variant={stage.is_automated ? 'default' : 'outline'}
                                  className="text-xs"
                                >
                                  {stage.is_automated ? 'Auto' : 'Manual'}
                                </Badge>
                                <span className="text-xs text-gray-500">{stage.estimated_hours}h</span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </div>

          {/* Workflow Canvas */}
          <div className="flex-1 p-6 overflow-auto">
            <div className="max-w-6xl mx-auto">
              <h3 className="font-medium text-gray-900 mb-4 flex items-center">
                Workflow Design
                {workflow.stages.length > 0 && (
                  <Badge variant="outline" className="ml-2">
                    {workflow.stages.length} stages
                  </Badge>
                )}
              </h3>

              <Droppable droppableId="workflow-canvas" direction="horizontal">
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`min-h-40 border-2 border-dashed rounded-lg p-4 ${
                      snapshot.isDraggingOver
                        ? 'border-blue-300 bg-blue-50'
                        : 'border-gray-300 bg-gray-50'
                    }`}
                  >
                    {workflow.stages.length === 0 ? (
                      <div className="flex items-center justify-center h-32 text-gray-500">
                        <div className="text-center">
                          <div className="text-4xl mb-2">🎯</div>
                          <p className="text-lg font-medium">Drop stages here to build your workflow</p>
                          <p className="text-sm">Create quality-driven production flows with conditional paths</p>
                        </div>
                      </div>
                    ) : (
                      renderWorkflowPath()
                    )}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          </div>
        </DragDropContext>
      </div>

      {/* Enhanced Stage Settings Dialog */}
      {selectedStage && (
        <EnhancedStageSettingsDialog
          stage={selectedStage}
          open={showStageSettings}
          onOpenChange={setShowStageSettings}
          onSave={handleStageUpdate}
          availableStages={workflow.stages.map(s => ({ id: s.stage, name: s.name }))}
        />
      )}
    </div>
  )
}

// Enhanced Stage Settings Dialog with Quality Configuration
interface EnhancedStageSettingsDialogProps {
  stage: EnhancedStage
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (stage: EnhancedStage) => void
  availableStages: Array<{ id: string; name: string }>
}

function EnhancedStageSettingsDialog({ 
  stage, 
  open, 
  onOpenChange, 
  onSave,
  availableStages 
}: EnhancedStageSettingsDialogProps) {
  const [editedStage, setEditedStage] = useState<EnhancedStage>(stage)
  const [activeTab, setActiveTab] = useState('general')

  const handleSave = () => {
    onSave(editedStage)
  }

  const addQualityCheckpoint = () => {
    const newCheckpoint: QualityCheckpoint = {
      id: `qc-${Date.now()}`,
      name: 'New Quality Check',
      type: 'in_process',
      required_checks: [],
      photo_required: false,
      measurements_required: false,
      pass_threshold: 95
    }
    
    setEditedStage({
      ...editedStage,
      quality_checkpoints: [...(editedStage.quality_checkpoints || []), newCheckpoint]
    })
  }

  const addConditionalTransition = () => {
    const newTransition: ConditionalTransition = {
      condition_type: 'quality_pass',
      target_stage: availableStages[0]?.id || ''
    }
    
    setEditedStage({
      ...editedStage,
      conditional_transitions: [...(editedStage.conditional_transitions || []), newTransition]
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configure {stage.name} Stage</DialogTitle>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="quality">Quality Checks</TabsTrigger>
            <TabsTrigger value="routing">Conditional Routing</TabsTrigger>
          </TabsList>
          
          <TabsContent value="general" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="stage-name">Stage Name</Label>
                <Input
                  id="stage-name"
                  value={editedStage.name}
                  onChange={(e) => setEditedStage({ ...editedStage, name: e.target.value })}
                />
              </div>
              
              <div>
                <Label htmlFor="estimated-hours">Estimated Hours</Label>
                <Input
                  id="estimated-hours"
                  type="number"
                  step="0.25"
                  value={editedStage.estimated_hours || ''}
                  onChange={(e) => setEditedStage({ 
                    ...editedStage, 
                    estimated_hours: parseFloat(e.target.value) || 0 
                  })}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="stage-description">Description</Label>
              <Textarea
                id="stage-description"
                value={editedStage.description || ''}
                onChange={(e) => setEditedStage({ ...editedStage, description: e.target.value })}
                placeholder="Describe what happens in this stage..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="is-automated"
                  checked={editedStage.is_automated}
                  onCheckedChange={(checked) => setEditedStage({ 
                    ...editedStage, 
                    is_automated: checked,
                    auto_assign_rule: checked ? 'least_busy' : 'manual'
                  })}
                />
                <Label htmlFor="is-automated">Automated Assignment</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="is-optional"
                  checked={editedStage.is_optional}
                  onCheckedChange={(checked) => setEditedStage({ ...editedStage, is_optional: checked })}
                />
                <Label htmlFor="is-optional">Optional Stage</Label>
              </div>
            </div>

            {editedStage.is_automated && (
              <div>
                <Label htmlFor="assignment-rule">Assignment Rule</Label>
                <Select
                  value={editedStage.auto_assign_rule || 'least_busy'}
                  onValueChange={(value) => setEditedStage({ 
                    ...editedStage, 
                    auto_assign_rule: value as EnhancedStage['auto_assign_rule']
                  })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="least_busy">Least Busy Worker</SelectItem>
                    <SelectItem value="round_robin">Round Robin</SelectItem>
                    <SelectItem value="specific_worker">Specific Worker</SelectItem>
                    <SelectItem value="manual">Manual Assignment</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="quality" className="space-y-4">
            <div className="flex justify-between items-center mb-4">
              <Label>Quality Checkpoints</Label>
              <Button size="sm" onClick={addQualityCheckpoint}>
                Add Checkpoint
              </Button>
            </div>
            
            {editedStage.quality_checkpoints?.map((checkpoint, index) => (
              <Card key={checkpoint.id} className="p-4">
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Checkpoint Name</Label>
                      <Input
                        value={checkpoint.name}
                        onChange={(e) => {
                          const updated = [...(editedStage.quality_checkpoints || [])]
                          updated[index] = { ...checkpoint, name: e.target.value }
                          setEditedStage({ ...editedStage, quality_checkpoints: updated })
                        }}
                      />
                    </div>
                    <div>
                      <Label>Type</Label>
                      <Select
                        value={checkpoint.type}
                        onValueChange={(value) => {
                          const updated = [...(editedStage.quality_checkpoints || [])]
                          updated[index] = { ...checkpoint, type: value as QualityCheckpoint['type'] }
                          setEditedStage({ ...editedStage, quality_checkpoints: updated })
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pre_work">Pre-Work</SelectItem>
                          <SelectItem value="in_process">In-Process</SelectItem>
                          <SelectItem value="post_work">Post-Work</SelectItem>
                          <SelectItem value="gate">Quality Gate</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-3">
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={checkpoint.photo_required}
                        onCheckedChange={(checked) => {
                          const updated = [...(editedStage.quality_checkpoints || [])]
                          updated[index] = { ...checkpoint, photo_required: checked }
                          setEditedStage({ ...editedStage, quality_checkpoints: updated })
                        }}
                      />
                      <Label>Photo Required</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={checkpoint.measurements_required}
                        onCheckedChange={(checked) => {
                          const updated = [...(editedStage.quality_checkpoints || [])]
                          updated[index] = { ...checkpoint, measurements_required: checked }
                          setEditedStage({ ...editedStage, quality_checkpoints: updated })
                        }}
                      />
                      <Label>Measurements</Label>
                    </div>
                    <div>
                      <Label>Pass Threshold</Label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={checkpoint.pass_threshold}
                        onChange={(e) => {
                          const updated = [...(editedStage.quality_checkpoints || [])]
                          updated[index] = { ...checkpoint, pass_threshold: parseInt(e.target.value) || 95 }
                          setEditedStage({ ...editedStage, quality_checkpoints: updated })
                        }}
                      />
                    </div>
                  </div>
                  
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      const updated = editedStage.quality_checkpoints?.filter((_, i) => i !== index) || []
                      setEditedStage({ ...editedStage, quality_checkpoints: updated })
                    }}
                  >
                    Remove Checkpoint
                  </Button>
                </div>
              </Card>
            ))}
          </TabsContent>
          
          <TabsContent value="routing" className="space-y-4">
            <div className="flex justify-between items-center mb-4">
              <Label>Conditional Transitions</Label>
              <Button size="sm" onClick={addConditionalTransition}>
                Add Condition
              </Button>
            </div>
            
            {editedStage.conditional_transitions?.map((transition, index) => (
              <Card key={index} className="p-4">
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Condition Type</Label>
                      <Select
                        value={transition.condition_type}
                        onValueChange={(value) => {
                          const updated = [...(editedStage.conditional_transitions || [])]
                          updated[index] = { ...transition, condition_type: value as ConditionalTransition['condition_type'] }
                          setEditedStage({ ...editedStage, conditional_transitions: updated })
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="quality_pass">Quality Pass</SelectItem>
                          <SelectItem value="quality_fail">Quality Fail</SelectItem>
                          <SelectItem value="quality_score">Quality Score</SelectItem>
                          <SelectItem value="specific_issue">Specific Issue</SelectItem>
                          <SelectItem value="all_complete">All Complete</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Target Stage</Label>
                      <Select
                        value={transition.target_stage}
                        onValueChange={(value) => {
                          const updated = [...(editedStage.conditional_transitions || [])]
                          updated[index] = { ...transition, target_stage: value }
                          setEditedStage({ ...editedStage, conditional_transitions: updated })
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {availableStages.map(s => (
                            <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  {(transition.condition_type === 'quality_score' || transition.condition_type === 'specific_issue') && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Operator</Label>
                        <Select
                          value={transition.operator || 'equals'}
                          onValueChange={(value) => {
                            const updated = [...(editedStage.conditional_transitions || [])]
                            updated[index] = { ...transition, operator: value as ConditionalTransition['operator'] }
                            setEditedStage({ ...editedStage, conditional_transitions: updated })
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="equals">Equals</SelectItem>
                            <SelectItem value="greater_than">Greater Than</SelectItem>
                            <SelectItem value="less_than">Less Than</SelectItem>
                            <SelectItem value="contains">Contains</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Value</Label>
                        <Input
                          value={transition.value || ''}
                          onChange={(e) => {
                            const updated = [...(editedStage.conditional_transitions || [])]
                            updated[index] = { ...transition, value: e.target.value }
                            setEditedStage({ ...editedStage, conditional_transitions: updated })
                          }}
                        />
                      </div>
                    </div>
                  )}
                  
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      const updated = editedStage.conditional_transitions?.filter((_, i) => i !== index) || []
                      setEditedStage({ ...editedStage, conditional_transitions: updated })
                    }}
                  >
                    Remove Condition
                  </Button>
                </div>
              </Card>
            ))}
          </TabsContent>
        </Tabs>

        <div className="flex justify-end space-x-2 pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}