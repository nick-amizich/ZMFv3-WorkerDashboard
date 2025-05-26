'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { AlertCircle, TrendingDown, User, Package, CheckCircle, Factory, AlertTriangle } from 'lucide-react'

interface QualityAlert {
  type: 'pattern' | 'worker' | 'component_risk' | 'stage' | 'holds'
  severity: 'critical' | 'warning' | 'info'
  title: string
  description: string
  affected_count: number
  recommendations: string[]
  components?: Array<{
    component_id: string
    serial: string
    rework_count: number
    model: string
  }>
}

interface AlertSummary {
  critical: number
  warning: number
  info: number
  total: number
}

export function PredictiveQualityAlerts() {
  const [alerts, setAlerts] = useState<QualityAlert[]>([])
  const [summary, setSummary] = useState<AlertSummary>({ critical: 0, warning: 0, info: 0, total: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAlerts()
    const interval = setInterval(fetchAlerts, 60000) // Refresh every minute
    return () => clearInterval(interval)
  }, [])

  const fetchAlerts = async () => {
    try {
      const response = await fetch('/api/quality/predictive-alerts')
      if (response.ok) {
        const data = await response.json()
        setAlerts(data.alerts)
        setSummary(data.summary)
      }
    } catch (error) {
      console.error('Failed to fetch alerts:', error)
    } finally {
      setLoading(false)
    }
  }

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'pattern':
        return <TrendingDown className="h-4 w-4" />
      case 'worker':
        return <User className="h-4 w-4" />
      case 'component_risk':
        return <Package className="h-4 w-4" />
      case 'stage':
        return <Factory className="h-4 w-4" />
      case 'holds':
        return <AlertTriangle className="h-4 w-4" />
      default:
        return <AlertCircle className="h-4 w-4" />
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'destructive'
      case 'warning':
        return 'default'
      case 'info':
        return 'secondary'
      default:
        return 'outline'
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Predictive Quality Alerts</CardTitle>
          <CardDescription>Loading alerts...</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Predictive Quality Alerts</CardTitle>
            <CardDescription>
              AI-powered alerts based on quality patterns and trends
            </CardDescription>
          </div>
          {summary.total > 0 && (
            <div className="flex items-center gap-2">
              {summary.critical > 0 && (
                <Badge variant="destructive">{summary.critical} Critical</Badge>
              )}
              {summary.warning > 0 && (
                <Badge variant="default">{summary.warning} Warning</Badge>
              )}
              {summary.info > 0 && (
                <Badge variant="secondary">{summary.info} Info</Badge>
              )}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {alerts.length === 0 ? (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertTitle>All systems normal</AlertTitle>
            <AlertDescription>
              No quality issues detected at this time
            </AlertDescription>
          </Alert>
        ) : (
          alerts.map((alert, index) => (
            <Alert key={index} className="relative">
              <div className="flex items-start gap-3">
                {getAlertIcon(alert.type)}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertTitle className="text-sm font-medium mb-0">
                      {alert.title}
                    </AlertTitle>
                    <Badge variant={getSeverityColor(alert.severity)} className="text-xs">
                      {alert.severity}
                    </Badge>
                  </div>
                  <AlertDescription className="text-sm">
                    {alert.description}
                  </AlertDescription>
                  <div className="mt-2 text-xs text-muted-foreground">
                    Affecting {alert.affected_count} {alert.type === 'worker' ? 'inspections' : 'units'}
                  </div>
                  
                  {alert.components && alert.components.length > 0 && (
                    <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
                      <p className="font-medium mb-1">Affected Components:</p>
                      <div className="space-y-1">
                        {alert.components.slice(0, 3).map((comp, idx) => (
                          <div key={idx} className="flex items-center justify-between">
                            <span className="font-mono">{comp.serial}</span>
                            <span className="text-muted-foreground">
                              {comp.rework_count} reworks
                            </span>
                          </div>
                        ))}
                        {alert.components.length > 3 && (
                          <div className="text-muted-foreground">
                            ...and {alert.components.length - 3} more
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {alert.recommendations.length > 0 && (
                    <div className="mt-3">
                      <p className="text-xs font-medium mb-1">Recommended actions:</p>
                      <ul className="text-xs text-muted-foreground space-y-1">
                        {alert.recommendations.map((rec, idx) => (
                          <li key={idx} className="flex items-start gap-1">
                            <span className="text-muted-foreground">•</span>
                            <span>{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div className="mt-3 flex items-center gap-2">
                    <Button size="sm" variant="outline">
                      Investigate
                    </Button>
                    <Button size="sm" variant="ghost">
                      Dismiss
                    </Button>
                  </div>
                </div>
              </div>
            </Alert>
          ))
        )}
      </CardContent>
    </Card>
  )
}