'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle, XCircle, AlertCircle, Package, ClipboardList } from 'lucide-react'

export default function TestImportPage() {
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<any>(null)
  const { toast } = useToast()

  const runImportTest = async () => {
    setLoading(true)
    setResults(null)
    
    try {
      // Step 1: Fetch orders from Shopify
      const syncResponse = await fetch('/api/shopify/sync', {
        method: 'POST'
      })
      
      const syncResult = await syncResponse.json()
      
      if (!syncResult.success || !syncResult.orders?.length) {
        setResults({
          success: false,
          error: 'No orders found in Shopify'
        })
        return
      }
      
      // Step 2: Import the first order's first item
      const firstOrder = syncResult.orders[0]
      const firstItem = firstOrder.line_items[0]
      
      const importResponse = await fetch('/api/shopify/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          orderId: firstOrder.id,
          lineItemIds: [firstItem.id]
        })
      })
      
      const importResult = await importResponse.json()
      
      // Step 3: Verify tasks were created
      const tasksResponse = await fetch('/api/tasks')
      const tasksResult = await tasksResponse.json()
      
      setResults({
        success: importResponse.ok,
        order: {
          number: firstOrder.order_number,
          customer: firstOrder.customer?.first_name + ' ' + firstOrder.customer?.last_name,
          itemCount: firstOrder.line_items.length
        },
        importedItem: {
          name: firstItem.title,
          variant: firstItem.variant_title,
          specs: firstItem.headphone_specs
        },
        importResult,
        tasksCreated: tasksResult.total || 0,
        recentTasks: tasksResult.tasks?.slice(0, 5) || []
      })
      
      toast({
        title: importResponse.ok ? 'Test completed' : 'Test failed',
        description: importResponse.ok 
          ? `Created ${importResult.itemsCreated || 0} items and ${importResult.tasksCreated || 0} tasks`
          : importResult.error || 'Import failed'
      })
      
    } catch (error) {
      setResults({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      
      toast({
        title: 'Test failed',
        description: 'An error occurred during the test',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Test Import Process</h2>
        <p className="text-muted-foreground">
          Debug tool to verify the order import → task creation workflow
        </p>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Import Test</CardTitle>
          <CardDescription>
            This will fetch orders from Shopify and import the first item from the first order
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={runImportTest} 
            disabled={loading}
            className="w-full"
          >
            {loading ? 'Running test...' : 'Run Import Test'}
          </Button>
          
          {results && (
            <div className="space-y-4">
              <Alert className={results.success ? 'border-green-500' : 'border-red-500'}>
                {results.success ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-500" />
                )}
                <AlertDescription>
                  {results.success ? 'Import test successful!' : `Import test failed: ${results.error}`}
                </AlertDescription>
              </Alert>
              
              {results.order && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Order Details:</span>
                  </div>
                  <div className="pl-6 space-y-1 text-sm">
                    <p>Order Number: #{results.order.number}</p>
                    <p>Customer: {results.order.customer}</p>
                    <p>Total Items: {results.order.itemCount}</p>
                  </div>
                </div>
              )}
              
              {results.importedItem && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Imported Item:</span>
                  </div>
                  <div className="pl-6 space-y-1 text-sm">
                    <p>Product: {results.importedItem.name}</p>
                    {results.importedItem.variant && (
                      <p>Variant: {results.importedItem.variant}</p>
                    )}
                    <p>Category: {results.importedItem.specs?.product_category || 'Unknown'}</p>
                    {results.importedItem.specs?.requires_custom_work && (
                      <p className="text-orange-600">Requires custom work</p>
                    )}
                  </div>
                </div>
              )}
              
              {results.importResult && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <ClipboardList className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Import Result:</span>
                  </div>
                  <div className="pl-6 space-y-1 text-sm">
                    <p>Items Created: {results.importResult.itemsCreated || 0}</p>
                    <p>Tasks Created: {results.importResult.tasksCreated || 0}</p>
                    <p>Total Tasks in System: {results.tasksCreated}</p>
                  </div>
                </div>
              )}
              
              {results.recentTasks && results.recentTasks.length > 0 && (
                <div className="space-y-3">
                  <div className="font-medium">Recent Tasks:</div>
                  <div className="space-y-2">
                    {results.recentTasks.map((task: any) => (
                      <div key={task.id} className="text-sm p-2 bg-muted rounded">
                        <p className="font-medium">{task.task_description}</p>
                        <p className="text-xs text-muted-foreground">
                          Type: {task.task_type} | Stage: {task.stage || 'None'} | Status: {task.status}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {results.importResult?.details && (
                <div className="space-y-2">
                  <div className="font-medium">Import Details:</div>
                  <div className="text-xs font-mono bg-muted p-2 rounded">
                    {results.importResult.details.join('\n')}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Quick Links</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button variant="outline" className="w-full" onClick={() => window.location.href = '/manager/orders/import'}>
            Go to Import Page
          </Button>
          <Button variant="outline" className="w-full" onClick={() => window.location.href = '/manager/tasks'}>
            View All Tasks
          </Button>
          <Button variant="outline" className="w-full" onClick={() => window.location.href = '/manager/debug'}>
            System Debug Page
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}