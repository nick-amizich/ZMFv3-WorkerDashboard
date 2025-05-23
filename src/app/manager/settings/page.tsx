'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { Loader2, Save, TestTube, AlertCircle, CheckCircle2 } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

export default function SettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const { toast } = useToast()
  
  const [shopifyConfig, setShopifyConfig] = useState({
    store_domain: '',
    api_access_token: '',
    api_version: '2024-01',
    webhook_secret: '',
    sync_enabled: false,
    sync_interval_minutes: 15
  })
  
  const [showToken, setShowToken] = useState(false)
  
  useEffect(() => {
    fetchSettings()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  
  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/settings/shopify')
      if (response.ok) {
        const data = await response.json()
        setShopifyConfig(data)
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load settings',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }
  
  const handleSave = async () => {
    setSaving(true)
    try {
      const response = await fetch('/api/settings/shopify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(shopifyConfig)
      })
      
      if (!response.ok) throw new Error('Failed to save settings')
      
      toast({
        title: 'Settings saved',
        description: 'Shopify configuration updated successfully'
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save settings',
        variant: 'destructive'
      })
    } finally {
      setSaving(false)
    }
  }
  
  const handleTestConnection = async () => {
    setTesting(true)
    try {
      const response = await fetch('/api/settings/shopify/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          store_domain: shopifyConfig.store_domain,
          api_access_token: shopifyConfig.api_access_token
        })
      })
      
      const result = await response.json()
      
      if (response.ok && result.success) {
        toast({
          title: 'Connection successful',
          description: `Connected to ${result.shop_name}. ${result.order_count} orders found.`
        })
      } else {
        toast({
          title: 'Connection failed',
          description: result.error || 'Could not connect to Shopify',
          variant: 'destructive'
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to test connection',
        variant: 'destructive'
      })
    } finally {
      setTesting(false)
    }
  }
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }
  
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Settings</h2>
        <p className="text-muted-foreground">Configure your application settings</p>
      </div>
      
      <Tabs defaultValue="shopify" className="space-y-4">
        <TabsList>
          <TabsTrigger value="shopify">Shopify Integration</TabsTrigger>
          <TabsTrigger value="general">General</TabsTrigger>
        </TabsList>
        
        <TabsContent value="shopify" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Shopify Configuration</CardTitle>
              <CardDescription>
                Configure your Shopify store connection for order synchronization
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Your Shopify API token should have read-only access to orders, products, and customers.
                  Never share your API token or commit it to version control.
                </AlertDescription>
              </Alert>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="store_domain">Store Domain</Label>
                  <Input
                    id="store_domain"
                    placeholder="your-store.myshopify.com"
                    value={shopifyConfig.store_domain}
                    onChange={(e) => setShopifyConfig({
                      ...shopifyConfig,
                      store_domain: e.target.value
                    })}
                  />
                  <p className="text-sm text-muted-foreground">
                    Your Shopify store domain without https://
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="api_access_token">API Access Token</Label>
                  <div className="flex gap-2">
                    <Input
                      id="api_access_token"
                      type={showToken ? 'text' : 'password'}
                      placeholder="shpat_xxxxxxxxxxxxx"
                      value={shopifyConfig.api_access_token}
                      onChange={(e) => setShopifyConfig({
                        ...shopifyConfig,
                        api_access_token: e.target.value
                      })}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowToken(!showToken)}
                    >
                      {showToken ? 'Hide' : 'Show'}
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Private app access token with read permissions
                  </p>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="sync_enabled">Automatic Sync</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically sync orders every {shopifyConfig.sync_interval_minutes} minutes
                    </p>
                  </div>
                  <Switch
                    id="sync_enabled"
                    checked={shopifyConfig.sync_enabled}
                    onCheckedChange={(checked) => setShopifyConfig({
                      ...shopifyConfig,
                      sync_enabled: checked
                    })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="sync_interval">Sync Interval (minutes)</Label>
                  <Input
                    id="sync_interval"
                    type="number"
                    min="5"
                    max="60"
                    value={shopifyConfig.sync_interval_minutes}
                    onChange={(e) => setShopifyConfig({
                      ...shopifyConfig,
                      sync_interval_minutes: parseInt(e.target.value) || 15
                    })}
                  />
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button
                  onClick={handleTestConnection}
                  variant="outline"
                  disabled={testing || !shopifyConfig.store_domain || !shopifyConfig.api_access_token}
                >
                  {testing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Testing...
                    </>
                  ) : (
                    <>
                      <TestTube className="mr-2 h-4 w-4" />
                      Test Connection
                    </>
                  )}
                </Button>
                
                <Button
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Settings
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
              <CardDescription>
                Configure general application settings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Additional settings coming soon...
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}