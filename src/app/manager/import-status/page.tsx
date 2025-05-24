'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle, XCircle, RefreshCw, Database, Package, ClipboardList } from 'lucide-react'

export default function ImportStatusPage() {
  const [status, setStatus] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const checkStatus = async () => {
    setLoading(true)
    try {
      // Check database counts
      const [ordersRes, itemsRes, tasksRes] = await Promise.all([
        fetch('/api/orders'),
        fetch('/api/orders?count=items'),
        fetch('/api/tasks')
      ])
      
      const orders = await ordersRes.json()
      const items = await itemsRes.json()
      const tasks = await tasksRes.json()
      
      // Try test import
      const testRes = await fetch('/api/test-import')
      const testResult = await testRes.json()
      
      setStatus({
        database: {
          orders: orders.orders?.length || 0,
          orderItems: items.count || 0,
          tasks: tasks.total || 0
        },
        testImport: testResult,
        success: testRes.ok
      })
    } catch (error) {
      setStatus({
        error: error instanceof Error ? error.message : 'Failed to check status',
        success: false
      })
    } finally {
      setLoading(false)
    }
  }
  
  useEffect(() => {
    checkStatus()
  }, [])
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Checking import status...</p>
        </div>
      </div>
    )
  }
  
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Import Status Check</h2>
        <p className="text-muted-foreground">
          Current state of the import system and database
        </p>
      </div>
      
      {/* Database Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Database Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 bg-muted rounded">
              <Package className="h-8 w-8 mx-auto mb-2 text-blue-600" />
              <p className="text-2xl font-bold">{status?.database?.orders || 0}</p>
              <p className="text-sm text-muted-foreground">Orders</p>
            </div>
            <div className="text-center p-4 bg-muted rounded">
              <Package className="h-8 w-8 mx-auto mb-2 text-green-600" />
              <p className="text-2xl font-bold">{status?.database?.orderItems || 0}</p>
              <p className="text-sm text-muted-foreground">Order Items</p>
            </div>
            <div className="text-center p-4 bg-muted rounded">
              <ClipboardList className="h-8 w-8 mx-auto mb-2 text-purple-600" />
              <p className="text-2xl font-bold">{status?.database?.tasks || 0}</p>
              <p className="text-sm text-muted-foreground">Tasks</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Test Import Result */}
      <Card>
        <CardHeader>
          <CardTitle>Test Import Result</CardTitle>
          <CardDescription>
            Automatic test import of first available order
          </CardDescription>
        </CardHeader>
        <CardContent>
          {status?.success ? (
            <div className="space-y-4">
              <Alert className="border-green-500">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription>
                  Test import successful!
                </AlertDescription>
              </Alert>
              
              {status.testImport && (
                <div className="space-y-3">
                  <div>
                    <h4 className="font-medium mb-1">Imported Order:</h4>
                    <p className="text-sm text-muted-foreground">
                      Order #{status.testImport.order?.number} (ID: {status.testImport.order?.id})
                    </p>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-1">Import Results:</h4>
                    <div className="text-sm space-y-1">
                      <p>Items Created: {status.testImport.importResult?.itemsCreated || 0}</p>
                      <p>Tasks Created: {status.testImport.importResult?.tasksCreated || 0}</p>
                    </div>
                  </div>
                  
                  {status.testImport.recentTasks?.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-1">Recent Tasks:</h4>
                      <div className="space-y-1">
                        {status.testImport.recentTasks.map((task: any) => (
                          <div key={task.id} className="text-xs p-2 bg-muted rounded">
                            {task.task_description} - Stage: {task.stage}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <Alert className="border-red-500">
              <XCircle className="h-4 w-4 text-red-600" />
              <AlertDescription>
                {status?.error || status?.testImport?.error || 'Test import failed'}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
      
      <div className="flex justify-center">
        <Button onClick={checkStatus} disabled={loading}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh Status
        </Button>
      </div>
    </div>
  )
}