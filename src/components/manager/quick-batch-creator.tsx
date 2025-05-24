'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { Plus, Package } from 'lucide-react'

interface WorkflowTemplate {
  id: string
  name: string
}

interface QuickBatchCreatorProps {
  workflows: WorkflowTemplate[]
  onBatchCreated?: () => void
}

export function QuickBatchCreator({ workflows, onBatchCreated }: QuickBatchCreatorProps) {
  const { toast } = useToast()
  const [isCreating, setIsCreating] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    batch_type: 'model',
    workflow_template_id: '',
    item_count: 5
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please enter a batch name',
        variant: 'destructive'
      })
      return
    }

    setIsCreating(true)

    try {
      // Generate mock order item IDs for testing
      const mockOrderItemIds = Array.from({ length: formData.item_count }, (_, i) => 
        `mock-item-${Date.now()}-${i}`
      )

      const batchData = {
        name: formData.name,
        batch_type: formData.batch_type,
        order_item_ids: mockOrderItemIds,
        workflow_template_id: formData.workflow_template_id || null,
        criteria: {
          mock_batch: true,
          item_count: formData.item_count
        }
      }

      const response = await fetch('/api/batches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(batchData)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create batch')
      }

      const newBatch = await response.json()
      
      toast({
        title: 'Batch created',
        description: `${formData.name} has been created with ${formData.item_count} items`
      })

      // Reset form
      setFormData({
        name: '',
        batch_type: 'model',
        workflow_template_id: '',
        item_count: 5
      })

      if (onBatchCreated) {
        onBatchCreated()
      }
    } catch (error) {
      console.error('Error creating batch:', error)
      toast({
        title: 'Failed to create batch',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive'
      })
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center space-x-2">
          <Package className="h-5 w-5" />
          <span>Quick Batch Creator</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="batch-name">Batch Name</Label>
            <Input
              id="batch-name"
              placeholder="e.g., Walnut HD650 Batch #1"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="batch-type">Batch Type</Label>
              <Select
                value={formData.batch_type}
                onValueChange={(value) => setFormData({ ...formData, batch_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="model">By Model</SelectItem>
                  <SelectItem value="wood_type">By Wood Type</SelectItem>
                  <SelectItem value="custom">Custom Batch</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="item-count">Number of Items</Label>
              <Input
                id="item-count"
                type="number"
                min="1"
                max="50"
                value={formData.item_count}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  item_count: parseInt(e.target.value) || 1 
                })}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="workflow">Workflow Template (Optional)</Label>
            <Select
              value={formData.workflow_template_id}
              onValueChange={(value) => setFormData({ ...formData, workflow_template_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select workflow or leave blank" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">No workflow (manual assignment)</SelectItem>
                {workflows.map(workflow => (
                  <SelectItem key={workflow.id} value={workflow.id}>
                    {workflow.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button type="submit" disabled={isCreating} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            {isCreating ? 'Creating...' : 'Create Test Batch'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
} 