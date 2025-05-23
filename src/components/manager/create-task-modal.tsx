'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { Plus } from 'lucide-react'

export function CreateTaskModal() {
  const [open, setOpen] = useState(false)
  const [formData, setFormData] = useState({
    task_type: 'build',
    priority: 'normal',
    task_description: '',
    estimated_hours: '',
    order_item_id: '',
    assigned_to_id: '',
  })
  
  const queryClient = useQueryClient()
  const { toast } = useToast()
  
  // Fetch order items
  const { data: orderItems = [] } = useQuery({
    queryKey: ['order-items'],
    queryFn: async () => {
      const response = await fetch('/api/tasks/order-items')
      if (!response.ok) throw new Error('Failed to fetch order items')
      return response.json()
    },
  })
  
  // Fetch workers
  const { data: workers = [] } = useQuery({
    queryKey: ['workers'],
    queryFn: async () => {
      const response = await fetch('/api/workers')
      if (!response.ok) throw new Error('Failed to fetch workers')
      return response.json()
    },
  })
  
  const createTask = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!response.ok) throw new Error('Failed to create task')
      return response.json()
    },
    onSuccess: () => {
      toast({
        title: 'Task created',
        description: 'The task has been created successfully.',
      })
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      setOpen(false)
      resetForm()
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to create task. Please try again.',
        variant: 'destructive',
      })
    },
  })
  
  const resetForm = () => {
    setFormData({
      task_type: 'build',
      priority: 'normal',
      task_description: '',
      estimated_hours: '',
      order_item_id: '',
      assigned_to_id: '',
    })
  }
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const dataToSubmit: any = {
      ...formData,
      estimated_hours: formData.estimated_hours ? parseFloat(formData.estimated_hours) : null,
    }
    createTask.mutate(dataToSubmit)
  }
  
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Create Task
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Task</DialogTitle>
          <DialogDescription>
            Create a new task and optionally assign it to a worker.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="task_type">Task Type</Label>
            <Select
              value={formData.task_type}
              onValueChange={(value) => setFormData({ ...formData, task_type: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="build">Build</SelectItem>
                <SelectItem value="qc">Quality Control</SelectItem>
                <SelectItem value="pack">Pack</SelectItem>
                <SelectItem value="ship">Ship</SelectItem>
                <SelectItem value="repair">Repair</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="order_item_id">Order Item</Label>
            <Select
              value={formData.order_item_id}
              onValueChange={(value) => setFormData({ ...formData, order_item_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select an order item" />
              </SelectTrigger>
              <SelectContent>
                {orderItems.map((item: any) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.product_name} - Order #{item.order.order_number}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="priority">Priority</Label>
            <Select
              value={formData.priority}
              onValueChange={(value) => setFormData({ ...formData, priority: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="task_description">Description</Label>
            <Textarea
              id="task_description"
              placeholder="Enter task details..."
              value={formData.task_description}
              onChange={(e) => setFormData({ ...formData, task_description: e.target.value })}
              rows={3}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="estimated_hours">Estimated Hours</Label>
            <Input
              id="estimated_hours"
              type="number"
              step="0.5"
              placeholder="2.5"
              value={formData.estimated_hours}
              onChange={(e) => setFormData({ ...formData, estimated_hours: e.target.value })}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="assigned_to_id">Assign To (Optional)</Label>
            <Select
              value={formData.assigned_to_id}
              onValueChange={(value) => setFormData({ ...formData, assigned_to_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a worker" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Unassigned</SelectItem>
                {workers.filter((w: any) => w.role === 'worker').map((worker: any) => (
                  <SelectItem key={worker.id} value={worker.id}>
                    {worker.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createTask.isPending}>
              {createTask.isPending ? 'Creating...' : 'Create Task'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}