'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Search, Package, CheckCircle, AlertCircle, Clock, User, QrCode, Award } from 'lucide-react'
import { format } from 'date-fns'

interface ComponentJourney {
  component: any
  timeline: any[]
  inspections: any[]
  holds: any[]
  summary: {
    total_inspections: number
    passed_inspections: number
    total_holds: number
    active_holds: number
    current_grade: string
    journey: any[]
  }
}

export default function ComponentsPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [journey, setJourney] = useState<ComponentJourney | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const searchComponent = async () => {
    if (!searchTerm.trim()) return

    setLoading(true)
    setError('')
    setJourney(null)

    try {
      // Search for component
      const searchRes = await fetch(`/api/components/search?serial=${encodeURIComponent(searchTerm)}`)
      if (!searchRes.ok) {
        throw new Error('Component not found')
      }
      
      const { component } = await searchRes.json()
      
      // Get full journey
      const journeyRes = await fetch(`/api/components/${component.id}/journey`)
      if (!journeyRes.ok) {
        throw new Error('Failed to load journey')
      }
      
      const journeyData = await journeyRes.json()
      setJourney(journeyData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed')
    } finally {
      setLoading(false)
    }
  }

  const getTimelineIcon = (type: string) => {
    switch (type) {
      case 'created':
        return <Package className="h-4 w-4" />
      case 'task_started':
      case 'task_completed':
        return <Clock className="h-4 w-4" />
      case 'inspection':
        return <CheckCircle className="h-4 w-4" />
      case 'hold_created':
        return <AlertCircle className="h-4 w-4" />
      case 'hold_resolved':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      default:
        return <AlertCircle className="h-4 w-4" />
    }
  }

  const getTimelineColor = (type: string, data?: any) => {
    if (type === 'inspection' && !data?.passed) return 'border-red-500'
    if (type === 'hold_created') return 'border-orange-500'
    if (type === 'hold_resolved') return 'border-green-500'
    if (type === 'task_completed') return 'border-blue-500'
    return 'border-gray-300'
  }

  const downloadQRCode = async (componentId: string) => {
    try {
      const res = await fetch(`/api/components/qr?id=${componentId}`)
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `component-${componentId}-qr.png`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Failed to download QR code:', err)
    }
  }

  const generateCertificate = async (componentId: string) => {
    try {
      const res = await fetch(`/api/quality/certificate?component_id=${componentId}`)
      if (!res.ok) throw new Error('Failed to generate certificate')
      
      const { certificate } = await res.json()
      
      // For now, download as JSON. In production, this would be a PDF
      const blob = new Blob([JSON.stringify(certificate, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `quality-certificate-${certificate.serialNumber}.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Failed to generate certificate:', err)
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Component Journey Tracking</h1>
        <p className="text-muted-foreground">Search components by serial number to view their complete production history</p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Component Search</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="Enter serial number (e.g., CUP-L-2025-0001)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && searchComponent()}
              className="flex-1"
            />
            <Button onClick={searchComponent} disabled={loading}>
              <Search className="h-4 w-4 mr-2" />
              Search
            </Button>
          </div>
          {error && (
            <p className="text-sm text-red-600 mt-2">{error}</p>
          )}
        </CardContent>
      </Card>

      {journey && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Component Details
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => downloadQRCode(journey.component.id)}
                    >
                      <QrCode className="h-4 w-4 mr-2" />
                      QR Code
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => generateCertificate(journey.component.id)}
                    >
                      <Award className="h-4 w-4 mr-2" />
                      Certificate
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Serial Number</span>
                  <span className="font-mono">{journey.component.serial_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Type</span>
                  <Badge variant="outline">{journey.component.type}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Model</span>
                  <span>{journey.component.model}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Grade</span>
                  <Badge className={
                    journey.component.grade === 'A' ? 'bg-green-100 text-green-800' :
                    journey.component.grade === 'B' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }>
                    Grade {journey.component.grade}
                  </Badge>
                </div>
                {journey.component.paired_component && (
                  <>
                    <Separator className="my-2" />
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Paired With</span>
                      <span className="font-mono text-sm">{journey.component.paired_component.serial_number}</span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quality Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold">
                      {journey.summary.passed_inspections}/{journey.summary.total_inspections}
                    </div>
                    <div className="text-sm text-muted-foreground">Inspections Passed</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">
                      {journey.summary.active_holds}
                    </div>
                    <div className="text-sm text-muted-foreground">Active Holds</div>
                  </div>
                </div>
                <Separator className="my-4" />
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Total Quality Holds</span>
                    <span>{journey.summary.total_holds}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Current Status</span>
                    <Badge variant={journey.component.work_tasks?.status === 'completed' ? 'default' : 'secondary'}>
                      {journey.component.work_tasks?.status || 'Not Started'}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Production Timeline</CardTitle>
              <CardDescription>Complete history of this component through production</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {journey.timeline.map((event, index) => (
                  <div key={index} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className={`p-2 rounded-full border-2 ${getTimelineColor(event.type, event.data)}`}>
                        {getTimelineIcon(event.type)}
                      </div>
                      {index < journey.timeline.length - 1 && (
                        <div className="w-0.5 h-16 bg-gray-200 mt-2" />
                      )}
                    </div>
                    <div className="flex-1 pb-8">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{event.description}</span>
                        <span className="text-sm text-muted-foreground">
                          {format(new Date(event.timestamp), 'MMM d, h:mm a')}
                        </span>
                      </div>
                      {event.data && (
                        <div className="text-sm text-muted-foreground space-y-1">
                          {event.data.worker && (
                            <div className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {event.data.worker.first_name} {event.data.worker.last_name}
                            </div>
                          )}
                          {event.data.batch && (
                            <div>Batch: {event.data.batch}</div>
                          )}
                          {event.data.findings && Object.keys(event.data.findings).length > 0 && (
                            <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
                              {Object.entries(event.data.findings).map(([key, value]) => (
                                <div key={key}>
                                  <span className="font-medium">{key}:</span> {String(value)}
                                </div>
                              ))}
                            </div>
                          )}
                          {event.type === 'inspection' && (
                            <Badge variant={event.data.passed ? 'default' : 'destructive'} className="mt-1">
                              {event.data.passed ? 'Passed' : 'Failed'}
                            </Badge>
                          )}
                          {event.data.severity && (
                            <Badge variant={
                              event.data.severity === 'critical' ? 'destructive' :
                              event.data.severity === 'major' ? 'default' : 'secondary'
                            }>
                              {event.data.severity}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}