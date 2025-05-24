'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useToast } from '@/hooks/use-toast'
import { 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  RefreshCw,
  Database,
  ShoppingCart,
  Package,
  ClipboardList,
  Settings
} from 'lucide-react'

interface DiagnosticResult {
  test: string
  status: 'success' | 'error' | 'warning'
  message: string
  details?: any
}

export default function DebugPage() {
  const [results, setResults] = useState<DiagnosticResult[]>([])
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const runDiagnostics = async () => {
    setLoading(true)
    setResults([])
    const newResults: DiagnosticResult[] = []

    try {
      // Test 1: Database connection
      const dbTest = await fetch('/api/health')
      const dbResult = await dbTest.json()
      newResults.push({
        test: 'Database Connection',
        status: dbTest.ok ? 'success' : 'error',
        message: dbTest.ok ? 'Database connected' : 'Database connection failed',
        details: dbResult
      })

      // Test 2: Shopify connection
      const shopifyTest = await fetch('/api/test-shopify')
      const shopifyResult = await shopifyTest.json()
      newResults.push({
        test: 'Shopify Connection',
        status: shopifyResult.success ? 'success' : 'error',
        message: shopifyResult.message || 'Shopify test failed',
        details: shopifyResult
      })

      // Test 3: Check orders
      const ordersResponse = await fetch('/api/orders')
      const ordersData = await ordersResponse.json()
      newResults.push({
        test: 'Orders in Database',
        status: ordersData.length > 0 ? 'success' : 'warning',
        message: `Found ${ordersData.length || 0} orders`,
        details: { count: ordersData.length || 0 }
      })

      // Test 4: Check tasks
      const tasksResponse = await fetch('/api/tasks')
      const tasksData = await tasksResponse.json()
      newResults.push({
        test: 'Tasks in Database',
        status: tasksData.length > 0 ? 'success' : 'warning',
        message: `Found ${tasksData.length || 0} tasks`,
        details: { count: tasksData.length || 0 }
      })

      // Test 5: Check workers
      const workersResponse = await fetch('/api/workers')
      const workersData = await workersResponse.json()
      newResults.push({
        test: 'Workers in Database',
        status: workersData.length > 0 ? 'success' : 'warning',
        message: `Found ${workersData.length || 0} workers`,
        details: { count: workersData.length || 0 }
      })

      // Test 6: Shopify sync endpoint
      try {
        const syncTest = await fetch('/api/shopify/sync', { method: 'POST' })
        const syncResult = await syncTest.json()
        newResults.push({
          test: 'Shopify Sync Endpoint',
          status: syncResult.success ? 'success' : 'error',
          message: syncResult.message || 'Sync endpoint failed',
          details: syncResult
        })
      } catch (error) {
        newResults.push({
          test: 'Shopify Sync Endpoint',
          status: 'error',
          message: 'Failed to call sync endpoint',
          details: error
        })
      }

    } catch (error) {
      newResults.push({
        test: 'General Error',
        status: 'error',
        message: 'Diagnostic tests failed',
        details: error
      })
    }

    setResults(newResults)
    setLoading(false)
  }

  const testImport = async () => {
    try {
      // First, fetch orders
      const syncResponse = await fetch('/api/shopify/sync', { method: 'POST' })
      const syncData = await syncResponse.json()
      
      if (!syncData.success || !syncData.orders || syncData.orders.length === 0) {
        toast({
          title: 'No orders found',
          description: 'No orders available to import from Shopify',
          variant: 'destructive'
        })
        return
      }

      // Get first order with line items
      const testOrder = syncData.orders.find((order: any) => 
        order.line_items && order.line_items.length > 0
      )
      
      if (!testOrder) {
        toast({
          title: 'No valid orders',
          description: 'No orders with line items found',
          variant: 'destructive'
        })
        return
      }

      // Import first line item
      const importResponse = await fetch('/api/shopify/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: testOrder.id,
          lineItemIds: [testOrder.line_items[0].id]
        })
      })

      const importResult = await importResponse.json()
      
      if (importResult.success) {
        toast({
          title: 'Import successful!',
          description: `Created ${importResult.itemsCreated} items and ${importResult.tasksCreated} tasks`
        })
        
        // Refresh diagnostics
        runDiagnostics()
      } else {
        toast({
          title: 'Import failed',
          description: importResult.error || 'Unknown error',
          variant: 'destructive'
        })
      }
    } catch (error) {
      toast({
        title: 'Test import failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive'
      })
    }
  }

  useEffect(() => {
    runDiagnostics()
  }, [])

  const getIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'error': return <XCircle className="h-5 w-5 text-red-500" />
      case 'warning': return <AlertCircle className="h-5 w-5 text-yellow-500" />
      default: return null
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">System Diagnostics</h2>
          <p className="text-muted-foreground">
            Debug import issues and check system status
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={runDiagnostics} 
            disabled={loading}
            variant="outline"
          >
            {loading ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Run Diagnostics
          </Button>
          <Button onClick={testImport} variant="default">
            Test Import
          </Button>
        </div>
      </div>

      {/* Results */}
      <div className="space-y-4">
        {results.map((result, index) => (
          <Card key={index}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  {getIcon(result.status)}
                  {result.test}
                </CardTitle>
                <Badge variant={
                  result.status === 'success' ? 'default' :
                  result.status === 'error' ? 'destructive' : 'secondary'
                }>
                  {result.status}
                </Badge>
              </div>
              <CardDescription>{result.message}</CardDescription>
            </CardHeader>
            {result.details && (
              <CardContent>
                <pre className="text-xs bg-muted p-2 rounded overflow-auto">
                  {JSON.stringify(result.details, null, 2)}
                </pre>
              </CardContent>
            )}
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common fixes for import issues</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Import not working?</strong> Try these steps:
              <ol className="list-decimal list-inside mt-2 space-y-1">
                <li>Click &quot;Test Import&quot; above to import one test order</li>
                <li>Check if Shopify connection shows &quot;success&quot;</li>
                <li>Verify you have active workers in the system</li>
                <li>Check browser console for errors (F12)</li>
              </ol>
            </AlertDescription>
          </Alert>
          
          <div className="grid gap-2">
            <Button 
              variant="outline" 
              className="justify-start"
              onClick={() => window.location.href = '/manager/settings'}
            >
              <Settings className="h-4 w-4 mr-2" />
              Check Shopify Settings
            </Button>
            <Button 
              variant="outline" 
              className="justify-start"
              onClick={() => window.location.href = '/manager/orders'}
            >
              <ShoppingCart className="h-4 w-4 mr-2" />
              Go to Orders Page
            </Button>
            <Button 
              variant="outline" 
              className="justify-start"
              onClick={() => window.location.href = '/manager/tasks'}
            >
              <ClipboardList className="h-4 w-4 mr-2" />
              View Tasks
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}