'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import { Plus, Trash2, Save, RefreshCw, Package } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface HeadphoneModel {
  name: string
  is_active: boolean
}

export default function HeadphoneModelsPage() {
  const [models, setModels] = useState<HeadphoneModel[]>([])
  const [newModelName, setNewModelName] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  const fetchModels = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/settings/headphone-models')
      const result = await response.json()
      
      if (result.success) {
        setModels(result.models)
      } else {
        throw new Error(result.error || 'Failed to fetch models')
      }
    } catch (error) {
      toast({
        title: 'Failed to load models',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  const saveModels = async () => {
    setSaving(true)
    try {
      const modelNames = models.map(m => m.name)
      
      const response = await fetch('/api/settings/headphone-models', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ models: modelNames })
      })
      
      const result = await response.json()
      
      if (result.success) {
        toast({
          title: 'Models updated',
          description: `Successfully updated ${modelNames.length} headphone models`
        })
        await fetchModels() // Refresh from server
      } else {
        throw new Error(result.error || 'Failed to save models')
      }
    } catch (error) {
      toast({
        title: 'Failed to save models',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive'
      })
    } finally {
      setSaving(false)
    }
  }

  const addModel = () => {
    if (!newModelName.trim()) {
      toast({
        title: 'Invalid model name',
        description: 'Please enter a valid headphone model name',
        variant: 'destructive'
      })
      return
    }

    // Check for duplicates
    if (models.some(m => m.name.toLowerCase() === newModelName.trim().toLowerCase())) {
      toast({
        title: 'Duplicate model',
        description: 'This model already exists in the list',
        variant: 'destructive'
      })
      return
    }

    setModels(prev => [...prev, { name: newModelName.trim(), is_active: true }])
    setNewModelName('')
  }

  const removeModel = (indexToRemove: number) => {
    setModels(prev => prev.filter((_, index) => index !== indexToRemove))
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      addModel()
    }
  }

  useEffect(() => {
    fetchModels()
  }, [fetchModels])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading headphone models...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Headphone Models</h2>
          <p className="text-muted-foreground">
            Manage headphone models for order import categorization
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline"
            onClick={fetchModels}
            disabled={loading}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button 
            onClick={saveModels}
            disabled={saving || models.length === 0}
            className="bg-green-600 hover:bg-green-700"
          >
            {saving ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Info Alert */}
      <Alert>
        <Package className="h-4 w-4" />
        <AlertDescription>
          These model names are used to automatically categorize products during Shopify order import. 
          Items matching these names will be treated as headphones and appear in the main section.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Add New Model */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Add New Model
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="e.g., Caldera, Auteur, Atticus..."
                value={newModelName}
                onChange={(e) => setNewModelName(e.target.value)}
                onKeyPress={handleKeyPress}
                className="flex-1"
              />
              <Button onClick={addModel} disabled={!newModelName.trim()}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Enter the exact model name as it appears in Shopify product titles
            </p>
          </CardContent>
        </Card>

        {/* Current Models */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Current Models ({models.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {models.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No headphone models configured</p>
                <p className="text-sm">Add your first model to get started</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {models.map((model, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Badge variant="default">{model.name}</Badge>
                      {model.is_active && (
                        <Badge variant="outline" className="text-xs">Active</Badge>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeModel(index)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Usage Examples */}
      <Card>
        <CardHeader>
          <CardTitle>How It Works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <h4 className="font-medium text-green-600">✅ Will be categorized as headphones:</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>• &quot;Caldera Headphone&quot;</li>
                <li>• &quot;Auteur Classic&quot;</li>
                <li>• &quot;Atticus&quot; (exact match)</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-orange-600">🔄 Will go to extras section:</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>• &quot;Caldera Pads&quot;</li>
                <li>• &quot;Auteur Cable&quot;</li>
                <li>• &quot;$0.00 Globo components&quot;</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 