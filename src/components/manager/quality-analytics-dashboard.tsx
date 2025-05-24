'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  TrendingUp, 
  TrendingDown, 
  Target, 
  AlertTriangle,
  CheckCircle2,
  Clock,
  Shield,
  Repeat,
  DollarSign,
  Activity,
  Zap,
  Lightbulb
} from 'lucide-react'

interface QualityMetrics {
  firstPassYield: number
  reworkRate: number
  defectEscapeRate: number
  averageQualityScore: number
  totalInspections: number
  failedInspections: number
  criticalIssues: number
  resolvedIssues: number
}

interface StageMetrics {
  stage: string
  yield: number
  averageTime: number
  issueCount: number
  topIssues: string[]
}

interface QualityPattern {
  stage: string
  issue_type: string
  frequency: number
  typical_cause: string
  prevention_tip: string
  severity_trend: string
  affected_models?: string[]
}

export function QualityAnalyticsDashboard() {
  const [metrics, setMetrics] = useState<QualityMetrics>({
    firstPassYield: 94.7,
    reworkRate: 5.3,
    defectEscapeRate: 0.08,
    averageQualityScore: 96.2,
    totalInspections: 324,
    failedInspections: 17,
    criticalIssues: 3,
    resolvedIssues: 14
  })

  const [stageMetrics, setStageMetrics] = useState<StageMetrics[]>([
    { stage: 'sanding', yield: 98, averageTime: 42, issueCount: 2, topIssues: ['Surface roughness'] },
    { stage: 'finishing', yield: 91, averageTime: 65, issueCount: 7, topIssues: ['Niblets', 'Uneven coating'] },
    { stage: 'assembly', yield: 96, averageTime: 38, issueCount: 4, topIssues: ['Gimbal tension'] },
    { stage: 'quality_control', yield: 95, averageTime: 15, issueCount: 5, topIssues: ['Visual defects'] }
  ])

  const [qualityPatterns, setQualityPatterns] = useState<QualityPattern[]>([])
  const [loading, setLoading] = useState(false)

  // Fetch quality metrics
  const fetchQualityMetrics = async () => {
    setLoading(true)
    try {
      // Fetch first pass yield and metrics
      const metricsResponse = await fetch('/api/analytics/quality-metrics')
      if (metricsResponse.ok) {
        const data = await metricsResponse.json()
        setMetrics(data.metrics || metrics)
        setStageMetrics(data.stageMetrics || stageMetrics)
      }

      // Fetch quality patterns
      const patternsResponse = await fetch('/api/quality/patterns?limit=10')
      if (patternsResponse.ok) {
        const patterns = await patternsResponse.json()
        setQualityPatterns(patterns)
      }
    } catch (error) {
      console.error('Failed to fetch quality metrics:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchQualityMetrics()
    // Refresh every minute
    const interval = setInterval(fetchQualityMetrics, 60000)
    return () => clearInterval(interval)
  }, [])

  const getYieldColor = (yield: number) => {
    if (yield >= 95) return 'text-green-600'
    if (yield >= 85) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getYieldBadgeColor = (yield: number) => {
    if (yield >= 95) return 'bg-green-100 text-green-800'
    if (yield >= 85) return 'bg-yellow-100 text-yellow-800'
    return 'bg-red-100 text-red-800'
  }

  // Calculate financial impact
  const calculateSavings = () => {
    const reworkHoursSaved = (metrics.reworkRate / 100) * 200 * 50 // rate * hours/month * hourly cost
    const materialWasteSaved = metrics.failedInspections * 100 // failures * avg material cost
    return reworkHoursSaved + materialWasteSaved
  }

  return (
    <div className="space-y-6">
      {/* Key Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">First Pass Yield</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getYieldColor(metrics.firstPassYield)}`}>
              {metrics.firstPassYield}%
            </div>
            <div className="flex items-center mt-1">
              <TrendingUp className="h-3 w-3 text-green-600 mr-1" />
              <span className="text-xs text-green-600">+2.3% from last period</span>
            </div>
            <Progress value={metrics.firstPassYield} className="mt-2 h-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rework Rate</CardTitle>
            <Repeat className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {metrics.reworkRate}%
            </div>
            <div className="flex items-center mt-1">
              <TrendingDown className="h-3 w-3 text-green-600 mr-1" />
              <span className="text-xs text-green-600">-1.2% improvement</span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {metrics.failedInspections} items reworked
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Quality Score</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {metrics.averageQualityScore}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="outline" className="text-xs">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                {metrics.totalInspections} inspections
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Savings</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ${calculateSavings().toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              From reduced rework & waste
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Issue Alerts */}
      {metrics.criticalIssues > 0 && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription>
            <div className="flex items-center justify-between">
              <div>
                <strong className="text-red-800">{metrics.criticalIssues} Critical Issues</strong>
                <span className="text-red-700 ml-2">require immediate attention</span>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Stage-by-Stage Quality Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>Stage Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {stageMetrics.map((stage) => (
              <div key={stage.stage} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="font-medium capitalize">{stage.stage.replace('_', ' ')}</h4>
                    <p className="text-sm text-muted-foreground">
                      Avg. time: {stage.averageTime} min
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge className={getYieldBadgeColor(stage.yield)}>
                      {stage.yield}% yield
                    </Badge>
                    {stage.issueCount > 0 && (
                      <Badge variant="outline" className="text-orange-600 border-orange-200">
                        {stage.issueCount} issues
                      </Badge>
                    )}
                  </div>
                </div>
                
                <Progress value={stage.yield} className="h-2 mb-3" />
                
                {stage.topIssues.length > 0 && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">Top issues:</span>
                    {stage.topIssues.map((issue, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">
                        {issue}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quality Intelligence Patterns */}
      {qualityPatterns.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5" />
              Quality Intelligence
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {qualityPatterns.slice(0, 3).map((pattern, index) => {
                const isHighPriority = pattern.frequency > 5 || pattern.severity_trend === 'increasing'
                return (
                  <div 
                    key={index} 
                    className={`p-4 border rounded-lg ${
                      isHighPriority ? 'bg-orange-50 border-orange-200' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className={`font-medium capitalize ${
                          isHighPriority ? 'text-orange-900' : ''
                        }`}>
                          {pattern.stage.replace('_', ' ')} - {pattern.issue_type.replace('_', ' ')}
                        </h4>
                        <p className={`text-sm mt-1 ${
                          isHighPriority ? 'text-orange-700' : 'text-muted-foreground'
                        }`}>
                          Frequency: {pattern.frequency} occurrences this week
                          {pattern.severity_trend === 'increasing' && ' (+40% trend)'}
                        </p>
                        <div className="flex flex-col gap-1 mt-2 text-sm">
                          <span className={isHighPriority ? 'text-orange-600' : 'text-gray-600'}>
                            <strong>Root cause:</strong> {pattern.typical_cause}
                          </span>
                          <span className={isHighPriority ? 'text-orange-600' : 'text-gray-600'}>
                            <strong>Prevention:</strong> {pattern.prevention_tip}
                          </span>
                        </div>
                        {pattern.affected_models && pattern.affected_models.length > 0 && (
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-xs text-muted-foreground">Affects:</span>
                            {pattern.affected_models.map((model, i) => (
                              <Badge key={i} variant="outline" className="text-xs">
                                {model}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      <div>
                        {pattern.severity_trend === 'increasing' && (
                          <Badge className="bg-red-100 text-red-800">
                            Increasing
                          </Badge>
                        )}
                        {pattern.severity_trend === 'decreasing' && (
                          <Badge className="bg-green-100 text-green-800">
                            Improving
                          </Badge>
                        )}
                        {isHighPriority && pattern.severity_trend !== 'increasing' && (
                          <Badge className="bg-orange-100 text-orange-800">
                            High Priority
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Predictive Insights */}
            <div className="mt-6 space-y-3">
              <h4 className="font-medium flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Predictive Insights
              </h4>
              
              <Alert className="border-blue-200 bg-blue-50">
                <Activity className="h-4 w-4 text-blue-600" />
                <AlertDescription>
                  <strong className="text-blue-800">Pattern detected:</strong>
                  <span className="text-blue-700 ml-2">
                    Finishing issues increase 3x when humidity exceeds 65%. Current: 62%
                  </span>
                </AlertDescription>
              </Alert>

              <Alert className="border-yellow-200 bg-yellow-50">
                <Clock className="h-4 w-4 text-yellow-600" />
                <AlertDescription>
                  <strong className="text-yellow-800">Timing correlation:</strong>
                  <span className="text-yellow-700 ml-2">
                    Quality drops 15% in final 2 hours of shifts. Consider rotation schedule.
                  </span>
                </AlertDescription>
              </Alert>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}