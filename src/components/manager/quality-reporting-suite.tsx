'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { 
  FileText, 
  Download, 
  Send, 
  Calendar as CalendarIcon,
  Filter,
  TrendingUp,
  Award,
  AlertCircle,
  CheckCircle,
  XCircle,
  BarChart3,
  LineChart,
  Shield,
  Printer,
  Mail,
  FileDown
} from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'

interface QualityReport {
  id: string
  type: 'batch' | 'product' | 'worker' | 'period'
  title: string
  date_range: {
    start: Date
    end: Date
  }
  metrics: {
    first_pass_yield: number
    defect_rate: number
    rework_rate: number
    quality_score: number
    units_produced: number
    units_passed: number
    units_failed: number
    units_reworked: number
  }
  top_issues: Array<{
    issue_type: string
    count: number
    percentage: number
  }>
  quality_trends: Array<{
    date: string
    fpy: number
    defect_rate: number
  }>
  certifications: Array<{
    batch_id: string
    product_name: string
    serial_numbers: string[]
    quality_grade: 'A' | 'B' | 'C'
    inspection_date: Date
    inspector: string
  }>
}

interface QualityCertificate {
  id: string
  batch_id: string
  product_info: {
    name: string
    model: string
    serial_numbers: string[]
  }
  quality_metrics: {
    overall_score: number
    visual_inspection: number
    acoustic_performance: number
    build_quality: number
    component_tracking: {
      wood_batch: string
      hardware_batch: string
      driver_batch: string
    }
  }
  inspection_details: {
    date: Date
    inspector: string
    location: string
    environmental_conditions: {
      temperature: number
      humidity: number
    }
  }
  certification_status: 'passed' | 'conditional' | 'failed'
  notes: string
  signature: {
    name: string
    title: string
    date: Date
  }
}

interface QualityReportingSuiteProps {
  onGenerateReport?: (report: QualityReport) => void
  onExportCertificate?: (certificate: QualityCertificate) => void
}

