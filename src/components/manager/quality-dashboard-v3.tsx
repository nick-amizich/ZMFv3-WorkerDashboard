'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle2,
  XCircle,
  BarChart3,
  Target,
  Shield,
  Clock,
  Users,
  Package,
  Zap,
  Activity,
  AlertCircle,
  Minus
} from 'lucide-react'

interface QualityData {
  period: {
    from: string
    to: string
  }
  overall: {
    firstPassYield: number
    defectRate: number
    reworkRate: number
    avgInspectionTime: number
    totalInspections: number
    passedInspections: number
    failedInspections: number
  }
  stage?: Array<{
    stage: string
    firstPassYield: number
    defectRate: number
    avgInspectionTime: number
    totalInspections: number
    topIssues: Array<{
      issue: string
      count: number
    }>
  }>
  worker?: Array<{
    workerId: string
    workerName: string
    firstPassYield: number
    totalInspections: number
    avgInspectionTime: number
    trend: 'improving' | 'stable' | 'declining'
  }>
  holds: {
    total: number
    critical: number
    resolved: number
  }
  reworks: {
    total: number
    byStage: Record<string, number>
  }
  trends: {
    firstPassYield: string
    defectRate: string
    reworkRate: string
  }
  topIssues: Array<{
    issue: string
    count: number
  }>
}

