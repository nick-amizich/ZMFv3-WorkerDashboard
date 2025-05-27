'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { format } from 'date-fns'
import { 
  CheckCircle2, 
  ClipboardList, 
  User, 
  Calendar,
  Download,
  Filter,
  Eye,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'

interface QCSubmission {
  id: string
  worker_id: string
  worker_name: string
  production_step: string
  checklist_items: Array<{
    itemId: string
    itemText: string
    completed: boolean
    notes?: string
  }>
  overall_notes: string | null
  submitted_at: string
  product_info: {
    model?: string
    serialNumber?: string
    woodType?: string
  } | null
}

export function QCSubmissionsClient() {
  const [submissions, setSubmissions] = useState<QCSubmission[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState({
    worker_id: '',
    production_step: '',
    from_date: '',
    to_date: ''
  })
  const [workers, setWorkers] = useState<Array<{ id: string; name: string }>>([])
  const [expandedSubmissions, setExpandedSubmissions] = useState<Set<string>>(new Set())
  const { toast } = useToast()

  useEffect(() => {
    fetchWorkers()
    fetchSubmissions()
  }, [filter])

  const fetchWorkers = async () => {
    try {
      const response = await fetch('/api/qc/workers')
      if (response.ok) {
        const data = await response.json()
        setWorkers(data.workers || [])
      }
    } catch (error) {
      console.error('Error fetching workers:', error)
    }
  }

  const fetchSubmissions = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filter.worker_id) params.append('worker_id', filter.worker_id)
      if (filter.production_step) params.append('production_step', filter.production_step)
      if (filter.from_date) params.append('from_date', filter.from_date)
      if (filter.to_date) params.append('to_date', filter.to_date)

      const response = await fetch(`/api/qc/submissions?${params}`)
      if (response.ok) {
        const data = await response.json()
        setSubmissions(data.submissions || [])
      }
    } catch (error) {
      console.error('Error fetching submissions:', error)
      toast({
        title: 'Error',
        description: 'Failed to load QC submissions',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const toggleExpanded = (submissionId: string) => {
    const newExpanded = new Set(expandedSubmissions)
    if (newExpanded.has(submissionId)) {
      newExpanded.delete(submissionId)
    } else {
      newExpanded.add(submissionId)
    }
    setExpandedSubmissions(newExpanded)
  }

  const exportToCSV = () => {
    const headers = ['Worker', 'Step', 'Submitted At', 'Model', 'Serial Number', 'Wood Type', 'Checklist Items', 'Notes']
    const rows = submissions.map(sub => [
      sub.worker_name,
      sub.production_step.replace(/_/g, ' '),
      format(new Date(sub.submitted_at), 'yyyy-MM-dd HH:mm'),
      sub.product_info?.model || '',
      sub.product_info?.serialNumber || '',
      sub.product_info?.woodType || '',
      sub.checklist_items.filter(item => item.completed).length + '/' + sub.checklist_items.length,
      sub.overall_notes || ''
    ])

    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `qc-submissions-${format(new Date(), 'yyyy-MM-dd')}.csv`
    a.click()
  }

  const productionSteps = [
    { value: 'inventory_intake', label: 'Inventory Intake' },
    { value: 'sanding_pre_work', label: 'Sanding - Pre-Work' },
    { value: 'sanding_post_work', label: 'Sanding - Post-Work' },
    { value: 'finishing_pre_work', label: 'Finishing - Pre-Work' },
    { value: 'finishing_post_work', label: 'Finishing - Post-Work' },
    { value: 'sub_assembly_chassis_pre_work', label: 'Sub-assembly: Chassis - Pre-Work' },
    { value: 'sub_assembly_chassis_post_work', label: 'Sub-assembly: Chassis - Post-Work' },
    { value: 'sub_assembly_baffle_pre_work', label: 'Sub-assembly: Baffle - Pre-Work' },
    { value: 'sub_assembly_baffle_post_work', label: 'Sub-assembly: Baffle - Post-Work' },
    { value: 'final_production', label: 'Final Production' },
    { value: 'final_assembly', label: 'Final Assembly' },
    { value: 'acoustic_aesthetic_qc', label: 'Acoustic and Aesthetic QC' },
    { value: 'shipping', label: 'Shipping' }
  ]

  const getStepLabel = (step: string) => {
    return productionSteps.find(s => s.value === step)?.label || step.replace(/_/g, ' ')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">QC Submissions</h1>
          <p className="text-muted-foreground">Review quality control checklists from production workers</p>
        </div>
        <Button onClick={exportToCSV} variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Select value={filter.worker_id} onValueChange={(value) => setFilter(prev => ({ ...prev, worker_id: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="All Workers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Workers</SelectItem>
                {workers.map(worker => (
                  <SelectItem key={worker.id} value={worker.id}>
                    {worker.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filter.production_step} onValueChange={(value) => setFilter(prev => ({ ...prev, production_step: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="All Steps" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Steps</SelectItem>
                {productionSteps.map(step => (
                  <SelectItem key={step.value} value={step.value}>
                    {step.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <input
              type="date"
              className="px-3 py-2 border rounded-md"
              value={filter.from_date}
              onChange={(e) => setFilter(prev => ({ ...prev, from_date: e.target.value }))}
              placeholder="From Date"
            />

            <input
              type="date"
              className="px-3 py-2 border rounded-md"
              value={filter.to_date}
              onChange={(e) => setFilter(prev => ({ ...prev, to_date: e.target.value }))}
              placeholder="To Date"
            />
          </div>
        </CardContent>
      </Card>

      {/* Submissions List */}
      <div className="space-y-4">
        {submissions.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <ClipboardList className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No QC submissions found</p>
            </CardContent>
          </Card>
        ) : (
          submissions.map((submission) => (
            <Card key={submission.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <User className="h-4 w-4" />
                      {submission.worker_name}
                    </CardTitle>
                    <CardDescription>
                      {getStepLabel(submission.production_step)}
                    </CardDescription>
                  </div>
                  <div className="text-right space-y-1">
                    <Badge className="bg-green-100 text-green-800">
                      <CheckCircle2 className="mr-1 h-3 w-3" />
                      {submission.checklist_items.filter(item => item.completed).length}/{submission.checklist_items.length} Complete
                    </Badge>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(submission.submitted_at), 'MMM d, yyyy h:mm a')}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {submission.product_info && (
                  <div className="mb-4 p-3 bg-muted rounded-lg">
                    <p className="text-sm font-medium mb-1">Product Information</p>
                    <div className="flex gap-4 text-sm text-muted-foreground">
                      {submission.product_info.model && (
                        <span>Model: {submission.product_info.model}</span>
                      )}
                      {submission.product_info.serialNumber && (
                        <span>S/N: {submission.product_info.serialNumber}</span>
                      )}
                      {submission.product_info.woodType && (
                        <span>Wood: {submission.product_info.woodType}</span>
                      )}
                    </div>
                  </div>
                )}

                {submission.overall_notes && (
                  <div className="mb-4 p-3 bg-yellow-50 rounded-lg">
                    <p className="text-sm font-medium mb-1">Overall Notes</p>
                    <p className="text-sm">{submission.overall_notes}</p>
                  </div>
                )}

                <Collapsible
                  open={expandedSubmissions.has(submission.id)}
                  onOpenChange={() => toggleExpanded(submission.id)}
                >
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" className="w-full justify-between">
                      <span className="flex items-center gap-2">
                        <Eye className="h-4 w-4" />
                        View Checklist Details
                      </span>
                      {expandedSubmissions.has(submission.id) ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-4">
                    <div className="space-y-2">
                      {submission.checklist_items.map((item, index) => (
                        <div key={item.itemId} className="p-3 border rounded-lg">
                          <div className="flex items-start gap-3">
                            <CheckCircle2 
                              className={`h-5 w-5 mt-0.5 ${
                                item.completed ? 'text-green-600' : 'text-gray-300'
                              }`} 
                            />
                            <div className="flex-1">
                              <p className={`text-sm ${
                                item.completed ? '' : 'text-muted-foreground'
                              }`}>
                                {index + 1}. {item.itemText}
                              </p>
                              {item.notes && (
                                <p className="text-sm text-muted-foreground mt-1 pl-2 border-l-2 border-gray-200">
                                  Note: {item.notes}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}