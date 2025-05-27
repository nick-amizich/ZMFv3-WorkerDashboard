'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle2, Loader2, ClipboardList, User, AlertCircle } from 'lucide-react'
import { checklistData } from './checklist-data'

interface Worker {
  id: string
  name: string
}

interface QCChecklistClientProps {
  currentWorker: Worker & { role: string, is_active: boolean }
  allWorkers: Worker[]
}

interface ChecklistItem {
  id: string
  text: string
  completed: boolean
  notes?: string
}

export function QCChecklistClient({ currentWorker, allWorkers }: QCChecklistClientProps) {
  const [selectedWorkerId, setSelectedWorkerId] = useState(currentWorker.id)
  const [selectedWorkerName, setSelectedWorkerName] = useState(currentWorker.name)
  const [selectedStep, setSelectedStep] = useState('')
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([])
  const [overallNotes, setOverallNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
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

  // Update checklist items when step changes
  useEffect(() => {
    if (selectedStep && checklistData[selectedStep]) {
      const items: ChecklistItem[] = checklistData[selectedStep].map((text, index) => ({
        id: `${selectedStep}-${index}`,
        text,
        completed: false,
        notes: ''
      }))
      setChecklistItems(items)
    }
  }, [selectedStep])

  const handleWorkerChange = (workerId: string) => {
    const worker = allWorkers.find(w => w.id === workerId)
    if (worker) {
      setSelectedWorkerId(worker.id)
      setSelectedWorkerName(worker.name)
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
        worker_id: selectedWorkerId,
        worker_name: selectedWorkerName,
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

  const productionSteps = [
    { value: 'inventory_intake', label: '1. Inventory Intake' },
    { value: 'sanding_pre_work', label: '2. Sanding - Pre-Work' },
    { value: 'sanding_post_work', label: '2. Sanding - Post-Work' },
    { value: 'finishing_pre_work', label: '3. Finishing - Pre-Work' },
    { value: 'finishing_post_work', label: '3. Finishing - Post-Work' },
    { value: 'sub_assembly_chassis_pre_work', label: '4. Sub-assembly: Chassis - Pre-Work' },
    { value: 'sub_assembly_chassis_post_work', label: '4. Sub-assembly: Chassis - Post-Work' },
    { value: 'sub_assembly_baffle_pre_work', label: '5. Sub-assembly: Baffle - Pre-Work' },
    { value: 'sub_assembly_baffle_post_work', label: '5. Sub-assembly: Baffle - Post-Work' },
    { value: 'final_production', label: '6. Final Production' },
    { value: 'final_assembly', label: '6.5 Final Assembly' },
    { value: 'acoustic_aesthetic_qc', label: '7. Acoustic and Aesthetic QC' },
    { value: 'shipping', label: '8. Shipping' }
  ]

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
        <div className="sticky top-0 bg-background z-10 pb-4 border-b">
          <h1 className="text-2xl font-bold mb-2">Quality Control Checklist</h1>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <User className="h-4 w-4" />
            <span>{selectedWorkerName}</span>
            {selectedStep && (
              <>
                <span>•</span>
                <ClipboardList className="h-4 w-4" />
                <span>{productionSteps.find(s => s.value === selectedStep)?.label}</span>
              </>
            )}
          </div>
          {totalCount > 0 && (
            <div className="mt-2">
              <div className="flex justify-between text-sm mb-1">
                <span>Progress</span>
                <span>{completedCount} of {totalCount} completed</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Worker Selection (for managers) */}
        {currentWorker.role === 'manager' && (
          <Card>
            <CardHeader>
              <CardTitle>Worker Selection</CardTitle>
              <CardDescription>Select the worker performing this QC check</CardDescription>
            </CardHeader>
            <CardContent>
              <Select value={selectedWorkerId} onValueChange={handleWorkerChange}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a worker" />
                </SelectTrigger>
                <SelectContent>
                  {allWorkers.map(worker => (
                    <SelectItem key={worker.id} value={worker.id}>
                      {worker.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        )}

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
                <div>
                  <Label htmlFor="model">Model</Label>
                  <input
                    id="model"
                    type="text"
                    className="w-full px-3 py-2 border rounded-md"
                    value={productInfo.model}
                    onChange={(e) => setProductInfo(prev => ({ ...prev, model: e.target.value }))}
                    placeholder="e.g., HD650"
                  />
                </div>
                <div>
                  <Label htmlFor="serialNumber">Serial Number</Label>
                  <input
                    id="serialNumber"
                    type="text"
                    className="w-full px-3 py-2 border rounded-md"
                    value={productInfo.serialNumber}
                    onChange={(e) => setProductInfo(prev => ({ ...prev, serialNumber: e.target.value }))}
                    placeholder="e.g., SN12345"
                  />
                </div>
                <div>
                  <Label htmlFor="woodType">Wood Type</Label>
                  <input
                    id="woodType"
                    type="text"
                    className="w-full px-3 py-2 border rounded-md"
                    value={productInfo.woodType}
                    onChange={(e) => setProductInfo(prev => ({ ...prev, woodType: e.target.value }))}
                    placeholder="e.g., Walnut"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Checklist Items */}
        {selectedStep && checklistItems.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Quality Checklist</CardTitle>
              <CardDescription>Complete all items before marking step complete</CardDescription>
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