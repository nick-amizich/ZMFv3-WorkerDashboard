'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useToast } from '@/hooks/use-toast'
import { 
  Zap, 
  Plus, 
  X, 
  Save,
  Play,
  Pause,
  Settings,
  AlertCircle,
  Clock,
  Calendar,
  GitBranch,
  Users,
  Bell,
  ChevronRight,
  Trash2,
  Copy,
  Edit2,
  CheckCircle
} from 'lucide-react'

interface AutomationRule {
  id?: string
  workflow_template_id?: string
  name: string
  description: string
  trigger_type: 'stage_complete' | 'time_elapsed' | 'manual' | 'schedule' | 'condition_met'
  trigger_config: any
  conditions: {
    all?: Condition[]
    any?: Condition[]
  }
  actions: Action[]
  is_active: boolean
  priority: number
  execution_stats?: {
    total_executions: number
    successful_executions: number
    failed_executions: number
    success_rate: string
  }
}

interface Condition {
  type: 'batch_size' | 'product_type' | 'worker_available' | 'time_of_day' | 'task_priority' | 'task_status' | 'custom'
  operator: 'equals' | 'greater_than' | 'less_than' | 'contains' | 'between'
  value: any
}

interface Action {
  type: 'create_tasks' | 'assign_tasks' | 'notify' | 'transition_stage' | 'pause_workflow'
  config: {
    stage?: string
    assignment_rule?: string
    notification_channel?: string
    message_template?: string
  }
}

interface Workflow {
  id: string
  name: string
  stages: any[]
}

interface AutomationRuleBuilderProps {
  workflowId?: string
  rule?: AutomationRule
  onSave?: (rule: AutomationRule) => void
  onCancel?: () => void
}

