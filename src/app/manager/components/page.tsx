'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { useToast } from '@/hooks/use-toast'
import { 
  Package, 
  Scan, 
  Search, 
  Trees, 
  Calendar, 
  User, 
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Droplets,
  Camera,
  ArrowRight,
  Download,
  QrCode,
  History,
  Shield
} from 'lucide-react'

interface ComponentJourney {
  stage: string
  worker: string
  timestamp: string
  duration_minutes?: number
  checks_passed: string[] | string
  issues: string[]
  photos?: string[]
}

interface Component {
  id: string
  cup_pair_id: string
  left_cup_serial: string
  right_cup_serial: string
  wood_batch_id: string
  grade: 'A' | 'B'
  source_tracking: {
    supplier?: string
    receipt_date?: string
    moisture_content?: number
    grain_photos?: string[]
  }
  specifications: {
    model: string
    wood_type: string
    finish_type?: string
    customer_order_id?: string
    custom_requirements?: string[]
  }
  journey: ComponentJourney[]
  final_metrics: {
    total_production_hours?: number
    rework_count?: number
    quality_score?: number
  }
  created_at: string
}

export default function ComponentTrackingPage() {
  const [components, setComponents] = useState<Component[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedComponent, setSelectedComponent] = useState<Component | null>(null)
  const [scanMode, setScanMode] = useState(false)
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  // Fetch components
  const fetchComponents = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/components')
      if (response.ok) {
        const data = await response.json()
        setComponents(data)
      }
    } catch (error) {
      toast({
        title: 'Failed to load components',
        description: 'Please try again',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchComponents()
  }, [])

  // Search by serial number or scan QR
  const handleSearch = async () => {
    if (!searchTerm.trim()) return

    setLoading(true)
    try {
      const response = await fetch(`/api/components/search?serial=${searchTerm}`)
      if (response.ok) {
        const component = await response.json()
        setSelectedComponent(component)
        setSearchTerm('')
      } else {
        toast({
          title: 'Component not found',
          description: 'Please check the serial number',
          variant: 'destructive'
        })
      }
    } catch (error) {
      toast({
        title: 'Search failed',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  // Generate QR code for component
  const generateQRCode = async (component: Component) => {
    try {
      const response = await fetch('/api/components/qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          component_id: component.id,
          left_serial: component.left_cup_serial,
          right_serial: component.right_cup_serial
        })
      })
      
      if (response.ok) {
        const blob = await response.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `QR_${component.left_cup_serial}.png`
        a.click()
      }
    } catch (error) {
      toast({
        title: 'Failed to generate QR code',
        variant: 'destructive'
      })
    }
  }

  const getJourneyProgress = (component: Component) => {
    const totalStages = 8 // Typical workflow stages
    const completedStages = component.journey.length
    return (completedStages / totalStages) * 100
  }

  const getQualityStatus = (component: Component) => {
    const score = component.final_metrics.quality_score || 0
    if (score >= 95) return { color: 'text-green-600', label: 'Excellent' }
    if (score >= 85) return { color: 'text-blue-600', label: 'Good' }
    if (score >= 75) return { color: 'text-yellow-600', label: 'Fair' }
    return { color: 'text-red-600', label: 'Poor' }
  }

  const filteredComponents = components.filter(component => 
    component.left_cup_serial.toLowerCase().includes(searchTerm.toLowerCase()) ||
    component.right_cup_serial.toLowerCase().includes(searchTerm.toLowerCase()) ||
    component.specifications.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
    component.specifications.wood_type.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Component Tracking</h2>
          <p className="text-muted-foreground">
            Track individual components through their production journey
          </p>
        </div>
        <Button 
          variant={scanMode ? 'default' : 'outline'}
          onClick={() => setScanMode(!scanMode)}
        >
          <Scan className="mr-2 h-4 w-4" />
          {scanMode ? 'Scanning...' : 'Scan QR'}
        </Button>
      </div>

      {/* Search Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search by serial number, model, or wood type..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-10"
              />
            </div>
            <Button onClick={handleSearch} disabled={loading}>
              <Search className="mr-2 h-4 w-4" />
              Search
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Scanner UI (placeholder) */}
      {scanMode && (
        <Alert className="border-blue-200 bg-blue-50">
          <Scan className="h-4 w-4" />
          <AlertDescription>
            <div className="flex items-center justify-between">
              <span>Position QR code in camera view...</span>
              <Button size="sm" variant="ghost" onClick={() => setScanMode(false)}>
                Cancel
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Component Detail View */}
      {selectedComponent ? (
        <Card className="border-2">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-xl">Component Details</CardTitle>
                <div className="mt-2 space-y-1">
                  <div className="flex items-center gap-4 text-sm">
                    <Badge variant="outline">
                      L: {selectedComponent.left_cup_serial}
                    </Badge>
                    <Badge variant="outline">
                      R: {selectedComponent.right_cup_serial}
                    </Badge>
                    <Badge className={selectedComponent.grade === 'A' ? 'bg-green-600' : 'bg-blue-600'}>
                      Grade {selectedComponent.grade}
                    </Badge>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => generateQRCode(selectedComponent)}
                >
                  <QrCode className="mr-2 h-4 w-4" />
                  Generate QR
                </Button>
                <Button 
                  size="sm" 
                  variant="ghost"
                  onClick={() => setSelectedComponent(null)}
                >
                  Close
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="journey" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="journey">Journey</TabsTrigger>
                <TabsTrigger value="specifications">Specs</TabsTrigger>
                <TabsTrigger value="quality">Quality</TabsTrigger>
                <TabsTrigger value="source">Source</TabsTrigger>
              </TabsList>

              <TabsContent value="journey" className="space-y-4">
                <div className="mb-4">
                  <div className="flex justify-between text-sm mb-2">
                    <span>Production Progress</span>
                    <span>{selectedComponent.journey.length} stages completed</span>
                  </div>
                  <Progress value={getJourneyProgress(selectedComponent)} />
                </div>

                <div className="space-y-3">
                  {selectedComponent.journey.map((step, index) => (
                    <div key={index} className="relative">
                      {index < selectedComponent.journey.length - 1 && (
                        <div className="absolute left-5 top-10 bottom-0 w-0.5 bg-gray-200" />
                      )}
                      <div className="flex gap-4">
                        <div className="flex-shrink-0">
                          {step.issues.length > 0 ? (
                            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                              <XCircle className="h-5 w-5 text-red-600" />
                            </div>
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                              <CheckCircle2 className="h-5 w-5 text-green-600" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 pb-6">
                          <div className="bg-gray-50 rounded-lg p-4">
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <h4 className="font-medium capitalize">{step.stage}</h4>
                                <p className="text-sm text-gray-600">by {step.worker}</p>
                              </div>
                              <div className="text-right text-sm text-gray-500">
                                <p>{new Date(step.timestamp).toLocaleDateString()}</p>
                                {step.duration_minutes && (
                                  <p className="flex items-center gap-1 justify-end">
                                    <Clock className="h-3 w-3" />
                                    {step.duration_minutes} min
                                  </p>
                                )}
                              </div>
                            </div>
                            
                            {step.checks_passed && (
                              <div className="mt-2">
                                <Badge variant="outline" className="text-xs">
                                  <Shield className="h-3 w-3 mr-1" />
                                  {typeof step.checks_passed === 'string' 
                                    ? step.checks_passed 
                                    : `${step.checks_passed.length} checks passed`}
                                </Badge>
                              </div>
                            )}
                            
                            {step.issues.length > 0 && (
                              <Alert className="mt-2 border-red-200 bg-red-50">
                                <AlertTriangle className="h-4 w-4" />
                                <AlertDescription className="text-sm">
                                  Issues: {step.issues.join(', ')}
                                </AlertDescription>
                              </Alert>
                            )}
                            
                            {step.photos && step.photos.length > 0 && (
                              <div className="mt-2 flex items-center gap-1 text-sm text-blue-600">
                                <Camera className="h-3 w-3" />
                                {step.photos.length} photo(s) available
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="specifications" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-gray-600">Model</p>
                      <p className="font-medium">{selectedComponent.specifications.model}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Wood Type</p>
                      <p className="font-medium capitalize">{selectedComponent.specifications.wood_type}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Finish Type</p>
                      <p className="font-medium capitalize">
                        {selectedComponent.specifications.finish_type || 'Standard'}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-gray-600">Customer Order</p>
                      <p className="font-medium">
                        {selectedComponent.specifications.customer_order_id || 'Stock'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Custom Requirements</p>
                      {selectedComponent.specifications.custom_requirements?.length ? (
                        <div className="space-y-1">
                          {selectedComponent.specifications.custom_requirements.map((req, i) => (
                            <Badge key={i} variant="outline" className="text-xs">
                              {req}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">None</p>
                      )}
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="quality" className="space-y-4">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <Card>
                    <CardContent className="pt-6">
                      <div className={`text-3xl font-bold ${getQualityStatus(selectedComponent).color}`}>
                        {selectedComponent.final_metrics.quality_score || 0}%
                      </div>
                      <p className="text-sm text-gray-600 mt-1">Quality Score</p>
                      <Badge className="mt-2" variant="outline">
                        {getQualityStatus(selectedComponent).label}
                      </Badge>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-3xl font-bold">
                        {selectedComponent.final_metrics.rework_count || 0}
                      </div>
                      <p className="text-sm text-gray-600 mt-1">Rework Count</p>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-3xl font-bold">
                        {selectedComponent.final_metrics.total_production_hours || 0}h
                      </div>
                      <p className="text-sm text-gray-600 mt-1">Total Hours</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Quality History */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Quality Check History</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {selectedComponent.journey
                        .filter(j => j.checks_passed || j.issues.length > 0)
                        .map((check, i) => (
                          <div key={i} className="flex items-center justify-between text-sm">
                            <span className="capitalize">{check.stage}</span>
                            <div className="flex items-center gap-2">
                              {check.issues.length > 0 ? (
                                <Badge variant="destructive" className="text-xs">
                                  {check.issues.length} issues
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="text-xs">
                                  Passed
                                </Badge>
                              )}
                            </div>
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="source" className="space-y-4">
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-600">Wood Batch ID</p>
                    <p className="font-medium font-mono">{selectedComponent.wood_batch_id}</p>
                  </div>
                  
                  {selectedComponent.source_tracking.supplier && (
                    <div>
                      <p className="text-sm text-gray-600">Supplier</p>
                      <p className="font-medium">{selectedComponent.source_tracking.supplier}</p>
                    </div>
                  )}
                  
                  {selectedComponent.source_tracking.receipt_date && (
                    <div>
                      <p className="text-sm text-gray-600">Receipt Date</p>
                      <p className="font-medium">
                        {new Date(selectedComponent.source_tracking.receipt_date).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                  
                  {selectedComponent.source_tracking.moisture_content && (
                    <div className="flex items-center gap-2">
                      <Droplets className="h-4 w-4 text-blue-500" />
                      <div>
                        <p className="text-sm text-gray-600">Moisture Content</p>
                        <p className="font-medium">{selectedComponent.source_tracking.moisture_content}%</p>
                      </div>
                    </div>
                  )}
                  
                  {selectedComponent.source_tracking.grain_photos?.length && (
                    <div>
                      <p className="text-sm text-gray-600 mb-2">Grain Photos</p>
                      <div className="grid grid-cols-3 gap-2">
                        {selectedComponent.source_tracking.grain_photos.map((photo, i) => (
                          <div key={i} className="aspect-square bg-gray-100 rounded flex items-center justify-center">
                            <Camera className="h-6 w-6 text-gray-400" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      ) : (
        /* Component List */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredComponents.map((component) => (
            <Card 
              key={component.id} 
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => setSelectedComponent(component)}
            >
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{component.specifications.model}</CardTitle>
                    <p className="text-sm text-gray-600 capitalize">
                      {component.specifications.wood_type}
                    </p>
                  </div>
                  <Badge className={component.grade === 'A' ? 'bg-green-600' : 'bg-blue-600'}>
                    Grade {component.grade}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Serial Numbers</span>
                    <div className="text-right">
                      <p className="font-mono text-xs">L: {component.left_cup_serial}</p>
                      <p className="font-mono text-xs">R: {component.right_cup_serial}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Progress</span>
                    <span className="font-medium">{component.journey.length} stages</span>
                  </div>
                  
                  <Progress value={getJourneyProgress(component)} className="h-2" />
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {component.final_metrics.quality_score && (
                        <Badge variant="outline" className={getQualityStatus(component).color}>
                          {component.final_metrics.quality_score}%
                        </Badge>
                      )}
                      {component.final_metrics.rework_count > 0 && (
                        <Badge variant="destructive" className="text-xs">
                          {component.final_metrics.rework_count} rework
                        </Badge>
                      )}
                    </div>
                    <ArrowRight className="h-4 w-4 text-gray-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredComponents.length === 0 && !selectedComponent && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Package className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No components found</h3>
            <p className="text-gray-500 text-center">
              {searchTerm 
                ? 'Try adjusting your search terms' 
                : 'Components will appear here as they are tracked through production'}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}