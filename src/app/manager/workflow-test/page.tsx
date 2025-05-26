'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  ArrowRight,
  Workflow,
  Package,
  QrCode,
  Shield,
  Users,
  ClipboardCheck,
  RefreshCw
} from 'lucide-react'

interface TestResult {
  feature: string
  status: 'pass' | 'fail' | 'warning'
  message: string
  details?: string[]
}

export default function WorkflowTestPage() {
  const [testResults, setTestResults] = useState<TestResult[]>([])
  const [testing, setTesting] = useState(false)
  const [currentTest, setCurrentTest] = useState('')

  const runTests = async () => {
    setTesting(true)
    setTestResults([])
    
    const tests = [
      { name: 'Database Connection', endpoint: '/api/health' },
      { name: 'Worker Authentication', endpoint: '/api/worker/me' },
      { name: 'Quality Analytics', endpoint: '/api/quality/analytics?period=week' },
      { name: 'Component Tracking', endpoint: '/api/components/search?query=test' },
      { name: 'Workflow Templates', endpoint: '/api/workflows' },
      { name: 'Quality Checkpoints', endpoint: '/api/quality/checkpoints' },
      { name: 'User Management', endpoint: '/api/workers?includeInactive=true' },
      { name: 'Automation Rules', endpoint: '/api/automation/rules' }
    ]
    
    for (const test of tests) {
      setCurrentTest(test.name)
      
      try {
        const response = await fetch(test.endpoint)
        const data = await response.json()
        
        if (response.ok) {
          setTestResults(prev => [...prev, {
            feature: test.name,
            status: 'pass',
            message: 'Feature is working correctly',
            details: [`Response status: ${response.status}`, `Data received: ${JSON.stringify(data).substring(0, 100)}...`]
          }])
        } else {
          setTestResults(prev => [...prev, {
            feature: test.name,
            status: 'fail',
            message: `Error: ${data.error || 'Unknown error'}`,
            details: [`Response status: ${response.status}`]
          }])
        }
      } catch (error) {
        setTestResults(prev => [...prev, {
          feature: test.name,
          status: 'fail',
          message: 'Failed to connect to endpoint',
          details: [`Error: ${error}`]
        }])
      }
      
      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 500))
    }
    
    setTesting(false)
    setCurrentTest('')
  }

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'pass': return CheckCircle
      case 'fail': return XCircle
      case 'warning': return AlertCircle
    }
  }

  const getStatusColor = (status: TestResult['status']) => {
    switch (status) {
      case 'pass': return 'text-green-600'
      case 'fail': return 'text-red-600'
      case 'warning': return 'text-yellow-600'
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Workflow Integration Test</h1>
          <p className="text-muted-foreground">Verify all V3 features are working correctly</p>
        </div>
        <Button onClick={runTests} disabled={testing}>
          {testing ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Testing...
            </>
          ) : (
            <>
              <ClipboardCheck className="mr-2 h-4 w-4" />
              Run Tests
            </>
          )}
        </Button>
      </div>

      {testing && currentTest && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Currently testing: <strong>{currentTest}</strong>
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Test Overview</TabsTrigger>
          <TabsTrigger value="workflow">Workflow Integration</TabsTrigger>
          <TabsTrigger value="checklist">Manual Checklist</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {testResults.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <ClipboardCheck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Click &quot;Run Tests&quot; to verify all features</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {testResults.map((result, index) => {
                const Icon = getStatusIcon(result.status)
                return (
                  <Card key={index}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Icon className={`h-5 w-5 ${getStatusColor(result.status)}`} />
                          {result.feature}
                        </CardTitle>
                        <Badge variant={result.status === 'pass' ? 'default' : 'destructive'}>
                          {result.status.toUpperCase()}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm">{result.message}</p>
                      {result.details && (
                        <ul className="mt-2 text-xs text-muted-foreground">
                          {result.details.map((detail, i) => (
                            <li key={i}>• {detail}</li>
                          ))}
                        </ul>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
              
              {/* Summary */}
              <Card className="bg-muted/50">
                <CardHeader>
                  <CardTitle>Test Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-4">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span>Passed: {testResults.filter(r => r.status === 'pass').length}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <XCircle className="h-4 w-4 text-red-600" />
                      <span>Failed: {testResults.filter(r => r.status === 'fail').length}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-yellow-600" />
                      <span>Warnings: {testResults.filter(r => r.status === 'warning').length}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="workflow" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>V3 Workflow Integration Flow</CardTitle>
              <CardDescription>Visual representation of how features connect</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Workflow Steps */}
                <div className="flex items-center gap-3">
                  <Package className="h-8 w-8 text-blue-600" />
                  <ArrowRight className="h-4 w-4" />
                  <Workflow className="h-8 w-8 text-purple-600" />
                  <ArrowRight className="h-4 w-4" />
                  <QrCode className="h-8 w-8 text-green-600" />
                  <ArrowRight className="h-4 w-4" />
                  <Shield className="h-8 w-8 text-orange-600" />
                  <ArrowRight className="h-4 w-4" />
                  <Users className="h-8 w-8 text-indigo-600" />
                </div>
                
                <div className="grid grid-cols-5 gap-4 text-sm">
                  <div>
                    <h4 className="font-semibold mb-1">1. Order Import</h4>
                    <p className="text-xs text-muted-foreground">
                      Orders synced from Shopify create work items
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">2. Workflow Assignment</h4>
                    <p className="text-xs text-muted-foreground">
                      Items grouped into batches with V3 workflows
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">3. Component Tracking</h4>
                    <p className="text-xs text-muted-foreground">
                      QR codes generated, components tracked
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">4. Quality Checkpoints</h4>
                    <p className="text-xs text-muted-foreground">
                      Workers complete inspections at each stage
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">5. Worker Dashboard</h4>
                    <p className="text-xs text-muted-foreground">
                      Quality metrics and achievements displayed
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="checklist" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Manual Testing Checklist</CardTitle>
              <CardDescription>Features to test manually for full verification</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <h4 className="font-semibold">Manager Features</h4>
                  <div className="space-y-1 text-sm">
                    <label className="flex items-center gap-2">
                      <input type="checkbox" className="rounded" />
                      Create workflow with quality checkpoints
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" className="rounded" />
                      View quality analytics dashboard
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" className="rounded" />
                      Manage quality holds
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" className="rounded" />
                      Approve/reject worker registrations
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" className="rounded" />
                      Send worker invitations
                    </label>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-semibold">Worker Features</h4>
                  <div className="space-y-1 text-sm">
                    <label className="flex items-center gap-2">
                      <input type="checkbox" className="rounded" />
                      Complete quality checkpoint
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" className="rounded" />
                      View personal quality metrics
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" className="rounded" />
                      Scan component QR code
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" className="rounded" />
                      View quality patterns
                    </label>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-semibold">Integration Tests</h4>
                  <div className="space-y-1 text-sm">
                    <label className="flex items-center gap-2">
                      <input type="checkbox" className="rounded" />
                      Failed inspection creates quality hold
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" className="rounded" />
                      Component journey shows all checkpoints
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" className="rounded" />
                      Quality patterns detected from failures
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" className="rounded" />
                      Analytics update in real-time
                    </label>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}