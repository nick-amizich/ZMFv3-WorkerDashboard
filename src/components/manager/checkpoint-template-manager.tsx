'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { 
  Edit, 
  Plus, 
  Trash2, 
  Save, 
  Copy,
  CheckCircle,
  AlertCircle,
  Camera,
  Ruler,
  Eye,
  Settings
} from 'lucide-react'

interface QualityCheck {
  id: string
  description: string
  requires_photo: boolean
  requires_measurement: boolean
  acceptance_criteria: string
  common_failures: string[]
}

interface CheckpointTemplate {
  id: string
  stage_name: string
  checkpoint_type: 'pre_work' | 'in_process' | 'post_work' | 'gate'
  template_name: string
  checks: QualityCheck[]
  is_default: boolean
  created_at: string
}

export function CheckpointTemplateManager() {
  const [templates, setTemplates] = useState<CheckpointTemplate[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<CheckpointTemplate | null>(null)
  const [editMode, setEditMode] = useState(false)
  const [newTemplate, setNewTemplate] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    fetchTemplates()
  }, [])

  const fetchTemplates = async () => {
    try {
      const response = await fetch('/api/quality/checkpoint-templates')
      if (response.ok) {
        const data = await response.json()
        setTemplates(data.templates || [])
      }
    } catch (error) {
      console.error('Failed to fetch templates:', error)
      toast({
        title: 'Error',
        description: 'Failed to load checkpoint templates',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const saveTemplate = async (template: CheckpointTemplate) => {
    setSaving(true)
    try {
      const method = template.id.startsWith('new-') ? 'POST' : 'PUT'
      const url = template.id.startsWith('new-') 
        ? '/api/quality/checkpoint-templates' 
        : `/api/quality/checkpoint-templates/${template.id}`

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stage_name: template.stage_name,
          checkpoint_type: template.checkpoint_type,
          template_name: template.template_name,
          checks: template.checks,
          is_default: template.is_default
        })
      })

      if (response.ok) {
        await fetchTemplates()
        setEditMode(false)
        setNewTemplate(false)
        setSelectedTemplate(null)
        toast({
          title: 'Success',
          description: 'Checkpoint template saved successfully'
        })
      } else {
        throw new Error('Failed to save template')
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save checkpoint template',
        variant: 'destructive'
      })
    } finally {
      setSaving(false)
    }
  }

  const deleteTemplate = async (templateId: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return

    try {
      const response = await fetch(`/api/quality/checkpoint-templates/${templateId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        await fetchTemplates()
        if (selectedTemplate?.id === templateId) {
          setSelectedTemplate(null)
        }
        toast({
          title: 'Success',
          description: 'Template deleted successfully'
        })
      } else {
        throw new Error('Failed to delete template')
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete template',
        variant: 'destructive'
      })
    }
  }

  const duplicateTemplate = (template: CheckpointTemplate) => {
    const newId = `new-${Date.now()}`
    const duplicated: CheckpointTemplate = {
      ...template,
      id: newId,
      template_name: `${template.template_name} (Copy)`,
      is_default: false,
      created_at: new Date().toISOString()
    }
    setSelectedTemplate(duplicated)
    setEditMode(true)
    setNewTemplate(true)
  }

  const createNewTemplate = () => {
    const newId = `new-${Date.now()}`
    const template: CheckpointTemplate = {
      id: newId,
      stage_name: '',
      checkpoint_type: 'pre_work',
      template_name: '',
      checks: [
        {
          id: `check-${Date.now()}`,
          description: '',
          requires_photo: false,
          requires_measurement: false,
          acceptance_criteria: '',
          common_failures: []
        }
      ],
      is_default: false,
      created_at: new Date().toISOString()
    }
    setSelectedTemplate(template)
    setEditMode(true)
    setNewTemplate(true)
  }

  const addCheck = () => {
    if (!selectedTemplate) return
    
    const newCheck: QualityCheck = {
      id: `check-${Date.now()}`,
      description: '',
      requires_photo: false,
      requires_measurement: false,
      acceptance_criteria: '',
      common_failures: []
    }

    setSelectedTemplate({
      ...selectedTemplate,
      checks: [...selectedTemplate.checks, newCheck]
    })
  }

  const updateCheck = (checkId: string, updates: Partial<QualityCheck>) => {
    if (!selectedTemplate) return

    setSelectedTemplate({
      ...selectedTemplate,
      checks: selectedTemplate.checks.map(check => 
        check.id === checkId ? { ...check, ...updates } : check
      )
    })
  }

  const removeCheck = (checkId: string) => {
    if (!selectedTemplate) return

    setSelectedTemplate({
      ...selectedTemplate,
      checks: selectedTemplate.checks.filter(check => check.id !== checkId)
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  const stages = ['sanding', 'assembly', 'wiring', 'finishing', 'qc', 'packaging']
  const checkpointTypes = [
    { value: 'pre_work', label: 'Pre-Work' },
    { value: 'in_process', label: 'In-Process' },
    { value: 'post_work', label: 'Post-Work' },
    { value: 'gate', label: 'Quality Gate' }
  ]

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Quality Checkpoint Templates</h3>
          <p className="text-sm text-muted-foreground">
            Manage reusable quality checkpoint templates for different stages
          </p>
        </div>
        <Button onClick={createNewTemplate}>
          <Plus className="h-4 w-4 mr-2" />
          New Template
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Template List */}
        <Card>
          <CardHeader>
            <CardTitle>Templates</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {templates.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No templates found. Create your first template to get started.
                </p>
              ) : (
                templates.map(template => (
                  <div 
                    key={template.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedTemplate?.id === template.id 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'hover:bg-gray-50'
                    }`}
                    onClick={() => {
                      setSelectedTemplate(template)
                      setEditMode(false)
                      setNewTemplate(false)
                    }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium">{template.template_name}</h4>
                          {template.is_default && (
                            <Badge variant="secondary" className="text-xs">Default</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {template.stage_name} • {template.checkpoint_type.replace('_', ' ')}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {template.checks.length} checks
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedTemplate(template)
                            setEditMode(true)
                            setNewTemplate(false)
                          }}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation()
                            duplicateTemplate(template)
                          }}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                        {!template.is_default && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation()
                              deleteTemplate(template.id)
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Template Details/Editor */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>
                {editMode 
                  ? (newTemplate ? 'New Template' : 'Edit Template') 
                  : 'Template Details'
                }
              </CardTitle>
              {selectedTemplate && !editMode && (
                <Button
                  size="sm"
                  onClick={() => setEditMode(true)}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {!selectedTemplate ? (
              <div className="text-center py-8">
                <Eye className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">Select a template to view details</p>
              </div>
            ) : editMode ? (
              <div className="space-y-4">
                {/* Template Meta */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="template_name">Template Name</Label>
                    <Input
                      id="template_name"
                      value={selectedTemplate.template_name}
                      onChange={(e) => setSelectedTemplate({
                        ...selectedTemplate,
                        template_name: e.target.value
                      })}
                      placeholder="e.g., Standard Sanding Pre-Check"
                    />
                  </div>
                  <div>
                    <Label htmlFor="stage_name">Stage</Label>
                    <Select
                      value={selectedTemplate.stage_name}
                      onValueChange={(value) => setSelectedTemplate({
                        ...selectedTemplate,
                        stage_name: value
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select stage" />
                      </SelectTrigger>
                      <SelectContent>
                        {stages.map(stage => (
                          <SelectItem key={stage} value={stage}>
                            {stage.charAt(0).toUpperCase() + stage.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="checkpoint_type">Checkpoint Type</Label>
                    <Select
                      value={selectedTemplate.checkpoint_type}
                      onValueChange={(value) => setSelectedTemplate({
                        ...selectedTemplate,
                        checkpoint_type: value as CheckpointTemplate['checkpoint_type']
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {checkpointTypes.map(type => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="is_default"
                      checked={selectedTemplate.is_default}
                      onCheckedChange={(checked) => setSelectedTemplate({
                        ...selectedTemplate,
                        is_default: checked
                      })}
                    />
                    <Label htmlFor="is_default">Default template</Label>
                  </div>
                </div>

                {/* Quality Checks */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-medium">Quality Checks</Label>
                    <Button size="sm" onClick={addCheck}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Check
                    </Button>
                  </div>

                  {selectedTemplate.checks.map((check, index) => (
                    <Card key={check.id} className="p-4 border-dashed">
                      <div className="space-y-3">
                        <div className="flex items-start justify-between">
                          <Label className="text-sm font-medium">Check {index + 1}</Label>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removeCheck(check.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>

                        <div>
                          <Label htmlFor={`desc-${check.id}`}>Description</Label>
                          <Input
                            id={`desc-${check.id}`}
                            value={check.description}
                            onChange={(e) => updateCheck(check.id, { description: e.target.value })}
                            placeholder="What should be checked?"
                          />
                        </div>

                        <div>
                          <Label htmlFor={`criteria-${check.id}`}>Acceptance Criteria</Label>
                          <Textarea
                            id={`criteria-${check.id}`}
                            value={check.acceptance_criteria}
                            onChange={(e) => updateCheck(check.id, { acceptance_criteria: e.target.value })}
                            placeholder="What defines a pass?"
                            rows={2}
                          />
                        </div>

                        <div>
                          <Label htmlFor={`failures-${check.id}`}>Common Failures</Label>
                          <Input
                            id={`failures-${check.id}`}
                            value={check.common_failures.join(', ')}
                            onChange={(e) => updateCheck(check.id, { 
                              common_failures: e.target.value.split(',').map(s => s.trim()).filter(s => s)
                            })}
                            placeholder="Common failure modes (comma separated)"
                          />
                        </div>

                        <div className="flex gap-4">
                          <div className="flex items-center space-x-2">
                            <Switch
                              id={`photo-${check.id}`}
                              checked={check.requires_photo}
                              onCheckedChange={(checked) => updateCheck(check.id, { requires_photo: checked })}
                            />
                            <Label htmlFor={`photo-${check.id}`} className="flex items-center gap-1">
                              <Camera className="h-3 w-3" />
                              Photo Required
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Switch
                              id={`measurement-${check.id}`}
                              checked={check.requires_measurement}
                              onCheckedChange={(checked) => updateCheck(check.id, { requires_measurement: checked })}
                            />
                            <Label htmlFor={`measurement-${check.id}`} className="flex items-center gap-1">
                              <Ruler className="h-3 w-3" />
                              Measurement Required
                            </Label>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>

                {/* Save/Cancel */}
                <div className="flex gap-2 pt-4 border-t">
                  <Button
                    onClick={() => saveTemplate(selectedTemplate)}
                    disabled={saving || !selectedTemplate.template_name || !selectedTemplate.stage_name}
                  >
                    {saving ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Save Template
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setEditMode(false)
                      if (newTemplate) {
                        setSelectedTemplate(null)
                        setNewTemplate(false)
                      }
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Template Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm text-muted-foreground">Stage</Label>
                    <p className="font-medium capitalize">{selectedTemplate.stage_name}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Type</Label>
                    <p className="font-medium">{selectedTemplate.checkpoint_type.replace('_', ' ')}</p>
                  </div>
                </div>

                {selectedTemplate.is_default && (
                  <Badge variant="secondary">Default Template</Badge>
                )}

                {/* Quality Checks Display */}
                <div className="space-y-3">
                  <Label className="text-base font-medium">Quality Checks ({selectedTemplate.checks.length})</Label>
                  {selectedTemplate.checks.map((check, index) => (
                    <Card key={check.id} className="p-3">
                      <div className="space-y-2">
                        <div className="flex items-start justify-between">
                          <h4 className="font-medium text-sm">
                            {index + 1}. {check.description}
                          </h4>
                          <div className="flex gap-1">
                            {check.requires_photo && (
                              <Badge variant="outline" className="text-xs">
                                <Camera className="h-3 w-3 mr-1" />
                                Photo
                              </Badge>
                            )}
                            {check.requires_measurement && (
                              <Badge variant="outline" className="text-xs">
                                <Ruler className="h-3 w-3 mr-1" />
                                Measurement
                              </Badge>
                            )}
                          </div>
                        </div>
                        
                        <div className="text-sm text-muted-foreground">
                          <div className="flex items-start gap-2">
                            <CheckCircle className="h-3 w-3 mt-0.5 text-green-600" />
                            <span>{check.acceptance_criteria}</span>
                          </div>
                        </div>

                        {check.common_failures.length > 0 && (
                          <div className="text-sm text-muted-foreground">
                            <div className="flex items-start gap-2">
                              <AlertCircle className="h-3 w-3 mt-0.5 text-orange-600" />
                              <span>Watch for: {check.common_failures.join(', ')}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 