'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { useToast } from '@/hooks/use-toast'
import { Package, Search } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface OrderItem {
  id: string
  order_id: string
  sku: string
  title: string
  model_name: string | null
  wood_type: string | null
  quantity: number
  shopify_order_name: string
  customer_name: string | null
}

interface WorkflowTemplate {
  id: string
  name: string
}

interface BatchCreatorModalProps {
  open: boolean
  onClose: () => void
  workflows: WorkflowTemplate[]
  onBatchCreated?: () => void
}

export function BatchCreatorModal({ open, onClose, workflows, onBatchCreated }: BatchCreatorModalProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [orderItems, setOrderItems] = useState<OrderItem[]>([])
  const [selectedItems, setSelectedItems] = useState<string[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'model' | 'wood'>('all')
  const [batchName, setBatchName] = useState('')
  const [workflowId, setWorkflowId] = useState('')

  useEffect(() => {
    if (open) {
      fetchAvailableItems()
    }
  }, [open])

  const fetchAvailableItems = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/orders?status=pending')
      if (!response.ok) throw new Error('Failed to fetch items')
      
      const data = await response.json()
      setOrderItems(data.items || [])
    } catch (error) {
      console.error('Error fetching items:', error)
      toast({
        title: 'Error loading items',
        description: 'Failed to load available order items',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const filteredItems = orderItems.filter(item => {
    const matchesSearch = searchTerm === '' || 
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.shopify_order_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)
    
    const matchesFilter = filterType === 'all' ||
      (filterType === 'model' && item.model_name) ||
      (filterType === 'wood' && item.wood_type)
    
    return matchesSearch && matchesFilter
  })

  const toggleItemSelection = (itemId: string) => {
    setSelectedItems(prev => 
      prev.includes(itemId)
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    )
  }

  const selectAll = () => {
    setSelectedItems(filteredItems.map(item => item.id))
  }

  const deselectAll = () => {
    setSelectedItems([])
  }

  const handleCreate = async () => {
    if (!batchName.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please enter a batch name',
        variant: 'destructive'
      })
      return
    }

    if (selectedItems.length === 0) {
      toast({
        title: 'Validation Error',
        description: 'Please select at least one item',
        variant: 'destructive'
      })
      return
    }

    setCreating(true)
    try {
      const response = await fetch('/api/batches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: batchName,
          batch_type: filterType === 'all' ? 'custom' : filterType,
          order_item_ids: selectedItems,
          workflow_template_id: workflowId === 'none' ? null : workflowId || null
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create batch')
      }

      toast({
        title: 'Batch created',
        description: `${batchName} has been created with ${selectedItems.length} items`
      })

      onClose()
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
      setCreating(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Create Production Batch</DialogTitle>
          <DialogDescription>
            Select order items to include in this batch
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          <div className="space-y-4">
            <div>
              <Label htmlFor="batch-name">Batch Name</Label>
              <Input
                id="batch-name"
                placeholder="e.g., Walnut HD650 Batch #1"
                value={batchName}
                onChange={(e) => setBatchName(e.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="workflow">Workflow Template</Label>
              <Select value={workflowId} onValueChange={setWorkflowId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select workflow (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No workflow (assign later)</SelectItem>
                  {workflows.map(workflow => (
                    <SelectItem key={workflow.id} value={workflow.id}>
                      {workflow.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <Label htmlFor="search">Search Items</Label>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="search"
                    placeholder="Search by order, customer, or product..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>
              <Select value={filterType} onValueChange={(value: any) => setFilterType(value)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Items</SelectItem>
                  <SelectItem value="model">By Model</SelectItem>
                  <SelectItem value="wood">By Wood Type</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-between items-center">
              <div className="text-sm text-muted-foreground">
                {selectedItems.length} of {filteredItems.length} items selected
              </div>
              <div className="space-x-2">
                <Button variant="outline" size="sm" onClick={selectAll}>
                  Select All
                </Button>
                <Button variant="outline" size="sm" onClick={deselectAll}>
                  Deselect All
                </Button>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-auto border rounded-lg">
            {loading ? (
              <div className="p-8 text-center text-muted-foreground">
                Loading available items...
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                {orderItems.length === 0 
                  ? "No imported orders available. Import orders first."
                  : "No items match your search criteria."}
              </div>
            ) : (
              <div className="divide-y">
                {filteredItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center space-x-3 p-4 hover:bg-accent/50 cursor-pointer"
                    onClick={() => toggleItemSelection(item.id)}
                  >
                    <Checkbox
                      checked={selectedItems.includes(item.id)}
                      onCheckedChange={() => toggleItemSelection(item.id)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div className="flex-1">
                      <div className="font-medium">{item.title}</div>
                      <div className="text-sm text-muted-foreground">
                        Order: {item.shopify_order_name} • Customer: {item.customer_name || 'Unknown'}
                      </div>
                      <div className="flex gap-2 mt-1">
                        {item.model_name && (
                          <Badge variant="secondary" className="text-xs">
                            {item.model_name}
                          </Badge>
                        )}
                        {item.wood_type && (
                          <Badge variant="outline" className="text-xs">
                            {item.wood_type}
                          </Badge>
                        )}
                        <Badge variant="outline" className="text-xs">
                          Qty: {item.quantity}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={creating || selectedItems.length === 0}>
              <Package className="h-4 w-4 mr-2" />
              {creating ? 'Creating...' : `Create Batch (${selectedItems.length} items)`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}