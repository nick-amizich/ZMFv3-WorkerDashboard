'use client'

import { useState, useCallback, useMemo } from 'react'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { 
  Plus, 
  Settings, 
  Save, 
  Play, 
  Trash2, 
  ArrowRight, 
  Clock,
  Users,
  Zap,
  Eye
} from 'lucide-react'

interface Stage {
  id: string
  stage: string
  name: string
  description?: string
  estimated_hours?: number
  required_skills: string[]
  is_optional: boolean
  is_automated: boolean
  auto_assign_rule?: 'least_busy' | 'round_robin' | 'specific_worker' | 'manual'
}

interface StageTransition {
  from_stage: string
  to_stage: string[]
  condition?: 'all_complete' | 'any_complete' | 'manual_approval'
  auto_transition: boolean
}

interface WorkflowTemplate {
  id?: string
  name: string
  description: string
  trigger_rules: {
    product_matches?: {
      model?: string[]
      wood_type?: string[]
      sku_pattern?: string
    }
    manual_only?: boolean
  }
  stages: Stage[]
  stage_transitions: StageTransition[]
  is_active: boolean
}

const STANDARD_STAGES = [
  {
    id: 'sanding',
    stage: 'sanding',
    name: 'Sanding',
    description: 'Sand wood components to smooth finish',
    estimated_hours: 2,
    required_skills: ['sanding', 'woodworking'],
    is_optional: false,
    is_automated: true,
    auto_assign_rule: 'least_busy' as const
  },
  {
    id: 'finishing',
    stage: 'finishing',
    name: 'UV Coating',
    description: 'Apply protective UV coating',
    estimated_hours: 1.5,
    required_skills: ['finishing'],
    is_optional: false,
    is_automated: true,
    auto_assign_rule: 'least_busy' as const
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
    auto_assign_rule: 'manual' as const
  },
  {
    id: 'initial_qc',
    stage: 'initial_qc',
    name: 'Initial QC',
    description: 'First quality control inspection',
    estimated_hours: 0.5,
    required_skills: ['qc'],
    is_optional: false,
    is_automated: true,
    auto_assign_rule: 'round_robin' as const
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
    auto_assign_rule: 'manual' as const
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
    auto_assign_rule: 'round_robin' as const
  },
  {
    id: 'packaging',
    stage: 'packaging',
    name: 'Packaging',
    description: 'Package finished product',
    estimated_hours: 0.5,
    required_skills: ['packaging'],
    is_optional: false,
    is_automated: true,
    auto_assign_rule: 'least_busy' as const
  },
  {
    id: 'shipping',
    stage: 'shipping',
    name: 'Shipping',
    description: 'Prepare for shipment',
    estimated_hours: 0.25,
    required_skills: ['shipping'],
    is_optional: false,
    is_automated: true,
    auto_assign_rule: 'least_busy' as const
  }
]

interface WorkflowBuilderProps {
  onSave?: (workflow: WorkflowTemplate) => void
  onPreview?: (workflow: WorkflowTemplate) => void
  initialWorkflow?: WorkflowTemplate
  readOnly?: boolean
}