export function AutomationRuleBuilder({ 
  workflowId, 
  rule, 
  onSave, 
  onCancel 
}: AutomationRuleBuilderProps) {
  const [editingRule, setEditingRule] = useState<AutomationRule>(rule || {
    name: '',
    description: '',
    trigger_type: 'stage_complete',
    trigger_config: {},
    conditions: { all: [], any: [] },
    actions: [],
    is_active: true,
    priority: 50,
    workflow_template_id: workflowId
  })
  const [workflows, setWorkflows] = useState<Workflow[]>([])
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null)
  const [loading, setLoading] = useState(false)
  const [showTestDialog, setShowTestDialog] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    fetchWorkflows()
  }, [])

  const fetchWorkflows = async () => {
    try {
      const response = await fetch('/api/workflows')
      if (response.ok) {
        const data = await response.json()
        setWorkflows(data.workflows || [])
        
        if (editingRule.workflow_template_id) {
          const workflow = data.workflows.find((w: Workflow) => w.id === editingRule.workflow_template_id)
          setSelectedWorkflow(workflow || null)
        }
      }
    } catch (error) {
      console.error('Failed to fetch workflows:', error)
    }
  }

  const handleSaveRule = async () => {
    if (!editingRule.name) {
      toast({
        title: 'Validation Error',
        description: 'Rule name is required',
        variant: 'destructive'
      })
      return
    }

    if (editingRule.actions.length === 0) {
      toast({
        title: 'Validation Error',
        description: 'At least one action is required',
        variant: 'destructive'
      })
      return
    }

    setLoading(true)
    try {
      const endpoint = editingRule.id 
        ? `/api/automation/rules/${editingRule.id}`
        : '/api/automation/rules'
      
      const method = editingRule.id ? 'PUT' : 'POST'
      
      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingRule)
      })

      if (response.ok) {
        const data = await response.json()
        toast({
          title: 'Success',
          description: `Rule ${editingRule.id ? 'updated' : 'created'} successfully`
        })
        
        if (onSave) {
          onSave(data.rule)
        }
      } else {
        const error = await response.json()
        throw new Error(error.error || 'Failed to save rule')
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save rule',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const addCondition = (group: 'all' | 'any') => {
    const newCondition: Condition = {
      type: 'task_priority',
      operator: 'equals',
      value: ''
    }
    
    setEditingRule({
      ...editingRule,
      conditions: {
        ...editingRule.conditions,
        [group]: [...(editingRule.conditions[group] || []), newCondition]
      }
    })
  }

  const updateCondition = (group: 'all' | 'any', index: number, field: string, value: any) => {
    const conditions = [...(editingRule.conditions[group] || [])]
    conditions[index] = { ...conditions[index], [field]: value }
    
    setEditingRule({
      ...editingRule,
      conditions: {
        ...editingRule.conditions,
        [group]: conditions
      }
    })
  }

  const removeCondition = (group: 'all' | 'any', index: number) => {
    const conditions = [...(editingRule.conditions[group] || [])]
    conditions.splice(index, 1)
    
    setEditingRule({
      ...editingRule,
      conditions: {
        ...editingRule.conditions,
        [group]: conditions
      }
    })
  }

  const addAction = () => {
    const newAction: Action = {
      type: 'assign_tasks',
      config: {}
    }
    
    setEditingRule({
      ...editingRule,
      actions: [...editingRule.actions, newAction]
    })
  }

  const updateAction = (index: number, field: string, value: any) => {
    const actions = [...editingRule.actions]
    if (field.startsWith('config.')) {
      const configField = field.replace('config.', '')
      actions[index] = {
        ...actions[index],
        config: {
          ...actions[index].config,
          [configField]: value
        }
      }
    } else {
      actions[index] = { ...actions[index], [field]: value }
    }
    
    setEditingRule({
      ...editingRule,
      actions
    })
  }

  const removeAction = (index: number) => {
    const actions = [...editingRule.actions]
    actions.splice(index, 1)
    
    setEditingRule({
      ...editingRule,
      actions
    })
  }

  const getTriggerIcon = (type: string) => {
    switch (type) {
      case 'stage_complete': return <CheckCircle className="h-4 w-4" />
      case 'time_elapsed': return <Clock className="h-4 w-4" />
      case 'manual': return <Users className="h-4 w-4" />
      case 'schedule': return <Calendar className="h-4 w-4" />
      case 'condition_met': return <GitBranch className="h-4 w-4" />
      default: return <Zap className="h-4 w-4" />
    }
  }

  const getActionIcon = (type: string) => {
    switch (type) {
      case 'create_tasks': return <Plus className="h-4 w-4" />
      case 'assign_tasks': return <Users className="h-4 w-4" />
      case 'notify': return <Bell className="h-4 w-4" />
      case 'transition_stage': return <ChevronRight className="h-4 w-4" />
      case 'pause_workflow': return <Pause className="h-4 w-4" />
      default: return <Settings className="h-4 w-4" />
    }
  }

  return (
    <div className="space-y-6">
      {/* Rule Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            {editingRule.id ? 'Edit Automation Rule' : 'Create Automation Rule'}
          </CardTitle>
          <CardDescription>
            Define triggers, conditions, and actions for workflow automation
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Rule Name</Label>
              <Input
                id="name"
                value={editingRule.name}
                onChange={(e) => setEditingRule({ ...editingRule, name: e.target.value })}
                placeholder="e.g., Auto-assign high priority tasks"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="workflow">Workflow (Optional)</Label>
              <Select
                value={editingRule.workflow_template_id || ''}
                onValueChange={(value) => {
                  setEditingRule({ ...editingRule, workflow_template_id: value })
                  const workflow = workflows.find(w => w.id === value)
                  setSelectedWorkflow(workflow || null)
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Apply to all workflows" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Workflows</SelectItem>
                  {workflows.map((workflow) => (
                    <SelectItem key={workflow.id} value={workflow.id}>
                      {workflow.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={editingRule.description}
              onChange={(e) => setEditingRule({ ...editingRule, description: e.target.value })}
              placeholder="Describe what this rule does..."
              rows={2}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Switch
                id="active"
                checked={editingRule.is_active}
                onCheckedChange={(checked) => setEditingRule({ ...editingRule, is_active: checked })}
              />
              <Label htmlFor="active">Active</Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Label htmlFor="priority">Priority</Label>
              <Input
                id="priority"
                type="number"
                min="0"
                max="1000"
                value={editingRule.priority}
                onChange={(e) => setEditingRule({ ...editingRule, priority: parseInt(e.target.value) || 0 })}
                className="w-20"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Rule Builder Tabs */}
      <Tabs defaultValue="trigger" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="trigger">
            <Zap className="h-4 w-4 mr-2" />
            Trigger
          </TabsTrigger>
          <TabsTrigger value="conditions">
            <GitBranch className="h-4 w-4 mr-2" />
            Conditions
          </TabsTrigger>
          <TabsTrigger value="actions">
            <Play className="h-4 w-4 mr-2" />
            Actions
          </TabsTrigger>
        </TabsList>

        {/* Trigger Tab */}
        <TabsContent value="trigger">
          <Card>
            <CardHeader>
              <CardTitle>When to trigger this rule</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Trigger Type</Label>
                <Select
                  value={editingRule.trigger_type}
                  onValueChange={(value: any) => setEditingRule({ 
                    ...editingRule, 
                    trigger_type: value,
                    trigger_config: {}
                  })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="stage_complete">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4" />
                        Stage Complete
                      </div>
                    </SelectItem>
                    <SelectItem value="time_elapsed">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Time Elapsed
                      </div>
                    </SelectItem>
                    <SelectItem value="schedule">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Schedule
                      </div>
                    </SelectItem>
                    <SelectItem value="condition_met">
                      <div className="flex items-center gap-2">
                        <GitBranch className="h-4 w-4" />
                        Condition Met
                      </div>
                    </SelectItem>
                    <SelectItem value="manual">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Manual
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Trigger Configuration */}
              {editingRule.trigger_type === 'stage_complete' && (
                <div className="space-y-2">
                  <Label>Stage</Label>
                  <Select
                    value={editingRule.trigger_config.stage || 'any'}
                    onValueChange={(value) => setEditingRule({
                      ...editingRule,
                      trigger_config: { ...editingRule.trigger_config, stage: value }
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Any Stage</SelectItem>
                      {selectedWorkflow?.stages?.map((stage: any) => (
                        <SelectItem key={stage.stage} value={stage.stage}>
                          {stage.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {editingRule.trigger_type === 'time_elapsed' && (
                <div className="space-y-2">
                  <Label>Minutes</Label>
                  <Input
                    type="number"
                    min="1"
                    value={editingRule.trigger_config.elapsed_minutes || ''}
                    onChange={(e) => setEditingRule({
                      ...editingRule,
                      trigger_config: { ...editingRule.trigger_config, elapsed_minutes: parseInt(e.target.value) || 0 }
                    })}
                    placeholder="e.g., 120 for 2 hours"
                  />
                </div>
              )}

              {editingRule.trigger_type === 'schedule' && (
                <div className="space-y-2">
                  <Label>Cron Expression</Label>
                  <Input
                    value={editingRule.trigger_config.schedule || ''}
                    onChange={(e) => setEditingRule({
                      ...editingRule,
                      trigger_config: { ...editingRule.trigger_config, schedule: e.target.value }
                    })}
                    placeholder="e.g., 0 9 * * * (daily at 9am)"
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Conditions Tab */}
        <TabsContent value="conditions">
          <Card>
            <CardHeader>
              <CardTitle>When conditions are met</CardTitle>
              <CardDescription>
                Define conditions that must be true for the rule to execute
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* ALL Conditions */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>ALL of these conditions (AND)</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => addCondition('all')}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Condition
                  </Button>
                </div>
                <div className="space-y-2">
                  {(editingRule.conditions.all || []).map((condition, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
                      <Select
                        value={condition.type}
                        onValueChange={(value: any) => updateCondition('all', index, 'type', value)}
                      >
                        <SelectTrigger className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="task_priority">Task Priority</SelectItem>
                          <SelectItem value="task_status">Task Status</SelectItem>
                          <SelectItem value="batch_size">Batch Size</SelectItem>
                          <SelectItem value="product_type">Product Type</SelectItem>
                          <SelectItem value="worker_available">Workers Available</SelectItem>
                          <SelectItem value="time_of_day">Time of Day</SelectItem>
                        </SelectContent>
                      </Select>
                      
                      <Select
                        value={condition.operator}
                        onValueChange={(value: any) => updateCondition('all', index, 'operator', value)}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="equals">Equals</SelectItem>
                          <SelectItem value="greater_than">Greater Than</SelectItem>
                          <SelectItem value="less_than">Less Than</SelectItem>
                          <SelectItem value="contains">Contains</SelectItem>
                          <SelectItem value="between">Between</SelectItem>
                        </SelectContent>
                      </Select>
                      
                      <Input
                        value={condition.value}
                        onChange={(e) => updateCondition('all', index, 'value', e.target.value)}
                        placeholder="Value"
                        className="flex-1"
                      />
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeCondition('all', index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  {editingRule.conditions.all?.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-2">No conditions added</p>
                  )}
                </div>
              </div>

              {/* ANY Conditions */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>ANY of these conditions (OR)</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => addCondition('any')}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Condition
                  </Button>
                </div>
                <div className="space-y-2">
                  {(editingRule.conditions.any || []).map((condition, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
                      <Select
                        value={condition.type}
                        onValueChange={(value: any) => updateCondition('any', index, 'type', value)}
                      >
                        <SelectTrigger className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="task_priority">Task Priority</SelectItem>
                          <SelectItem value="task_status">Task Status</SelectItem>
                          <SelectItem value="batch_size">Batch Size</SelectItem>
                          <SelectItem value="product_type">Product Type</SelectItem>
                          <SelectItem value="worker_available">Workers Available</SelectItem>
                          <SelectItem value="time_of_day">Time of Day</SelectItem>
                        </SelectContent>
                      </Select>
                      
                      <Select
                        value={condition.operator}
                        onValueChange={(value: any) => updateCondition('any', index, 'operator', value)}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="equals">Equals</SelectItem>
                          <SelectItem value="greater_than">Greater Than</SelectItem>
                          <SelectItem value="less_than">Less Than</SelectItem>
                          <SelectItem value="contains">Contains</SelectItem>
                          <SelectItem value="between">Between</SelectItem>
                        </SelectContent>
                      </Select>
                      
                      <Input
                        value={condition.value}
                        onChange={(e) => updateCondition('any', index, 'value', e.target.value)}
                        placeholder="Value"
                        className="flex-1"
                      />
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeCondition('any', index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  {editingRule.conditions.any?.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-2">No conditions added</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Actions Tab */}
        <TabsContent value="actions">
          <Card>
            <CardHeader>
              <CardTitle>What actions to take</CardTitle>
              <CardDescription>
                Define what happens when the rule is triggered and conditions are met
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addAction}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Action
                </Button>
              </div>
              
              <div className="space-y-3">
                {editingRule.actions.map((action, index) => (
                  <Card key={index}>
                    <CardContent className="pt-4">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Select
                            value={action.type}
                            onValueChange={(value: any) => updateAction(index, 'type', value)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="create_tasks">
                                <div className="flex items-center gap-2">
                                  <Plus className="h-4 w-4" />
                                  Create Tasks
                                </div>
                              </SelectItem>
                              <SelectItem value="assign_tasks">
                                <div className="flex items-center gap-2">
                                  <Users className="h-4 w-4" />
                                  Assign Tasks
                                </div>
                              </SelectItem>
                              <SelectItem value="notify">
                                <div className="flex items-center gap-2">
                                  <Bell className="h-4 w-4" />
                                  Send Notification
                                </div>
                              </SelectItem>
                              <SelectItem value="transition_stage">
                                <div className="flex items-center gap-2">
                                  <ChevronRight className="h-4 w-4" />
                                  Transition Stage
                                </div>
                              </SelectItem>
                              <SelectItem value="pause_workflow">
                                <div className="flex items-center gap-2">
                                  <Pause className="h-4 w-4" />
                                  Pause Workflow
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeAction(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        
                        {/* Action Configuration */}
                        {action.type === 'assign_tasks' && (
                          <div className="space-y-2">
                            <Label>Assignment Rule</Label>
                            <Select
                              value={action.config.assignment_rule || 'least_busy'}
                              onValueChange={(value) => updateAction(index, 'config.assignment_rule', value)}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="least_busy">Least Busy Worker</SelectItem>
                                <SelectItem value="round_robin">Round Robin</SelectItem>
                                <SelectItem value="most_skilled">Most Skilled</SelectItem>
                                <SelectItem value="manual">Manual Assignment</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                        
                        {action.type === 'notify' && (
                          <>
                            <div className="space-y-2">
                              <Label>Notification Channel</Label>
                              <Select
                                value={action.config.notification_channel || 'managers'}
                                onValueChange={(value) => updateAction(index, 'config.notification_channel', value)}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="managers">Managers</SelectItem>
                                  <SelectItem value="assigned_worker">Assigned Worker</SelectItem>
                                  <SelectItem value="all_workers">All Workers</SelectItem>
                                  <SelectItem value="slack">Slack Channel</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label>Message Template</Label>
                              <Textarea
                                value={action.config.message_template || ''}
                                onChange={(e) => updateAction(index, 'config.message_template', e.target.value)}
                                placeholder="Use {{variables}} for dynamic content"
                                rows={2}
                              />
                            </div>
                          </>
                        )}
                        
                        {action.type === 'transition_stage' && (
                          <div className="space-y-2">
                            <Label>Target Stage</Label>
                            <Select
                              value={action.config.stage || ''}
                              onValueChange={(value) => updateAction(index, 'config.stage', value)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select stage" />
                              </SelectTrigger>
                              <SelectContent>
                                {selectedWorkflow?.stages?.map((stage: any) => (
                                  <SelectItem key={stage.stage} value={stage.stage}>
                                    {stage.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
                
                {editingRule.actions.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Settings className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No actions configured</p>
                    <p className="text-sm">Add at least one action to make this rule functional</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Action Buttons */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => setShowTestDialog(true)}
          disabled={!editingRule.name || editingRule.actions.length === 0}
        >
          <Play className="h-4 w-4 mr-2" />
          Test Rule
        </Button>
        
        <div className="flex items-center gap-2">
          {onCancel && (
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button
            onClick={handleSaveRule}
            disabled={loading || !editingRule.name || editingRule.actions.length === 0}
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                {editingRule.id ? 'Update Rule' : 'Create Rule'}
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Test Dialog */}
      <Dialog open={showTestDialog} onOpenChange={setShowTestDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Test Automation Rule</DialogTitle>
            <DialogDescription>
              This will simulate the rule execution without making any actual changes
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Test mode is not yet implemented. This feature will allow you to:
                <ul className="list-disc list-inside mt-2">
                  <li>Simulate trigger conditions</li>
                  <li>Evaluate rule conditions</li>
                  <li>Preview actions that would be taken</li>
                  <li>Identify potential issues</li>
                </ul>
              </AlertDescription>
            </Alert>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTestDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}