'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useToast } from '@/hooks/use-toast'
import { Wrench, CheckCircle, AlertCircle } from 'lucide-react'

export default function FixDataPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const { toast } = useToast()
  
  const fixMissingTasks = async () => {
    setLoading(true)
    setResult(null)
    
    try {
      const response = await fetch('/api/fix-missing-tasks', {
        method: 'POST'
      })
      
      const data = await response.json()
      
      if (response.ok) {
        setResult(data)
        toast({
          title: 'Fix completed',
          description: `Created ${data.totalTasksCreated} tasks for ${data.itemsProcessed} items`
        })
      } else {
        throw new Error(data.error || 'Fix failed')
      }
    } catch (error) {
      toast({
        title: 'Fix failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Fix Missing Data</h2>
        <p className="text-muted-foreground">
          Repair missing tasks and data issues
        </p>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            Fix Missing Tasks
          </CardTitle>
          <CardDescription>
            This will create tasks for any order items that don&apos;t have tasks yet
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              This operation will:
              <ul className="list-disc list-inside mt-2">
                <li>Find all order items without tasks</li>
                <li>Determine product category (headphone, accessory, etc.)</li>
                <li>Create appropriate tasks (sanding, assembly, QC, packaging)</li>
                <li>Set estimated hours based on product type</li>
              </ul>
            </AlertDescription>
          </Alert>
          
          <Button 
            onClick={fixMissingTasks}
            disabled={loading}
            className="w-full"
          >
            {loading ? 'Running fix...' : 'Fix Missing Tasks'}
          </Button>
          
          {result && (
            <div className="space-y-3">
              <Alert className="border-green-500">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription>
                  Successfully created {result.totalTasksCreated} tasks for {result.itemsProcessed} items
                </AlertDescription>
              </Alert>
              
              {result.results && result.results.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium">Details:</h4>
                  <div className="text-sm space-y-1 max-h-60 overflow-y-auto">
                    {result.results.map((item: any, index: number) => (
                      <div key={index} className="p-2 bg-muted rounded flex justify-between">
                        <span>{item.item}</span>
                        <span className="text-muted-foreground">
                          {item.category} - {item.tasksCreated} tasks
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button 
            variant="outline" 
            className="w-full"
            onClick={() => window.location.href = '/manager/tasks'}
          >
            View All Tasks
          </Button>
          <Button 
            variant="outline" 
            className="w-full"
            onClick={() => window.location.href = '/manager/orders'}
          >
            Import More Orders
          </Button>
          <Button 
            variant="outline" 
            className="w-full"
            onClick={() => window.location.href = '/manager/import-status'}
          >
            Check Import Status
          </Button>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Import Test Data</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground mb-4">
            Import test data to verify system functionality. This won&apos;t affect production data.
          </p>
          <Button 
            variant="outline" 
            className="w-full"
            onClick={() => window.location.href = '/manager/import-test-data'}
          >
            Import Test Data
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}