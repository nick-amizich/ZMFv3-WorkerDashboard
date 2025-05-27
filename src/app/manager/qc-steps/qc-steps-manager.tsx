'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { Trash2, Plus, GripVertical, Edit2, Save, X, List, Loader2, Database } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import {
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

interface ProductionStep {
  value: string
  label: string
}

interface ChecklistItem {
  id?: string
  item_text: string
  sort_order?: number
}

interface QCStepsManagerProps {
  initialSteps: ProductionStep[]
}

interface SortableStepItemProps {
  step: ProductionStep
  index: number
  editingId: string | null
  editingValues: { value: string; label: string }
  onEditStart: (step: ProductionStep) => void
  onEditSave: () => void
  onEditCancel: () => void
  onDelete: (value: string) => void
  onEditValueChange: (value: string) => void
  onEditLabelChange: (value: string) => void
  onEditChecklist: (step: ProductionStep) => void
}

interface SortableChecklistItemProps {
  item: ChecklistItem
  index: number
  onDelete: (index: number) => void
  onEdit: (index: number, text: string) => void
}

function SortableChecklistItem({ item, index, onDelete, onEdit }: SortableChecklistItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `checklist-${index}` })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div 
      ref={setNodeRef}
      style={style}
      className={`flex items-start gap-3 p-3 border rounded-lg bg-background ${
        isDragging ? 'opacity-50' : ''
      }`}
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing mt-1"
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>
      
      <div className="flex-1">
        <Textarea
          value={item.item_text}
          onChange={(e) => onEdit(index, e.target.value)}
          className="min-h-[60px] text-sm"
          placeholder="Enter checklist item..."
        />
      </div>
      
      <Button 
        size="sm" 
        variant="outline"
        onClick={() => onDelete(index)}
        className="text-red-600 hover:text-red-700 mt-1"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  )
}

