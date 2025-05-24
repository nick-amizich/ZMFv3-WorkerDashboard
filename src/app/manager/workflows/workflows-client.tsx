'use client'

import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { WorkflowBuilder } from '@/components/manager/workflow-builder'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { 
  Plus, 
  Edit, 
  Copy, 
  Eye, 
  Play, 
  Pause, 
  Trash2,
  Clock,
  Users,
  Zap
} from 'lucide-react'

interface WorkflowTemplate {
  id: string
  name: string
  description: string | null
  trigger_rules: any
  stages: any
  stage_transitions: any
  is_active: boolean | null
  is_default: boolean | null
  created_at: string | null
  created_by?: {
    id: string
    name: string
  } | null
}

interface ManagerWorkflowsClientProps {
  initialWorkflows: WorkflowTemplate[]
}

export function ManagerWorkflowsClient({ initialWorkflows }: ManagerWorkflowsClientProps) {
  const { toast } = useToast()
  const supabase = createClient()
  
  const [workflows, setWorkflows] = useState<WorkflowTemplate[]>(initialWorkflows)
  const [selectedWorkflow, setSelectedWorkflow] = useState<WorkflowTemplate | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [previewData, setPreviewData] = useState<any>(null)

  // Create new workflow
  const handleCreateWorkflow = useCallback(async (workflowData: any) => {
    try {
      const response = await fetch('/api/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(workflowData)
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create workflow')
      }
      
      const newWorkflow = await response.json()
      setWorkflows(prev => [newWorkflow, ...prev])
      setIsCreating(false)
      
      toast({
        title: 'Workflow created',
        description: `${workflowData.name} has been created successfully`
      })
    } catch (error) {
      console.error('Error creating workflow:', error)
      throw error
    }
  }, [toast])

  // Update existing workflow
  const handleUpdateWorkflow = useCallback(async (workflowData: any) => {
    if (!selectedWorkflow) return
    
    try {
      const response = await fetch(`/api/workflows/${selectedWorkflow.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(workflowData)
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update workflow')
      }
      
      const updatedWorkflow = await response.json()
      setWorkflows(prev => 
        prev.map(w => w.id === selectedWorkflow.id ? updatedWorkflow : w)
      )
      setIsEditing(false)
      setSelectedWorkflow(null)
      
      toast({
        title: 'Workflow updated',
        description: `${workflowData.name} has been updated successfully`
      })
    } catch (error) {
      console.error('Error updating workflow:', error)
      throw error
    }
  }, [selectedWorkflow, toast])

  // Duplicate workflow
  const handleDuplicateWorkflow = useCallback(async (workflow: WorkflowTemplate) => {
    try {
      const response = await fetch(`/api/workflows/${workflow.id}/duplicate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          new_name: `${workflow.name} (Copy)`,
          new_description: `Copy of: ${workflow.description || workflow.name}`
        })
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to duplicate workflow')
      }
      
      const duplicatedWorkflow = await response.json()
      setWorkflows(prev => [duplicatedWorkflow, ...prev])
      
      toast({
        title: 'Workflow duplicated',
        description: `${duplicatedWorkflow.name} has been created`
      })
    } catch (error) {
      console.error('Error duplicating workflow:', error)
      toast({
        title: 'Duplicate failed',
        description: error instanceof Error ? error.message : 'Failed to duplicate workflow',
        variant: 'destructive'
      })
    }
  }, [toast])

  // Preview workflow
  const handlePreviewWorkflow = useCallback(async (workflowData: any) => {
    try {
      const workflowId = workflowData.id || selectedWorkflow?.id
      
      if (!workflowId && workflowData.stages?.length > 0) {
        // For new workflows, we can create a temporary preview
        setPreviewData({
          workflow: workflowData,
          sample_batch: {
            id: 'preview-batch',
            name: 'Sample Batch',
            item_count: 5
          },
          stages: workflowData.stages.map((stage: any, index: number) => ({
            stage_code: stage.stage,
            stage_name: stage.name,
            description: stage.description,
            estimated_hours_per_item: stage.estimated_hours || 2,
            automation_type: stage.is_automated ? 'automated' : 'manual',
            assignment_rule: stage.auto_assign_rule || 'manual'
          })),
          statistics: {
            total_stages: workflowData.stages.length,
            automated_stages: workflowData.stages.filter((s: any) => s.is_automated).length,
            manual_stages: workflowData.stages.filter((s: any) => !s.is_automated).length,
            estimated_total_hours: workflowData.stages.reduce((sum: number, s: any) => sum + (s.estimated_hours || 0), 0)
          }
        })
        setShowPreview(true)
        return
      }

      const response = await fetch(`/api/workflows/${workflowId}/preview?sample_type=default&batch_size=5`)
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to generate preview')
      }
      
      const preview = await response.json()
      setPreviewData(preview)
      setShowPreview(true)
      
    } catch (error) {
      console.error('Error previewing workflow:', error)
      toast({
        title: 'Preview failed',
        description: error instanceof Error ? error.message : 'Failed to generate preview',
        variant: 'destructive'
      })
    }
  }, [selectedWorkflow, toast])

  // Toggle workflow active status
  const handleToggleActive = useCallback(async (workflow: WorkflowTemplate) => {
    try {
      const response = await fetch(`/api/workflows/${workflow.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...workflow,
          is_active: !workflow.is_active
        })
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update workflow')
      }
      
      const updatedWorkflow = await response.json()
      setWorkflows(prev => 
        prev.map(w => w.id === workflow.id ? updatedWorkflow : w)
      )
      
      toast({
        title: workflow.is_active ? 'Workflow deactivated' : 'Workflow activated',
        description: `${workflow.name} is now ${updatedWorkflow.is_active ? 'active' : 'inactive'}`
      })
    } catch (error) {
      console.error('Error toggling workflow:', error)
      toast({
        title: 'Update failed',
        description: error instanceof Error ? error.message : 'Failed to update workflow',
        variant: 'destructive'
      })
    }
  }, [toast])

  // Calculate workflow statistics
  const getWorkflowStats = (workflow: WorkflowTemplate) => {
    const stages = Array.isArray(workflow.stages) ? workflow.stages : []
    const totalStages = stages.length
    const automatedStages = stages.filter((s: any) => s.is_automated).length
    const totalHours = stages.reduce((sum: number, s: any) => sum + (s.estimated_hours || 0), 0)
    
    return {
      totalStages,
      automatedStages,
      automationPercentage: totalStages > 0 ? Math.round((automatedStages / totalStages) * 100) : 0,
      totalHours
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Workflow Management</h1>
          <p className="text-gray-600 mt-1">
            Create and manage custom production workflows for your manufacturing process
          </p>
        </div>
        
        <Button onClick={() => setIsCreating(true)} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4 mr-2" />
          Create Workflow
        </Button>
      </div>

      {/* Workflow List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {workflows.map((workflow) => {
          const stats = getWorkflowStats(workflow)
          
          return (
            <Card key={workflow.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{workflow.name}</CardTitle>
                    <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                      {workflow.description || 'No description'}
                    </p>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Badge variant={workflow.is_active ? 'default' : 'secondary'}>
                      {workflow.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                    {workflow.is_default && (
                      <Badge variant="outline">Default</Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* Statistics */}
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div className="text-center">
                    <div className="flex items-center justify-center text-gray-600">
                      <Users className="h-4 w-4 mr-1" />
                      {stats.totalStages}
                    </div>
                    <p className="text-xs text-gray-500">Stages</p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center text-gray-600">
                      <Zap className="h-4 w-4 mr-1" />
                      {stats.automationPercentage}%
                    </div>
                    <p className="text-xs text-gray-500">Auto</p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center text-gray-600">
                      <Clock className="h-4 w-4 mr-1" />
                      {stats.totalHours}h
                    </div>
                    <p className="text-xs text-gray-500">Total</p>
                  </div>
                </div>

                {/* Created by */}
                <div className="text-sm text-gray-500">
                  Created by {workflow.created_by?.name || 'Unknown'} • {workflow.created_at ? new Date(workflow.created_at).toLocaleDateString() : 'Unknown date'}
                </div>

                {/* Actions */}
                <div className="flex items-center space-x-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handlePreviewWorkflow(workflow)}
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    Preview
                  </Button>
                  
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelectedWorkflow(workflow)
                      setIsEditing(true)
                    }}
                  >
                    <Edit className="h-3 w-3 mr-1" />
                    Edit
                  </Button>
                  
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDuplicateWorkflow(workflow)}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                  
                  <Button
                    size="sm"
                    variant={workflow.is_active ? "destructive" : "default"}
                    onClick={() => handleToggleActive(workflow)}
                  >
                    {workflow.is_active ? (
                      <Pause className="h-3 w-3" />
                    ) : (
                      <Play className="h-3 w-3" />
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Create Workflow Dialog */}
      <Dialog open={isCreating} onOpenChange={setIsCreating}>
        <DialogContent className="max-w-7xl h-[90vh]">
          <DialogHeader>
            <DialogTitle>Create New Workflow</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden">
            <WorkflowBuilder
              onSave={handleCreateWorkflow}
              onPreview={handlePreviewWorkflow}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Workflow Dialog */}
      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="max-w-7xl h-[90vh]">
          <DialogHeader>
            <DialogTitle>Edit Workflow: {selectedWorkflow?.name}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden">
            {selectedWorkflow && (
              <WorkflowBuilder
                initialWorkflow={{
                  ...selectedWorkflow,
                  description: selectedWorkflow.description || '',
                  is_active: selectedWorkflow.is_active ?? false,
                  stages: Array.isArray(selectedWorkflow.stages) ? selectedWorkflow.stages : [],
                  stage_transitions: Array.isArray(selectedWorkflow.stage_transitions) ? selectedWorkflow.stage_transitions : []
                }}
                onSave={handleUpdateWorkflow}
                onPreview={handlePreviewWorkflow}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Workflow Preview</DialogTitle>
          </DialogHeader>
          
          {previewData && (
            <WorkflowPreview data={previewData} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Workflow Preview Component
function WorkflowPreview({ data }: { data: any }) {
  return (
    <div className="space-y-6">
      {/* Workflow Info */}
      <div className="border rounded-lg p-4">
        <h3 className="font-semibold text-lg">{data.workflow.name}</h3>
        <p className="text-gray-600">{data.workflow.description}</p>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-4 gap-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">{data.statistics.total_stages}</div>
          <p className="text-sm text-gray-500">Total Stages</p>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">{data.statistics.automated_stages}</div>
          <p className="text-sm text-gray-500">Automated</p>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-orange-600">{data.statistics.manual_stages}</div>
          <p className="text-sm text-gray-500">Manual</p>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-purple-600">{data.statistics.estimated_total_hours}h</div>
          <p className="text-sm text-gray-500">Estimated Time</p>
        </div>
      </div>

      {/* Stage Flow */}
      <div>
        <h4 className="font-medium mb-3">Production Flow</h4>
        <div className="space-y-3">
          {data.stages.map((stage: any, index: number) => (
            <div key={stage.stage_code} className="flex items-center space-x-4 p-3 border rounded-lg">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-sm font-medium">
                {index + 1}
              </div>
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <h5 className="font-medium">{stage.stage_name}</h5>
                  <Badge variant={stage.automation_type === 'automated' ? 'default' : 'outline'}>
                    {stage.automation_type}
                  </Badge>
                </div>
                <p className="text-sm text-gray-600">{stage.description}</p>
              </div>
              <div className="text-right text-sm text-gray-500">
                {stage.estimated_hours_per_item}h per item
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Sample Batch */}
      <div className="border rounded-lg p-4 bg-gray-50">
        <h4 className="font-medium mb-2">Sample Batch: {data.sample_batch.name}</h4>
        <p className="text-sm text-gray-600">
          This workflow would process {data.sample_batch.item_count} items with an estimated total time of {data.statistics.estimated_total_hours} hours.
        </p>
      </div>
    </div>
  )
} 