export function QualityDashboardV3() {
  const [data, setData] = useState<QualityData | null>(null)
  const [period, setPeriod] = useState('week')
  const [groupBy, setGroupBy] = useState('stage')
  const [loading, setLoading] = useState(true)
  const [selectedStage, setSelectedStage] = useState<string | null>(null)

  useEffect(() => {
    fetchQualityData()
  }, [period, groupBy])

  const fetchQualityData = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/quality/analytics?period=${period}&group_by=${groupBy}`)
      if (response.ok) {
        const data = await response.json()
        setData(data)
      }
    } catch (error) {
      console.error('Failed to fetch quality data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (value: number, thresholds: { good: number, warning: number }) => {
    if (value >= thresholds.good) return 'text-green-600'
    if (value >= thresholds.warning) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getTrendIcon = (trend: string) => {
    if (trend === 'improving') return <TrendingUp className="h-4 w-4 text-green-500" />
    if (trend === 'declining') return <TrendingDown className="h-4 w-4 text-red-500" />
    return <Minus className="h-4 w-4 text-gray-500" />
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!data) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>Unable to load quality metrics</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with Controls */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Quality Analytics</h2>
          <p className="text-muted-foreground">Real-time quality metrics and insights</p>
        </div>
        <div className="flex gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="custom">Custom</SelectItem>
            </SelectContent>
          </Select>
          <Select value={groupBy} onValueChange={setGroupBy}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="stage">By Stage</SelectItem>
              <SelectItem value="worker">By Worker</SelectItem>
              <SelectItem value="model">By Model</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Key Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center justify-between">
              First Pass Yield
              {getTrendIcon(data.trends.firstPassYield)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className={`text-3xl font-bold ${getStatusColor(data.overall.firstPassYield, { good: 95, warning: 85 })}`}>
                  {data.overall.firstPassYield.toFixed(1)}%
                </div>
                <p className="text-xs text-gray-500 mt-1">Target: 95%</p>
              </div>
              <Target className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center justify-between">
              Defect Rate
              {getTrendIcon(data.trends.defectRate)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className={`text-3xl font-bold ${getStatusColor(100 - data.overall.defectRate, { good: 99, warning: 95 })}`}>
                  {data.overall.defectRate.toFixed(2)}%
                </div>
                <p className="text-xs text-gray-500 mt-1">Lower is better</p>
              </div>
              <XCircle className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Quality Holds</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold">{data.holds.total - data.holds.resolved}</div>
                <div className="flex gap-2 mt-1">
                  <Badge variant="secondary" className="text-xs">
                    {data.holds.resolved} resolved
                  </Badge>
                  {data.holds.critical > 0 && (
                    <Badge variant="destructive" className="text-xs">
                      {data.holds.critical} critical
                    </Badge>
                  )}
                </div>
              </div>
              <Shield className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Avg Inspection Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold">{data.overall.avgInspectionTime.toFixed(1)}</div>
                <p className="text-xs text-gray-500 mt-1">minutes</p>
              </div>
              <Clock className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold">{data.overall.totalInspections}</div>
              <p className="text-sm text-muted-foreground">Total Inspections</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{data.overall.passedInspections}</div>
              <p className="text-sm text-muted-foreground">Passed</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{data.overall.failedInspections}</div>
              <p className="text-sm text-muted-foreground">Failed</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics Tabs */}
      <Tabs defaultValue="issues" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="issues">Top Issues</TabsTrigger>
          <TabsTrigger value="analysis">{groupBy === 'stage' ? 'Stage' : groupBy === 'worker' ? 'Worker' : 'Model'} Analysis</TabsTrigger>
          <TabsTrigger value="reworks">Reworks</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
        </TabsList>

        <TabsContent value="issues" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Top Quality Issues</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.topIssues.slice(0, 10).map((issue, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        idx < 3 ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
                      }`}>
                        {idx + 1}
                      </div>
                      <span className="font-medium">{issue.issue}</span>
                    </div>
                    <div className="text-right">
                      <div className="font-bold">{issue.count}</div>
                      <div className="text-xs text-gray-500">occurrences</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analysis" className="space-y-4">
          {groupBy === 'stage' && data.stage && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.stage.map((stage) => (
                <Card 
                  key={stage.stage}
                  className={`cursor-pointer transition-all ${
                    selectedStage === stage.stage ? 'ring-2 ring-blue-500' : ''
                  }`}
                  onClick={() => setSelectedStage(stage.stage === selectedStage ? null : stage.stage)}
                >
                  <CardHeader>
                    <CardTitle className="text-lg capitalize">{stage.stage}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>First Pass Yield</span>
                          <span className="font-medium">{stage.firstPassYield.toFixed(1)}%</span>
                        </div>
                        <Progress 
                          value={stage.firstPassYield} 
                          className={`h-2 ${
                            stage.firstPassYield >= 95 ? 'bg-green-100' : 
                            stage.firstPassYield >= 85 ? 'bg-yellow-100' : 'bg-red-100'
                          }`}
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <p className="text-gray-600">Inspections</p>
                          <p className="font-medium">{stage.totalInspections}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Avg Time</p>
                          <p className="font-medium">{stage.avgInspectionTime.toFixed(1)} min</p>
                        </div>
                      </div>
                      
                      {stage.topIssues.length > 0 && (
                        <div className="pt-2 border-t">
                          <p className="text-xs text-gray-600 mb-1">Top Issues:</p>
                          {stage.topIssues.slice(0, 2).map((issue, idx) => (
                            <div key={idx} className="text-xs flex justify-between">
                              <span className="text-gray-700">{issue.issue}</span>
                              <span className="font-medium">{issue.count}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
          
          {groupBy === 'worker' && data.worker && (
            <Card>
              <CardHeader>
                <CardTitle>Worker Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.worker
                    .sort((a, b) => b.firstPassYield - a.firstPassYield)
                    .slice(0, 15)
                    .map((worker, idx) => (
                      <div key={worker.workerId} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                            idx < 3 ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-700'
                          }`}>
                            {idx + 1}
                          </div>
                          <div>
                            <p className="font-medium">{worker.workerName}</p>
                            <p className="text-sm text-gray-600">
                              {worker.totalInspections} inspections
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className={`font-bold ${getStatusColor(worker.firstPassYield, { good: 95, warning: 85 })}`}>
                              {worker.firstPassYield.toFixed(1)}%
                            </div>
                            <div className="text-xs text-gray-500">
                              Avg: {worker.avgInspectionTime.toFixed(1)} min
                            </div>
                          </div>
                          {getTrendIcon(worker.trend)}
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="reworks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Rework Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-3xl font-bold">{data.reworks.total}</div>
                  <p className="text-sm text-muted-foreground">Total Reworks</p>
                </div>
                
                <div className="space-y-2">
                  <p className="text-sm font-medium">Reworks by Stage:</p>
                  {Object.entries(data.reworks.byStage).map(([stage, count]) => (
                    <div key={stage} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <span className="capitalize">{stage}</span>
                      <Badge variant="secondary">{count}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Quality Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Alert className="border-blue-200 bg-blue-50">
                  <Activity className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span>First Pass Yield:</span>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{data.trends.firstPassYield}</span>
                          {getTrendIcon(data.trends.firstPassYield)}
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Defect Rate:</span>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{data.trends.defectRate}</span>
                          {getTrendIcon(data.trends.defectRate)}
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Rework Rate:</span>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{data.trends.reworkRate}</span>
                          {getTrendIcon(data.trends.reworkRate)}
                        </div>
                      </div>
                    </div>
                  </AlertDescription>
                </Alert>
                
                <div className="h-64 flex items-center justify-center text-gray-500 bg-gray-50 rounded-lg">
                  <BarChart3 className="h-12 w-12 mr-2" />
                  <span>Detailed trend charts coming soon</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Real-time Alerts */}
      {data.holds.total - data.holds.resolved > 0 && (
        <Alert className="border-yellow-200 bg-yellow-50">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="flex items-center justify-between">
              <span>
                <strong>{data.holds.total - data.holds.resolved} active quality holds</strong> require attention
                {data.holds.critical > 0 && ` (${data.holds.critical} critical)`}
              </span>
              <Button size="sm" variant="outline" onClick={() => window.location.href = '/manager/quality-holds'}>
                View Holds
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}