export function WorkflowBuilder({ 
  onSave, 
  onPreview, 
  initialWorkflow,
  readOnly = false 
}: WorkflowBuilderProps) {
  const { toast } = useToast()
  
  // Workflow state
  const [workflow, setWorkflow] = useState<WorkflowTemplate>(
    initialWorkflow || {
      name: '',
      description: '',
      trigger_rules: { manual_only: true },
      stages: [],
      stage_transitions: [],
      is_active: false
    }
  )
  
  // UI state
  const [selectedStage, setSelectedStage] = useState<Stage | null>(null)
  const [showStageSettings, setShowStageSettings] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isPreviewLoading, setIsPreviewLoading] = useState(false)

  // Generate stage transitions automatically based on stage order
  const generateTransitions = useCallback((stages: Stage[]): StageTransition[] => {
    const transitions: StageTransition[] = []
    
    for (let i = 0; i < stages.length - 1; i++) {
      const currentStage = stages[i]
      const nextStage = stages[i + 1]
      
      transitions.push({
        from_stage: currentStage.stage,
        to_stage: [nextStage.stage],
        auto_transition: currentStage.is_automated,
        condition: 'all_complete'
      })
    }
    
    return transitions
  }, [])

  // Handle drag end for workflow stages
  const handleDragEnd = useCallback((result: DropResult) => {
    if (!result.destination || readOnly) return
    
    const { source, destination, draggableId } = result
    
    if (source.droppableId === 'stage-library' && destination.droppableId === 'workflow-canvas') {
      // Adding a stage from library to workflow
      const stageTemplate = STANDARD_STAGES.find(s => s.id === draggableId)
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
      
      const newStage: Stage = {
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
  const handleStageUpdate = useCallback((updatedStage: Stage) => {
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

  // Calculate workflow statistics
  const workflowStats = useMemo(() => {
    const totalStages = workflow.stages.length
    const automatedStages = workflow.stages.filter(s => s.is_automated).length
    const totalEstimatedHours = workflow.stages.reduce((sum, s) => sum + (s.estimated_hours || 0), 0)
    
    return {
      totalStages,
      automatedStages,
      manualStages: totalStages - automatedStages,
      automationPercentage: totalStages > 0 ? Math.round((automatedStages / totalStages) * 100) : 0,
      totalEstimatedHours
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

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-none border-b bg-white p-4">
        <div className="flex items-center justify-between">
          <div className="flex-1 max-w-xl">
            <Input
              placeholder="Workflow name (e.g., Premium Headphone Build)"
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
            {/* Workflow Statistics */}
            <div className="flex items-center space-x-4 text-sm text-gray-600 mr-4">
              <div className="flex items-center space-x-1">
                <Clock className="h-4 w-4" />
                <span>{workflowStats.totalEstimatedHours}h total</span>
              </div>
              <div className="flex items-center space-x-1">
                <Zap className="h-4 w-4" />
                <span>{workflowStats.automationPercentage}% automated</span>
              </div>
              <div className="flex items-center space-x-1">
                <Users className="h-4 w-4" />
                <span>{workflowStats.totalStages} stages</span>
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
            <h3 className="font-medium text-gray-900 mb-4">Stage Library</h3>
            
            <Droppable droppableId="stage-library" isDropDisabled={true}>
              {(provided) => (
                <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-2">
                  {STANDARD_STAGES.map((stage, index) => (
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
                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className="font-medium text-sm">{stage.name}</h4>
                                <p className="text-xs text-gray-500 mt-1">{stage.description}</p>
                              </div>
                              <div className="flex flex-col items-end space-y-1">
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
            <div className="max-w-4xl mx-auto">
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
                          <p className="text-sm">Drag stages from the library to create your custom production flow</p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-4 overflow-x-auto pb-4">
                        {workflow.stages.map((stage, index) => (
                          <div key={stage.id} className="flex items-center space-x-4">
                            <Draggable
                              draggableId={stage.id}
                              index={index}
                              isDragDisabled={readOnly}
                            >
                              {(provided, snapshot) => (
                                <Card
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  className={`min-w-64 cursor-grab ${
                                    snapshot.isDragging ? 'rotate-2 shadow-lg z-50' : ''
                                  }`}
                                >
                                  <CardHeader className="pb-2">
                                    <div className="flex items-center justify-between">
                                      <CardTitle className="text-sm">{stage.name}</CardTitle>
                                      <div className="flex items-center space-x-1">
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
                                    <div className="flex items-center justify-between">
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
                                  </CardContent>
                                </Card>
                              )}
                            </Draggable>
                            
                            {index < workflow.stages.length - 1 && (
                              <ArrowRight className="h-5 w-5 text-gray-400 flex-none" />
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          </div>
        </DragDropContext>
      </div>

      {/* Stage Settings Dialog */}
      {selectedStage && (
        <StageSettingsDialog
          stage={selectedStage}
          open={showStageSettings}
          onOpenChange={setShowStageSettings}
          onSave={handleStageUpdate}
        />
      )}
    </div>
  )
}

// Stage Settings Dialog Component
interface StageSettingsDialogProps {
  stage: Stage
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (stage: Stage) => void
}

function StageSettingsDialog({ stage, open, onOpenChange, onSave }: StageSettingsDialogProps) {
  const [editedStage, setEditedStage] = useState<Stage>(stage)

  const handleSave = () => {
    onSave(editedStage)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Configure {stage.name} Stage</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 mt-4">
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
                  auto_assign_rule: value as Stage['auto_assign_rule']
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

          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              Save Changes
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
} 