export function QualityReportingSuite({ 
  onGenerateReport,
  onExportCertificate 
}: QualityReportingSuiteProps) {
  const [selectedReportType, setSelectedReportType] = useState<'batch' | 'product' | 'worker' | 'period'>('batch')
  const [dateRange, setDateRange] = useState<{ start: Date | undefined; end: Date | undefined }>({
    start: undefined,
    end: undefined
  })
  const [selectedBatch, setSelectedBatch] = useState<string>('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [currentReport, setCurrentReport] = useState<QualityReport | null>(null)
  const [certificates, setCertificates] = useState<QualityCertificate[]>([])

  // Mock data for demonstration
  useEffect(() => {
    // Simulate loading certificates
    const mockCertificates: QualityCertificate[] = [
      {
        id: 'cert-001',
        batch_id: 'BATCH-2024-001',
        product_info: {
          name: 'ZMF Premium Headphones',
          model: 'ZMF-001',
          serial_numbers: ['SN-001', 'SN-002', 'SN-003']
        },
        quality_metrics: {
          overall_score: 98.5,
          visual_inspection: 99,
          acoustic_performance: 98,
          build_quality: 98.5,
          component_tracking: {
            wood_batch: 'WOOD-2024-015',
            hardware_batch: 'HW-2024-032',
            driver_batch: 'DRV-2024-048'
          }
        },
        inspection_details: {
          date: new Date(),
          inspector: 'Jane Smith',
          location: 'QC Station 1',
          environmental_conditions: {
            temperature: 22,
            humidity: 45
          }
        },
        certification_status: 'passed',
        notes: 'Exceptional build quality, meets all premium standards',
        signature: {
          name: 'John Doe',
          title: 'Quality Manager',
          date: new Date()
        }
      }
    ]
    setCertificates(mockCertificates)
  }, [])

  const generateReport = async () => {
    setIsGenerating(true)
    
    // Simulate report generation
    setTimeout(() => {
      const mockReport: QualityReport = {
        id: `report-${Date.now()}`,
        type: selectedReportType,
        title: `Quality Report - ${selectedReportType.toUpperCase()}`,
        date_range: {
          start: dateRange.start || new Date(),
          end: dateRange.end || new Date()
        },
        metrics: {
          first_pass_yield: 94.5,
          defect_rate: 5.5,
          rework_rate: 3.2,
          quality_score: 96.8,
          units_produced: 1250,
          units_passed: 1181,
          units_failed: 69,
          units_reworked: 40
        },
        top_issues: [
          { issue_type: 'Surface Finish', count: 23, percentage: 33.3 },
          { issue_type: 'Driver Alignment', count: 18, percentage: 26.1 },
          { issue_type: 'Cable Connection', count: 15, percentage: 21.7 },
          { issue_type: 'Packaging', count: 13, percentage: 18.9 }
        ],
        quality_trends: Array.from({ length: 7 }, (_, i) => ({
          date: format(new Date(Date.now() - i * 24 * 60 * 60 * 1000), 'MMM dd'),
          fpy: 92 + Math.random() * 5,
          defect_rate: 3 + Math.random() * 4
        })).reverse(),
        certifications: certificates.map(cert => ({
          batch_id: cert.batch_id,
          product_name: cert.product_info.name,
          serial_numbers: cert.product_info.serial_numbers,
          quality_grade: cert.quality_metrics.overall_score >= 95 ? 'A' : 'B',
          inspection_date: cert.inspection_details.date,
          inspector: cert.inspection_details.inspector
        }))
      }
      
      setCurrentReport(mockReport)
      if (onGenerateReport) {
        onGenerateReport(mockReport)
      }
      setIsGenerating(false)
    }, 2000)
  }

  const exportCertificate = (certificate: QualityCertificate, format: 'pdf' | 'print' | 'email') => {
    if (onExportCertificate) {
      onExportCertificate(certificate)
    }
    
    // Handle different export formats
    switch (format) {
      case 'pdf':
        console.log('Exporting certificate as PDF:', certificate.id)
        break
      case 'print':
        window.print()
        break
      case 'email':
        console.log('Emailing certificate:', certificate.id)
        break
    }
  }

  const renderReportMetrics = () => {
    if (!currentReport) return null
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              First Pass Yield
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">
                {currentReport.metrics.first_pass_yield.toFixed(1)}%
              </span>
              <TrendingUp className="h-5 w-5 text-green-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Defect Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">
                {currentReport.metrics.defect_rate.toFixed(1)}%
              </span>
              <AlertCircle className="h-5 w-5 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Units Produced
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">
                {currentReport.metrics.units_produced.toLocaleString()}
              </span>
              <BarChart3 className="h-5 w-5 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Quality Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">
                {currentReport.metrics.quality_score.toFixed(1)}
              </span>
              <Award className="h-5 w-5 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const renderCertificate = (certificate: QualityCertificate) => {
    return (
      <Card className="p-8 max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <Shield className="h-16 w-16 mx-auto mb-4 text-blue-600" />
          <h1 className="text-3xl font-bold mb-2">Quality Certificate</h1>
          <p className="text-gray-600">ZMF Audio Manufacturing</p>
        </div>
        
        <Separator className="my-6" />
        
        <div className="grid grid-cols-2 gap-8 mb-8">
          <div>
            <h3 className="font-semibold mb-4">Product Information</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Product:</span>
                <span className="font-medium">{certificate.product_info.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Model:</span>
                <span className="font-medium">{certificate.product_info.model}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Batch ID:</span>
                <span className="font-medium">{certificate.batch_id}</span>
              </div>
              <div>
                <span className="text-gray-600">Serial Numbers:</span>
                <div className="mt-1">
                  {certificate.product_info.serial_numbers.map(sn => (
                    <Badge key={sn} variant="outline" className="mr-1 mb-1">
                      {sn}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </div>
          
          <div>
            <h3 className="font-semibold mb-4">Quality Metrics</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Overall Score:</span>
                <span className="font-medium">{certificate.quality_metrics.overall_score}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Visual Inspection:</span>
                <span className="font-medium">{certificate.quality_metrics.visual_inspection}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Acoustic Performance:</span>
                <span className="font-medium">{certificate.quality_metrics.acoustic_performance}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Build Quality:</span>
                <span className="font-medium">{certificate.quality_metrics.build_quality}%</span>
              </div>
            </div>
          </div>
        </div>
        
        <Separator className="my-6" />
        
        <div className="grid grid-cols-2 gap-8 mb-8">
          <div>
            <h3 className="font-semibold mb-4">Component Tracking</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Wood Batch:</span>
                <span className="font-medium">{certificate.quality_metrics.component_tracking.wood_batch}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Hardware Batch:</span>
                <span className="font-medium">{certificate.quality_metrics.component_tracking.hardware_batch}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Driver Batch:</span>
                <span className="font-medium">{certificate.quality_metrics.component_tracking.driver_batch}</span>
              </div>
            </div>
          </div>
          
          <div>
            <h3 className="font-semibold mb-4">Inspection Details</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Date:</span>
                <span className="font-medium">
                  {format(certificate.inspection_details.date, 'MMM dd, yyyy')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Inspector:</span>
                <span className="font-medium">{certificate.inspection_details.inspector}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Temperature:</span>
                <span className="font-medium">{certificate.inspection_details.environmental_conditions.temperature}°C</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Humidity:</span>
                <span className="font-medium">{certificate.inspection_details.environmental_conditions.humidity}%</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="mb-8">
          <h3 className="font-semibold mb-2">Certification Status</h3>
          <div className="flex items-center space-x-4">
            <Badge 
              className={cn(
                "text-lg px-4 py-2",
                certificate.certification_status === 'passed' && "bg-green-100 text-green-800",
                certificate.certification_status === 'conditional' && "bg-yellow-100 text-yellow-800",
                certificate.certification_status === 'failed' && "bg-red-100 text-red-800"
              )}
            >
              {certificate.certification_status === 'passed' && <CheckCircle className="h-5 w-5 mr-2" />}
              {certificate.certification_status === 'conditional' && <AlertCircle className="h-5 w-5 mr-2" />}
              {certificate.certification_status === 'failed' && <XCircle className="h-5 w-5 mr-2" />}
              {certificate.certification_status.toUpperCase()}
            </Badge>
            {certificate.notes && (
              <p className="text-sm text-gray-600 italic">{certificate.notes}</p>
            )}
          </div>
        </div>
        
        <Separator className="my-6" />
        
        <div className="flex justify-between items-end">
          <div>
            <p className="text-sm text-gray-600">This certificate verifies that the above product has been manufactured and inspected according to ZMF Audio quality standards.</p>
          </div>
          <div className="text-right">
            <div className="border-t border-gray-300 pt-2 mt-8 w-48">
              <p className="font-medium">{certificate.signature.name}</p>
              <p className="text-sm text-gray-600">{certificate.signature.title}</p>
              <p className="text-sm text-gray-600">
                {format(certificate.signature.date, 'MMM dd, yyyy')}
              </p>
            </div>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Quality Reporting Suite</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="reports" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="reports">Quality Reports</TabsTrigger>
              <TabsTrigger value="certificates">Certificates</TabsTrigger>
            </TabsList>
            
            <TabsContent value="reports" className="space-y-4">
              {/* Report Generation Controls */}
              <Card className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <Label>Report Type</Label>
                    <Select value={selectedReportType} onValueChange={(value: any) => setSelectedReportType(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="batch">Batch Report</SelectItem>
                        <SelectItem value="product">Product Report</SelectItem>
                        <SelectItem value="worker">Worker Performance</SelectItem>
                        <SelectItem value="period">Period Summary</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label>Start Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-left font-normal">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {dateRange.start ? format(dateRange.start, 'PPP') : 'Pick a date'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={dateRange.start}
                          onSelect={(date) => setDateRange({ ...dateRange, start: date })}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  
                  <div>
                    <Label>End Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-left font-normal">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {dateRange.end ? format(dateRange.end, 'PPP') : 'Pick a date'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={dateRange.end}
                          onSelect={(date) => setDateRange({ ...dateRange, end: date })}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  
                  <div className="flex items-end">
                    <Button 
                      onClick={generateReport} 
                      disabled={isGenerating}
                      className="w-full"
                    >
                      {isGenerating ? (
                        <>Generating...</>
                      ) : (
                        <>
                          <FileText className="h-4 w-4 mr-2" />
                          Generate Report
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </Card>
              
              {/* Report Display */}
              {currentReport && (
                <div className="space-y-6">
                  {/* Metrics Overview */}
                  {renderReportMetrics()}
                  
                  {/* Top Issues */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Top Quality Issues</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {currentReport.top_issues.map((issue, index) => (
                          <div key={index} className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <span className="text-sm font-medium">{issue.issue_type}</span>
                              <Badge variant="outline">{issue.count} occurrences</Badge>
                            </div>
                            <div className="flex items-center space-x-2">
                              <div className="w-32 bg-gray-200 rounded-full h-2">
                                <div 
                                  className="bg-blue-600 h-2 rounded-full"
                                  style={{ width: `${issue.percentage}%` }}
                                />
                              </div>
                              <span className="text-sm text-gray-600 w-12 text-right">
                                {issue.percentage}%
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                  
                  {/* Export Actions */}
                  <div className="flex justify-end space-x-2">
                    <Button variant="outline">
                      <Download className="h-4 w-4 mr-2" />
                      Export PDF
                    </Button>
                    <Button variant="outline">
                      <Send className="h-4 w-4 mr-2" />
                      Email Report
                    </Button>
                    <Button variant="outline">
                      <FileDown className="h-4 w-4 mr-2" />
                      Export Data
                    </Button>
                  </div>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="certificates" className="space-y-4">
              {/* Certificate List */}
              <div className="grid gap-4">
                {certificates.map((certificate) => (
                  <Card key={certificate.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-3">
                          <h3 className="font-semibold">{certificate.product_info.name}</h3>
                          <Badge 
                            variant={certificate.certification_status === 'passed' ? 'default' : 'destructive'}
                          >
                            {certificate.certification_status}
                          </Badge>
                        </div>
                        <div className="flex items-center space-x-4 text-sm text-gray-600">
                          <span>Batch: {certificate.batch_id}</span>
                          <span>Score: {certificate.quality_metrics.overall_score}%</span>
                          <span>Date: {format(certificate.inspection_details.date, 'MMM dd, yyyy')}</span>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => exportCertificate(certificate, 'pdf')}
                        >
                          <FileDown className="h-4 w-4 mr-1" />
                          PDF
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => exportCertificate(certificate, 'print')}
                        >
                          <Printer className="h-4 w-4 mr-1" />
                          Print
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => exportCertificate(certificate, 'email')}
                        >
                          <Mail className="h-4 w-4 mr-1" />
                          Email
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
              
              {/* Certificate Preview */}
              {certificates.length > 0 && (
                <div className="mt-8">
                  <h3 className="text-lg font-semibold mb-4">Certificate Preview</h3>
                  {renderCertificate(certificates[0])}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}