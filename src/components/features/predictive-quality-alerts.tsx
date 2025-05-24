'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { 
  Zap, 
  TrendingUp, 
  AlertTriangle, 
  Clock, 
  Droplets,
  Users,
  Package,
  Lightbulb,
  Activity,
  ThermometerSun,
  Timer,
  Brain
} from 'lucide-react'

interface PredictiveAlert {
  id: string
  type: 'environmental' | 'timing' | 'material' | 'worker' | 'pattern'
  severity: 'info' | 'warning' | 'critical'
  title: string
  description: string
  confidence: number
  impact: string
  recommendation: string
  triggerConditions: {
    metric: string
    current: number
    threshold: number
    trend?: 'increasing' | 'decreasing' | 'stable'
  }
  affectedStages?: string[]
  affectedModels?: string[]
}

interface EnvironmentalData {
  temperature: number
  humidity: number
  airQuality: string
  lastUpdated: string
}

export function PredictiveQualityAlerts() {
  const [alerts, setAlerts] = useState<PredictiveAlert[]>([])
  const [environmentalData, setEnvironmentalData] = useState<EnvironmentalData>({
    temperature: 72,
    humidity: 62,
    airQuality: 'Good',
    lastUpdated: new Date().toISOString()
  })
  const [loading, setLoading] = useState(false)

  // Simulate fetching predictive alerts
  const fetchPredictiveAlerts = async () => {
    setLoading(true)
    try {
      // In production, this would call an API that uses ML models
      const response = await fetch('/api/quality/predictive-alerts')
      if (response.ok) {
        const data = await response.json()
        setAlerts(data.alerts || generateMockAlerts())
      } else {
        setAlerts(generateMockAlerts())
      }
    } catch (error) {
      // Use mock data for now
      setAlerts(generateMockAlerts())
    } finally {
      setLoading(false)
    }
  }

  // Generate mock predictive alerts based on patterns
  const generateMockAlerts = (): PredictiveAlert[] => {
    const mockAlerts: PredictiveAlert[] = []

    // Environmental alert
    if (environmentalData.humidity > 60) {
      mockAlerts.push({
        id: '1',
        type: 'environmental',
        severity: 'warning',
        title: 'High Humidity Alert',
        description: 'Humidity levels approaching critical threshold for finishing operations',
        confidence: 85,
        impact: 'Finishing defects increase 3x when humidity exceeds 65%',
        recommendation: 'Consider postponing finishing operations or increase dehumidification',
        triggerConditions: {
          metric: 'humidity',
          current: environmentalData.humidity,
          threshold: 65,
          trend: 'increasing'
        },
        affectedStages: ['finishing', 'curing']
      })
    }

    // Timing pattern alert
    const currentHour = new Date().getHours()
    if (currentHour >= 14) {
      mockAlerts.push({
        id: '2',
        type: 'timing',
        severity: 'info',
        title: 'End-of-Shift Quality Risk',
        description: 'Historical data shows 15% quality drop in final 2 hours of shifts',
        confidence: 92,
        impact: 'Increased rework probability for precision tasks',
        recommendation: 'Rotate workers on precision tasks or schedule breaks',
        triggerConditions: {
          metric: 'hours_into_shift',
          current: currentHour - 8,
          threshold: 6
        },
        affectedStages: ['assembly', 'quality_control']
      })
    }

    // Material batch alert
    mockAlerts.push({
      id: '3',
      type: 'material',
      severity: 'critical',
      title: 'Wood Batch Quality Concern',
      description: 'Current walnut batch showing 3x normal defect rate',
      confidence: 78,
      impact: 'Potential 20% yield reduction if pattern continues',
      recommendation: 'Increase pre-work inspections and consider alternate batch',
      triggerConditions: {
        metric: 'defect_rate',
        current: 15,
        threshold: 5,
        trend: 'increasing'
      },
      affectedModels: ['HD650', 'Atticus']
    })

    // Worker fatigue alert
    mockAlerts.push({
      id: '4',
      type: 'worker',
      severity: 'warning',
      title: 'Worker Fatigue Pattern Detected',
      description: 'Multiple workers exceeding optimal continuous work duration',
      confidence: 88,
      impact: 'Error rates typically increase 25% after 4 hours continuous work',
      recommendation: 'Implement mandatory 15-minute breaks for affected stations',
      triggerConditions: {
        metric: 'continuous_work_hours',
        current: 4.5,
        threshold: 4
      },
      affectedStages: ['sanding', 'assembly']
    })

    return mockAlerts
  }

  useEffect(() => {
    fetchPredictiveAlerts()
    
    // Simulate environmental monitoring
    const interval = setInterval(() => {
      setEnvironmentalData(prev => ({
        temperature: prev.temperature + (Math.random() - 0.5) * 2,
        humidity: Math.min(80, Math.max(40, prev.humidity + (Math.random() - 0.5) * 3)),
        airQuality: prev.airQuality,
        lastUpdated: new Date().toISOString()
      }))
    }, 30000) // Update every 30 seconds

    return () => clearInterval(interval)
  }, [])

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <AlertTriangle className="h-4 w-4" />
      case 'warning': return <Activity className="h-4 w-4" />
      default: return <Lightbulb className="h-4 w-4" />
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'border-red-200 bg-red-50'
      case 'warning': return 'border-orange-200 bg-orange-50'
      default: return 'border-blue-200 bg-blue-50'
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'environmental': return <ThermometerSun className="h-5 w-5" />
      case 'timing': return <Timer className="h-5 w-5" />
      case 'material': return <Package className="h-5 w-5" />
      case 'worker': return <Users className="h-5 w-5" />
      default: return <Brain className="h-5 w-5" />
    }
  }

  return (
    <div className="space-y-4">
      {/* Environmental Monitoring Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ThermometerSun className="h-5 w-5" />
            Environmental Conditions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold">{Math.round(environmentalData.temperature)}°F</div>
              <p className="text-sm text-muted-foreground">Temperature</p>
              <Progress 
                value={(environmentalData.temperature - 60) * 5} 
                className="mt-2 h-2"
              />
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1">
                <Droplets className="h-5 w-5 text-blue-500" />
                <span className="text-2xl font-bold">{Math.round(environmentalData.humidity)}%</span>
              </div>
              <p className="text-sm text-muted-foreground">Humidity</p>
              <Progress 
                value={environmentalData.humidity} 
                className={`mt-2 h-2 ${environmentalData.humidity > 65 ? '[&>div]:bg-orange-500' : ''}`}
              />
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{environmentalData.airQuality}</div>
              <p className="text-sm text-muted-foreground">Air Quality</p>
              <Badge variant="outline" className="mt-2">Normal</Badge>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-3 text-center">
            Last updated: {new Date(environmentalData.lastUpdated).toLocaleTimeString()}
          </p>
        </CardContent>
      </Card>

      {/* Predictive Alerts */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Predictive Quality Alerts
          </h3>
          <Badge variant="outline">
            {alerts.filter(a => a.severity === 'critical').length} Critical
          </Badge>
        </div>

        {alerts.map((alert) => (
          <Alert key={alert.id} className={getSeverityColor(alert.severity)}>
            <div className="flex items-start gap-3">
              <div className={`mt-1 ${
                alert.severity === 'critical' ? 'text-red-600' :
                alert.severity === 'warning' ? 'text-orange-600' : 'text-blue-600'
              }`}>
                {getTypeIcon(alert.type)}
              </div>
              
              <div className="flex-1 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className={`font-semibold flex items-center gap-2 ${
                      alert.severity === 'critical' ? 'text-red-900' :
                      alert.severity === 'warning' ? 'text-orange-900' : 'text-blue-900'
                    }`}>
                      {getSeverityIcon(alert.severity)}
                      {alert.title}
                    </h4>
                    <p className={`text-sm mt-1 ${
                      alert.severity === 'critical' ? 'text-red-700' :
                      alert.severity === 'warning' ? 'text-orange-700' : 'text-blue-700'
                    }`}>
                      {alert.description}
                    </p>
                  </div>
                  <Badge variant="outline" className="ml-2">
                    {alert.confidence}% confidence
                  </Badge>
                </div>

                {/* Trigger Conditions */}
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-muted-foreground">
                    {alert.triggerConditions.metric.replace(/_/g, ' ')}:
                  </span>
                  <span className="font-medium">
                    {alert.triggerConditions.current} 
                    {alert.triggerConditions.trend && (
                      <TrendingUp className={`inline h-3 w-3 ml-1 ${
                        alert.triggerConditions.trend === 'increasing' ? 'text-red-500' : 'text-green-500'
                      }`} />
                    )}
                  </span>
                  <span className="text-muted-foreground">
                    (threshold: {alert.triggerConditions.threshold})
                  </span>
                </div>

                {/* Impact & Recommendation */}
                <div className="space-y-1 text-sm">
                  <p className="text-gray-700">
                    <strong>Impact:</strong> {alert.impact}
                  </p>
                  <p className="text-gray-700">
                    <strong>Action:</strong> {alert.recommendation}
                  </p>
                </div>

                {/* Affected Areas */}
                <div className="flex items-center gap-4 text-sm">
                  {alert.affectedStages && (
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">Affects:</span>
                      {alert.affectedStages.map((stage) => (
                        <Badge key={stage} variant="secondary" className="text-xs">
                          {stage}
                        </Badge>
                      ))}
                    </div>
                  )}
                  {alert.affectedModels && (
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">Models:</span>
                      {alert.affectedModels.map((model) => (
                        <Badge key={model} variant="outline" className="text-xs">
                          {model}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                {alert.severity === 'critical' && (
                  <div className="flex gap-2 mt-2">
                    <Button size="sm" variant="destructive">
                      Take Action
                    </Button>
                    <Button size="sm" variant="outline">
                      Dismiss
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </Alert>
        ))}
      </div>

      {/* No Alerts State */}
      {alerts.length === 0 && !loading && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <Brain className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">All Systems Normal</h3>
            <p className="text-gray-500 text-center">
              No quality risks detected. Production conditions are optimal.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}