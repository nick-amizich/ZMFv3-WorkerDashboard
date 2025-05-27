'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle2, Loader2, ClipboardList, User, AlertCircle } from 'lucide-react'

interface Worker {
  id: string
  name: string
}

interface ProductionStep {
  value: string
  label: string
}

interface QCChecklistClientProps {
  currentWorker: Worker & { role: string, is_active: boolean }
  productionSteps: ProductionStep[]
}

interface ChecklistItem {
  id: string
  text: string
  completed: boolean
  notes?: string
}

interface DatabaseChecklistItem {
  id: string
  item_text: string
  sort_order: number
}

export function QCChecklistClient({ currentWorker, productionSteps }: QCChecklistClientProps) {
  const [selectedStep, setSelectedStep] = useState('')
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([])
  const [overallNotes, setOverallNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [isLoadingChecklist, setIsLoadingChecklist] = useState(false)
  const [productInfo, setProductInfo] = useState({
    model: '',
    serialNumber: '',
    woodType: ''
  })
  const { toast } = useToast()

  // Load saved state from localStorage
  useEffect(() => {
    const savedState = localStorage.getItem('qc-checklist-state')
    if (savedState) {
      try {
        const state = JSON.parse(savedState)
        if (state.selectedStep) setSelectedStep(state.selectedStep)
        if (state.checklistItems) setChecklistItems(state.checklistItems)
        if (state.overallNotes) setOverallNotes(state.overallNotes)
        if (state.productInfo) setProductInfo(state.productInfo)
      } catch (error) {
        console.error('Error loading saved state:', error)
      }
    }
  }, [])

  // Save state to localStorage whenever it changes
  useEffect(() => {
    const state = {
      selectedStep,
      checklistItems,
      overallNotes,
      productInfo
    }
    localStorage.setItem('qc-checklist-state', JSON.stringify(state))
  }, [selectedStep, checklistItems, overallNotes, productInfo])

  // Load checklist items when step changes
  useEffect(() => {
    if (selectedStep) {
      loadChecklistItems(selectedStep)
    } else {
      setChecklistItems([])
    }
  }, [selectedStep])

  const loadChecklistItems = async (stepValue: string) => {
    setIsLoadingChecklist(true)
    try {
      const response = await fetch(`/api/settings/qc-steps/${encodeURIComponent(stepValue)}/checklist`)
      if (!response.ok) {
        throw new Error('Failed to load checklist items')
      }
      const data = await response.json()
      
      // Convert database items to component format
      const items: ChecklistItem[] = (data.items || []).map((dbItem: DatabaseChecklistItem, index: number) => ({
        id: `${stepValue}-${index}`,
        text: dbItem.item_text,
        completed: false,
        notes: ''
      }))
      
      setChecklistItems(items)
    } catch (error) {
      console.error('Error loading checklist items:', error)
      toast({
        title: 'Error',
        description: 'Failed to load checklist items. Please try again.',
        variant: 'destructive'
      })
      setChecklistItems([])
    } finally {
      setIsLoadingChecklist(false)
    }
  }

  const handleChecklistItemToggle = (itemId: string) => {
    setChecklistItems(prev => prev.map(item =>
      item.id === itemId ? { ...item, completed: !item.completed } : item
    ))
  }

  const handleItemNoteChange = (itemId: string, notes: string) => {
    setChecklistItems(prev => prev.map(item =>
      item.id === itemId ? { ...item, notes } : item
    ))
  }

  const resetForm = () => {
    setSelectedStep('')
    setChecklistItems([])
    setOverallNotes('')
    setProductInfo({ model: '', serialNumber: '', woodType: '' })
    localStorage.removeItem('qc-checklist-state')
  }

  const handleSubmit = async () => {
    // Validate all items are checked
    const incompleteItems = checklistItems.filter(item => !item.completed)
    if (incompleteItems.length > 0) {
      toast({
        title: 'Incomplete Checklist',
        description: `Please complete all ${incompleteItems.length} remaining items before submitting.`,
        variant: 'destructive'
      })
      return
    }

    setIsSubmitting(true)
    try {
      const submission = {
        worker_id: currentWorker.id,
        worker_name: currentWorker.name,
        production_step: selectedStep,
        checklist_items: checklistItems.map(item => ({
          itemId: item.id,
          itemText: item.text,
          completed: item.completed,
          notes: item.notes
        })),
        overall_notes: overallNotes || null,
        product_info: productInfo.model || productInfo.serialNumber || productInfo.woodType 
          ? productInfo 
          : null
      }

      const response = await fetch('/api/qc/submissions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submission),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to submit')
      }

      setShowSuccess(true)
      toast({
        title: 'Success!',
        description: 'Quality checklist submitted successfully.',
      })

      // Reset form after a delay
      setTimeout(() => {
        setShowSuccess(false)
        resetForm()
      }, 3000)

    } catch (error) {
      console.error('Error submitting checklist:', error)
      toast({
        title: 'Error',
        description: 'Failed to submit checklist. Please try again.',
        variant: 'destructive'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const completedCount = checklistItems.filter(item => item.completed).length
  const totalCount = checklistItems.length
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0

  if (showSuccess) {
    return (
      <div className="container max-w-2xl mx-auto p-4 flex items-center justify-center min-h-[600px]">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Checklist Submitted!</h2>
            <p className="text-muted-foreground">
              Your quality control checklist has been recorded successfully.
            </p>
            <p className="text-sm mt-4 text-muted-foreground">
              Resetting form for next unit...
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container max-w-4xl mx-auto p-4 pb-20">
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <h1 className="text-3xl font-bold mb-4">Quality Control Checklist</h1>
          
          <div className="flex items-center gap-3 text-sm mb-4">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 rounded-md border border-blue-200">
              <User className="h-4 w-4 text-blue-600" />
              <span className="font-medium text-blue-800">{currentWorker.name}</span>
            </div>
            {selectedStep && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 rounded-md border border-green-200">
                <ClipboardList className="h-4 w-4 text-green-600" />
                <span className="font-medium text-green-800">
                  {productionSteps.find(s => s.value === selectedStep)?.label}
                </span>
              </div>
            )}
          </div>
          
          {totalCount > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm mb-1">
                <span className="font-medium">Progress</span>
                <span className="font-medium">{completedCount} of {totalCount} completed</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Step Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Production Step</CardTitle>
            <CardDescription>Select the current production step</CardDescription>
          </CardHeader>
          <CardContent>
            <Select value={selectedStep} onValueChange={setSelectedStep}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a production step" />
              </SelectTrigger>
              <SelectContent>
                {productionSteps.map(step => (
                  <SelectItem key={step.value} value={step.value}>
                    {step.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Product Information */}
        {selectedStep && (
          <Card>
            <CardHeader>
              <CardTitle>Product Information (Optional)</CardTitle>
              <CardDescription>Add product details if available</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="model">Model</Label>
                  <Input
                    id="model"
                    type="text"
                    value={productInfo.model}
                    onChange={(e) => setProductInfo(prev => ({ ...prev, model: e.target.value }))}
                    placeholder="e.g., HD650"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="serialNumber">Serial Number</Label>
                  <Input
                    id="serialNumber"
                    type="text"
                    value={productInfo.serialNumber}
                    onChange={(e) => setProductInfo(prev => ({ ...prev, serialNumber: e.target.value }))}
                    placeholder="e.g., SN12345"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="woodType">Wood Type</Label>
                  <Input
                    id="woodType"
                    type="text"
                    value={productInfo.woodType}
                    onChange={(e) => setProductInfo(prev => ({ ...prev, woodType: e.target.value }))}
                    placeholder="e.g., Walnut"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Loading State */}
        {selectedStep && isLoadingChecklist && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                <span>Loading checklist items...</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Checklist Items */}
        {selectedStep && !isLoadingChecklist && checklistItems.length > 0 && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div>
                <CardTitle>Quality Checklist</CardTitle>
                <CardDescription>Complete all items before marking step complete</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setChecklistItems(prev => prev.map(item => ({ ...item, completed: true })))}
                  disabled={completedCount === totalCount}
                >
                  Select All
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setChecklistItems(prev => prev.map(item => ({ ...item, completed: false })))}
                  disabled={completedCount === 0}
                >
                  Clear All
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {checklistItems.map((item, index) => (
                  <div key={item.id} className="space-y-2 p-4 border rounded-lg">
                    <div className="flex items-start space-x-3">
                      <Checkbox
                        id={item.id}
                        checked={item.completed}
                        onCheckedChange={() => handleChecklistItemToggle(item.id)}
                        className="mt-1"
                      />
                      <Label 
                        htmlFor={item.id} 
                        className={`flex-1 text-base leading-relaxed cursor-pointer ${
                          item.completed ? 'text-muted-foreground line-through' : ''
                        }`}
                      >
                        {index + 1}. {item.text}
                      </Label>
                    </div>
                    {!item.completed && (
                      <div className="ml-7">
                        <Label htmlFor={`${item.id}-notes`} className="text-sm text-muted-foreground">
                          Notes (optional)
                        </Label>
                        <Textarea
                          id={`${item.id}-notes`}
                          placeholder="Add any notes or issues..."
                          value={item.notes || ''}
                          onChange={(e) => handleItemNoteChange(item.id, e.target.value)}
                          className="mt-1 h-20"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Overall Notes */}
              <div className="mt-6">
                <Label htmlFor="overall-notes">Overall Notes (Optional)</Label>
                <Textarea
                  id="overall-notes"
                  placeholder="Add any overall comments or observations..."
                  value={overallNotes}
                  onChange={(e) => setOverallNotes(e.target.value)}
                  className="mt-2"
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* No Checklist Items */}
        {selectedStep && !isLoadingChecklist && checklistItems.length === 0 && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No checklist items are configured for this production step. Please contact a manager to set up the checklist.
            </AlertDescription>
          </Alert>
        )}

        {/* Submit Button */}
        {selectedStep && checklistItems.length > 0 && (
          <div className="fixed bottom-0 left-0 right-0 bg-background border-t p-4">
            <div className="container max-w-4xl mx-auto flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                {completedCount < totalCount && (
                  <span className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    Complete all items to submit
                  </span>
                )}
              </div>
              <Button
                size="lg"
                onClick={handleSubmit}
                disabled={isSubmitting || completedCount < totalCount}
                className="min-w-[200px]"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Mark Step Complete'
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!selectedStep && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Select a production step above to begin the quality checklist.
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  )
}