function SortableStepItem({ 
  step, 
  editingId, 
  editingValues, 
  onEditStart, 
  onEditSave, 
  onEditCancel, 
  onDelete,
  onEditValueChange,
  onEditLabelChange,
  onEditChecklist
}: SortableStepItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: step.value })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div 
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 p-4 border rounded-lg bg-card ${
        isDragging ? 'opacity-50' : ''
      }`}
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing"
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>
      
      {editingId === step.value ? (
        <>
          <div className="flex-1 grid grid-cols-2 gap-3">
            <Input
              value={editingValues.value}
              onChange={(e) => onEditValueChange(e.target.value)}
              placeholder="Step value"
            />
            <Input
              value={editingValues.label}
              onChange={(e) => onEditLabelChange(e.target.value)}
              placeholder="Display label"
            />
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={onEditSave}>
              <Save className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="outline" onClick={onEditCancel}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </>
      ) : (
        <>
          <div className="flex-1">
            <div className="font-medium">{step.label}</div>
            <div className="text-sm text-muted-foreground">{step.value}</div>
          </div>
          <div className="flex gap-2">
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => onEditChecklist(step)}
              className="text-blue-600 hover:text-blue-700"
            >
              <List className="h-4 w-4" />
            </Button>
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => onEditStart(step)}
            >
              <Edit2 className="h-4 w-4" />
            </Button>
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => onDelete(step.value)}
              className="text-red-600 hover:text-red-700"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </>
      )}
    </div>
  )
}

export function QCStepsManager({ initialSteps }: QCStepsManagerProps) {
  const [steps, setSteps] = useState<ProductionStep[]>(initialSteps)
  const [newStep, setNewStep] = useState({ value: '', label: '' })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingValues, setEditingValues] = useState({ value: '', label: '' })
  const [isSaving, setIsSaving] = useState(false)
  const [isLoadingSteps, setIsLoadingSteps] = useState(false)
  const [isPopulatingChecklists, setIsPopulatingChecklists] = useState(false)
  
  // Checklist editing state
  const [checklistDialogOpen, setChecklistDialogOpen] = useState(false)
  const [currentStep, setCurrentStep] = useState<ProductionStep | null>(null)
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([])
  const [isLoadingChecklist, setIsLoadingChecklist] = useState(false)
  const [isSavingChecklist, setIsSavingChecklist] = useState(false)
  
  const { toast } = useToast()

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Load current steps from database on component mount
  useEffect(() => {
    loadCurrentSteps()
  }, [])

  const loadCurrentSteps = async () => {
    setIsLoadingSteps(true)
    try {
      const response = await fetch('/api/settings/qc-steps')
      if (!response.ok) {
        throw new Error('Failed to load steps')
      }
      const data = await response.json()
      setSteps(data.steps || [])
    } catch (error) {
      console.error('Error loading current steps:', error)
      // Keep the initial steps if loading fails
      toast({
        title: 'Warning',
        description: 'Could not load current steps from database. Showing initial state.',
        variant: 'destructive'
      })
    } finally {
      setIsLoadingSteps(false)
    }
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (active.id !== over?.id) {
      setSteps((items) => {
        const oldIndex = items.findIndex(item => item.value === active.id)
        const newIndex = items.findIndex(item => item.value === over?.id)

        const newSteps = arrayMove(items, oldIndex, newIndex)
        
        // Use setTimeout to avoid state update during render
        setTimeout(() => {
          toast({
            title: 'Steps Reordered',
            description: 'Production steps have been reordered. Don\'t forget to save!',
          })
        }, 0)
        
        return newSteps
      })
    }
  }

  const handleChecklistDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (active.id !== over?.id) {
      setChecklistItems((items) => {
        const oldIndex = items.findIndex((_, i) => `checklist-${i}` === active.id)
        const newIndex = items.findIndex((_, i) => `checklist-${i}` === over?.id)

        return arrayMove(items, oldIndex, newIndex)
      })
    }
  }

  const loadChecklistItems = async (step: ProductionStep) => {
    setIsLoadingChecklist(true)
    try {
      const response = await fetch(`/api/settings/qc-steps/${encodeURIComponent(step.value)}/checklist`)
      if (!response.ok) {
        throw new Error('Failed to load checklist items')
      }
      const data = await response.json()
      setChecklistItems(data.items || [])
    } catch (error) {
      console.error('Error loading checklist items:', error)
      toast({
        title: 'Error',
        description: 'Failed to load checklist items.',
        variant: 'destructive'
      })
    } finally {
      setIsLoadingChecklist(false)
    }
  }

  const handleEditChecklist = async (step: ProductionStep) => {
    setCurrentStep(step)
    setChecklistDialogOpen(true)
    await loadChecklistItems(step)
  }

  const handleAddChecklistItem = () => {
    setChecklistItems(prev => [...prev, { item_text: '' }])
  }

  const handleDeleteChecklistItem = (index: number) => {
    setChecklistItems(prev => prev.filter((_, i) => i !== index))
  }

  const handleEditChecklistItem = (index: number, text: string) => {
    setChecklistItems(prev => prev.map((item, i) => 
      i === index ? { ...item, item_text: text } : item
    ))
  }

  const handleSaveChecklist = async () => {
    if (!currentStep) return

    // Filter out empty items
    const validItems = checklistItems.filter(item => item.item_text.trim())

    setIsSavingChecklist(true)
    try {
      const response = await fetch(`/api/settings/qc-steps/${encodeURIComponent(currentStep.value)}/checklist`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ items: validItems }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to save')
      }

      toast({
        title: 'Success!',
        description: 'Checklist items saved successfully.',
      })
      setChecklistDialogOpen(false)
    } catch (error) {
      console.error('Error saving checklist items:', error)
      toast({
        title: 'Error',
        description: 'Failed to save checklist items. Please try again.',
        variant: 'destructive'
      })
    } finally {
      setIsSavingChecklist(false)
    }
  }

  const handleAddStep = () => {
    if (!newStep.value || !newStep.label) {
      toast({
        title: 'Invalid Input',
        description: 'Both value and label are required.',
        variant: 'destructive'
      })
      return
    }

    // Check for duplicate values
    if (steps.some(step => step.value === newStep.value)) {
      toast({
        title: 'Duplicate Value',
        description: 'A step with this value already exists.',
        variant: 'destructive'
      })
      return
    }

    setSteps(prev => [...prev, { ...newStep }])
    setNewStep({ value: '', label: '' })
    toast({
      title: 'Step Added',
      description: 'New production step added successfully.',
    })
  }

  const handleDeleteStep = (valueToDelete: string) => {
    setSteps(prev => prev.filter(step => step.value !== valueToDelete))
    toast({
      title: 'Step Deleted',
      description: 'Production step removed successfully.',
    })
  }

  const handleEditStart = (step: ProductionStep) => {
    setEditingId(step.value)
    setEditingValues({ value: step.value, label: step.label })
  }

  const handleEditSave = () => {
    if (!editingValues.value || !editingValues.label) {
      toast({
        title: 'Invalid Input',
        description: 'Both value and label are required.',
        variant: 'destructive'
      })
      return
    }

    // Check for duplicate values (excluding the current item)
    if (steps.some(step => step.value === editingValues.value && step.value !== editingId)) {
      toast({
        title: 'Duplicate Value',
        description: 'A step with this value already exists.',
        variant: 'destructive'
      })
      return
    }

    setSteps(prev => prev.map(step => 
      step.value === editingId 
        ? { value: editingValues.value, label: editingValues.label }
        : step
    ))
    setEditingId(null)
    setEditingValues({ value: '', label: '' })
    toast({
      title: 'Step Updated',
      description: 'Production step updated successfully.',
    })
  }

  const handleEditCancel = () => {
    setEditingId(null)
    setEditingValues({ value: '', label: '' })
  }

  const handleSaveToDatabase = async () => {
    setIsSaving(true)
    try {
      const response = await fetch('/api/settings/qc-steps', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ steps }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to save')
      }

      toast({
        title: 'Success!',
        description: 'Production steps saved successfully.',
      })
      
      // Reload steps from database to ensure we're in sync
      await loadCurrentSteps()
    } catch (error) {
      console.error('Error saving steps:', error)
      toast({
        title: 'Error',
        description: 'Failed to save production steps. Please try again.',
        variant: 'destructive'
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handlePopulateChecklists = async () => {
    setIsPopulatingChecklists(true)
    try {
      const response = await fetch('/api/admin/populate-qc-checklists', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to populate checklists')
      }

      const data = await response.json()
      
      toast({
        title: 'Success!',
        description: `Populated ${data.totalItems} checklist items across ${data.stepsProcessed} production steps.`,
      })
    } catch (error) {
      console.error('Error populating checklists:', error)
      toast({
        title: 'Error',
        description: 'Failed to populate checklist items. Please try again.',
        variant: 'destructive'
      })
    } finally {
      setIsPopulatingChecklists(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Checklist Editor Dialog */}
      <Dialog open={checklistDialogOpen} onOpenChange={setChecklistDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Checklist Items</DialogTitle>
            <DialogDescription>
              Customize the checklist items for: <strong>{currentStep?.label}</strong>
            </DialogDescription>
          </DialogHeader>
          
          {isLoadingChecklist ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="ml-2">Loading checklist items...</span>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <Label className="text-base font-medium">Checklist Items</Label>
                <Button onClick={handleAddChecklistItem} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Item
                </Button>
              </div>
              
              {checklistItems.length === 0 ? (
                <Alert>
                  <AlertDescription>
                    No checklist items defined. Click "Add Item" to get started.
                  </AlertDescription>
                </Alert>
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleChecklistDragEnd}
                >
                  <SortableContext 
                    items={checklistItems.map((_, i) => `checklist-${i}`)} 
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-3">
                      {checklistItems.map((item, index) => (
                        <SortableChecklistItem
                          key={`checklist-${index}`}
                          item={item}
                          index={index}
                          onDelete={handleDeleteChecklistItem}
                          onEdit={handleEditChecklistItem}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              )}
              
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setChecklistDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleSaveChecklist} 
                  disabled={isSavingChecklist}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {isSavingChecklist ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Checklist'
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add New Step */}
      <Card>
        <CardHeader>
          <CardTitle>Add New Production Step</CardTitle>
          <CardDescription>
            Create a new step for the QC checklist workflow
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="new-value">Step Value (Technical ID)</Label>
              <Input
                id="new-value"
                type="text"
                value={newStep.value}
                onChange={(e) => setNewStep(prev => ({ ...prev, value: e.target.value }))}
                placeholder="e.g., sanding_pre_work"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Use lowercase with underscores (no spaces)
              </p>
            </div>
            <div>
              <Label htmlFor="new-label">Display Label</Label>
              <Input
                id="new-label"
                type="text"
                value={newStep.label}
                onChange={(e) => setNewStep(prev => ({ ...prev, label: e.target.value }))}
                placeholder="e.g., 2. Sanding - Pre-Work"
              />
              <p className="text-xs text-muted-foreground mt-1">
                This is what workers will see in the dropdown
              </p>
            </div>
          </div>
          <Button onClick={handleAddStep} className="mt-4">
            <Plus className="h-4 w-4 mr-2" />
            Add Step
          </Button>
        </CardContent>
      </Card>

      {/* Current Steps */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle>Current Production Steps</CardTitle>
            <CardDescription>
              Drag to reorder, click the list icon to edit checklist items, edit to modify step details.
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handlePopulateChecklists}
              disabled={isPopulatingChecklists}
              variant="outline"
              className="border-blue-500 text-blue-600 hover:bg-blue-50"
            >
              {isPopulatingChecklists ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Populating...
                </>
              ) : (
                <>
                  <Database className="h-4 w-4 mr-2" />
                  Populate Checklists
                </>
              )}
            </Button>
            <Button 
              onClick={handleSaveToDatabase} 
              disabled={isSaving}
              className="bg-green-600 hover:bg-green-700"
            >
              {isSaving ? 'Saving...' : 'Save All Changes'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingSteps ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              <span>Loading current steps...</span>
            </div>
          ) : steps.length === 0 ? (
            <Alert>
              <AlertDescription>
                No production steps defined. Add some steps above to get started.
              </AlertDescription>
            </Alert>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext 
                items={steps.map(step => step.value)} 
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-3">
                  {steps.map((step, index) => (
                    <SortableStepItem
                      key={step.value}
                      step={step}
                      index={index}
                      editingId={editingId}
                      editingValues={editingValues}
                      onEditStart={handleEditStart}
                      onEditSave={handleEditSave}
                      onEditCancel={handleEditCancel}
                      onDelete={handleDeleteStep}
                      onEditValueChange={(value) => setEditingValues(prev => ({ ...prev, value }))}
                      onEditLabelChange={(label) => setEditingValues(prev => ({ ...prev, label }))}
                      onEditChecklist={handleEditChecklist}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </CardContent>
      </Card>

      {/* Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Preview</CardTitle>
          <CardDescription>
            This is how the steps will appear in the worker QC checklist dropdown
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-md p-3 bg-muted/50">
            <Label className="text-sm font-medium">Production Step</Label>
            <div className="mt-1 p-2 border rounded bg-background">
              <div className="text-sm text-muted-foreground">Select a production step</div>
              <div className="mt-2 space-y-1">
                {steps.map(step => (
                  <div key={step.value} className="text-sm p-1 hover:bg-muted rounded">
                    {step.label}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 