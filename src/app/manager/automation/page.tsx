'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { AutomationRuleBuilder } from '@/components/manager/automation-rule-builder'
import { 
  Zap, 
  Plus, 
  Search,
  Filter,
  Play,
  Pause,
  Edit2,
  Trash2,
  Copy,
  Activity,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  Calendar,
  GitBranch,
  Users,
  Bell,
  TrendingUp,
  BarChart3
} from 'lucide-react'

interface AutomationRule {
  id: string
  workflow_template_id?: string
  name: string
  description: string
  trigger_type: string
  trigger_config: any
  conditions: any
  actions: any[]
  is_active: boolean
  priority: number
  created_at: string
  updated_at: string
  workflow_template?: {
    id: string
    name: string
  }
  created_by?: {
    id: string
    name: string
  }
  execution_stats?: {
    total_executions: number
    successful_executions: number
    failed_executions: number
    success_rate: string
  }
}

interface ExecutionLog {
  id: string
  rule_id: string
  workflow_instance_id: string
  trigger_data: any
  conditions_evaluated: any
  actions_executed: any
  execution_status: string
  error_message?: string
  executed_at: string
}

export default function AutomationPage() {
  const [rules, setRules] = useState<AutomationRule[]>([])
  const [executionLogs, setExecutionLogs] = useState<ExecutionLog[]>([])
  const [loading, setLoading] = useState(true)
  const [showBuilder, setShowBuilder] = useState(false)
  const [editingRule, setEditingRule] = useState<AutomationRule | null>(null)
  const [filter, setFilter] = useState('')
  const [activeFilter, setActiveFilter] = useState<string>('all')
  const [workflowFilter, setWorkflowFilter] = useState<string>('all')
  const { toast } = useToast()

  useEffect(() => {
    fetchRules()
    fetchExecutionLogs()
  }, [])

  const fetchRules = async () => {
    try {
      const params = new URLSearchParams()
      if (activeFilter !== 'all') {
        params.append('active', activeFilter)
      }
      if (workflowFilter !== 'all') {
        params.append('workflow_id', workflowFilter)
      }

      const response = await fetch(`/api/automation/rules?${params}`)
      if (response.ok) {
        const data = await response.json()
        setRules(data.rules || [])
      } else {
        throw new Error('Failed to fetch rules')
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load automation rules',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchExecutionLogs = async () => {
    try {
      const response = await fetch('/api/automation/execution-logs?limit=50')
      if (response.ok) {
        const data = await response.json()
        setExecutionLogs(data.logs || [])
      }
    } catch (error) {
      console.error('Failed to fetch execution logs:', error)
    }
  }

  const handleToggleRule = async (rule: AutomationRule) => {
    try {
      const response = await fetch(`/api/automation/rules/${rule.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...rule, is_active: !rule.is_active })
      })

      if (response.ok) {
        toast({
          title: 'Success',
          description: `Rule ${rule.is_active ? 'deactivated' : 'activated'}`
        })
        fetchRules()
      } else {
        throw new Error('Failed to toggle rule')
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to toggle rule status',
        variant: 'destructive'
      })
    }
  }

  const handleDeleteRule = async (ruleId: string) => {
    if (!confirm('Are you sure you want to delete this rule?')) return

    try {
      const response = await fetch(`/api/automation/rules/${ruleId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Rule deleted successfully'
        })
        fetchRules()
      } else {
        throw new Error('Failed to delete rule')
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete rule',
        variant: 'destructive'
      })
    }
  }

  const handleDuplicateRule = async (rule: AutomationRule) => {
    try {
      const { id, created_at, updated_at, execution_stats, ...newRuleData } = rule
      const newRule = {
        ...newRuleData,
        name: `${rule.name} (Copy)`,
        is_active: false
      }
      const response = await fetch('/api/automation/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRule)
      })

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Rule duplicated successfully'
        })
        fetchRules()
      } else {
        throw new Error('Failed to duplicate rule')
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to duplicate rule',
        variant: 'destructive'
      })
    }
  }

  const handleSaveRule = (rule: AutomationRule) => {
    setShowBuilder(false)
    setEditingRule(null)
    fetchRules()
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

  const getExecutionStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge variant="default" className="bg-green-500">Success</Badge>
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>
      case 'partial':
        return <Badge variant="secondary">Partial</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  const filteredRules = rules.filter(rule => {
    if (filter) {
      const searchLower = filter.toLowerCase()
      return rule.name.toLowerCase().includes(searchLower) ||
             rule.description.toLowerCase().includes(searchLower)
    }
    return true
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[600px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading automation rules...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Automation Rules</h2>
          <p className="text-muted-foreground">
            Create and manage workflow automation rules
          </p>
        </div>
        <Button onClick={() => setShowBuilder(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Rule
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Rules</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{rules.length}</div>
            <p className="text-xs text-muted-foreground">
              {rules.filter(r => r.is_active).length} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Executions Today</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {executionLogs.filter(log => 
                new Date(log.executed_at).toDateString() === new Date().toDateString()
              ).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Last 24 hours
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {executionLogs.length > 0 
                ? Math.round(executionLogs.filter(l => l.execution_status === 'success').length / executionLogs.length * 100)
                : 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              Overall performance
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed Rules</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {executionLogs.filter(l => l.execution_status === 'failed').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Requires attention
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="rules" className="space-y-4">
        <TabsList>
          <TabsTrigger value="rules">
            <Zap className="h-4 w-4 mr-2" />
            Rules
          </TabsTrigger>
          <TabsTrigger value="executions">
            <Activity className="h-4 w-4 mr-2" />
            Execution History
          </TabsTrigger>
          <TabsTrigger value="analytics">
            <BarChart3 className="h-4 w-4 mr-2" />
            Analytics
          </TabsTrigger>
        </TabsList>

        {/* Rules Tab */}
        <TabsContent value="rules" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search rules..."
                      value={filter}
                      onChange={(e) => setFilter(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                </div>
                <Select value={activeFilter} onValueChange={setActiveFilter}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Rules</SelectItem>
                    <SelectItem value="true">Active</SelectItem>
                    <SelectItem value="false">Inactive</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={workflowFilter} onValueChange={setWorkflowFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Workflows</SelectItem>
                    {/* Workflows would be populated here */}
                  </SelectContent>
                </Select>
                <Button variant="outline" size="icon" onClick={fetchRules}>
                  <Filter className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Rules List */}
          <div className="space-y-4">
            {filteredRules.map((rule) => (
              <Card key={rule.id}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-lg">{rule.name}</h3>
                        {rule.is_active ? (
                          <Badge variant="default" className="bg-green-500">Active</Badge>
                        ) : (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                        <Badge variant="outline" className="flex items-center gap-1">
                          {getTriggerIcon(rule.trigger_type)}
                          {rule.trigger_type.replace('_', ' ')}
                        </Badge>
                        {rule.workflow_template && (
                          <Badge variant="outline">
                            {rule.workflow_template.name}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{rule.description}</p>
                      
                      {/* Rule Details */}
                      <div className="flex items-center gap-6 text-sm">
                        <div className="flex items-center gap-1">
                          <GitBranch className="h-3 w-3 text-muted-foreground" />
                          <span className="text-muted-foreground">
                            {(rule.conditions.all?.length || 0) + (rule.conditions.any?.length || 0)} conditions
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Play className="h-3 w-3 text-muted-foreground" />
                          <span className="text-muted-foreground">
                            {rule.actions.length} actions
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <TrendingUp className="h-3 w-3 text-muted-foreground" />
                          <span className="text-muted-foreground">
                            Priority: {rule.priority}
                          </span>
                        </div>
                      </div>
                      
                      {/* Execution Stats */}
                      {rule.execution_stats && rule.execution_stats.total_executions > 0 && (
                        <div className="flex items-center gap-4 text-sm pt-2">
                          <div>
                            <span className="text-muted-foreground">Executions:</span>{' '}
                            <span className="font-medium">{rule.execution_stats.total_executions}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Success Rate:</span>{' '}
                            <span className="font-medium text-green-600">
                              {rule.execution_stats.success_rate}%
                            </span>
                          </div>
                          {rule.execution_stats.failed_executions > 0 && (
                            <div>
                              <span className="text-muted-foreground">Failed:</span>{' '}
                              <span className="font-medium text-red-600">
                                {rule.execution_stats.failed_executions}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    
                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleRule(rule)}
                      >
                        {rule.is_active ? (
                          <Pause className="h-4 w-4" />
                        ) : (
                          <Play className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingRule(rule)
                          setShowBuilder(true)
                        }}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDuplicateRule(rule)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteRule(rule.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            
            {filteredRules.length === 0 && (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Zap className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No automation rules found</h3>
                  <p className="text-muted-foreground text-center mb-4">
                    {filter ? 'Try adjusting your search criteria' : 'Create your first automation rule to get started'}
                  </p>
                  <Button onClick={() => setShowBuilder(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Rule
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Execution History Tab */}
        <TabsContent value="executions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Executions</CardTitle>
              <CardDescription>
                View the execution history of your automation rules
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {executionLogs.map((log) => (
                  <div key={log.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {rules.find(r => r.id === log.rule_id)?.name || 'Unknown Rule'}
                        </span>
                        {getExecutionStatusBadge(log.execution_status)}
                      </div>
                      {log.error_message && (
                        <p className="text-sm text-red-600">{log.error_message}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {new Date(log.executed_at).toLocaleString()}
                      </p>
                    </div>
                    <Button variant="outline" size="sm">
                      View Details
                    </Button>
                  </div>
                ))}
                
                {executionLogs.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No execution history available</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Automation Analytics</CardTitle>
              <CardDescription>
                Performance insights for your automation rules
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Analytics coming soon</p>
                <p className="text-sm">Track rule performance, execution trends, and optimization opportunities</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Automation Rule Builder Dialog */}
      {/* <Dialog open={showBuilder} onOpenChange={setShowBuilder}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <AutomationRuleBuilder
            rule={editingRule || undefined}
            workflowId={workflowFilter !== 'all' ? workflowFilter : undefined}
            onSave={handleSaveRule}
            onCancel={() => {
              setShowBuilder(false)
              setEditingRule(null)
            }}
          />
        </DialogContent>
      </Dialog> */}
      
      {showBuilder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4">
            <h3 className="text-lg font-medium mb-4">Automation Builder</h3>
            <p className="text-gray-600 mb-4">
              Automation rule builder temporarily disabled for v2.0. 
              This feature will be available in v3.0.
            </p>
            <Button onClick={() => setShowBuilder(false)}>Close</Button>
          </div>
        </div>
      )}
    </div>
  )
}