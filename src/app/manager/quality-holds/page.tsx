'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  User, 
  Package,
  Search,
  Filter,
  XCircle,
  ArrowRight,
  Camera,
  MessageSquare,
  History,
  TrendingUp,
  FileText
} from 'lucide-react'

interface QualityHold {
  id: string
  batch_id: string
  component_tracking_id?: string
  hold_reason: string
  severity: 'critical' | 'major' | 'minor'
  reported_by: string
  assigned_to?: string
  status: 'active' | 'investigating' | 'resolved' | 'escalated'
  resolution_notes?: string
  resolved_at?: string
  escalated_at?: string
  created_at: string
  updated_at: string
  batch?: {
    name: string
    current_stage: string
    items_count: number
  }
  component?: {
    left_cup_serial: string
    right_cup_serial: string
    specifications: {
      model: string
      wood_type: string
    }
  }
  reporter?: {
    name: string
  }
  assignee?: {
    name: string
  }
}

interface InvestigationNote {
  id: string
  hold_id: string
  author: string
  content: string
  created_at: string
  attachments?: string[]
}

export default function QualityHoldsPage() {
  const [holds, setHolds] = useState<QualityHold[]>([])
  const [selectedHold, setSelectedHold] = useState<QualityHold | null>(null)
  const [investigationNotes, setInvestigationNotes] = useState<InvestigationNote[]>([])
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterSeverity, setFilterSeverity] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(false)
  const [investigationModalOpen, setInvestigationModalOpen] = useState(false)
  const [resolutionNotes, setResolutionNotes] = useState('')
  const { toast } = useToast()

  // Fetch quality holds
  const fetchHolds = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filterStatus !== 'all') params.append('status', filterStatus)
      if (filterSeverity !== 'all') params.append('severity', filterSeverity)
      if (searchTerm) params.append('search', searchTerm)

      const response = await fetch(`/api/quality/holds?${params}`)
      if (response.ok) {
        const data = await response.json()
        setHolds(data)
      }
    } catch (error) {
      toast({
        title: 'Failed to load quality holds',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchHolds()
  }, [filterStatus, filterSeverity])

  // Update hold status
  const updateHoldStatus = async (holdId: string, newStatus: string, notes?: string) => {
    try {
      const response = await fetch(`/api/quality/holds/${holdId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          resolution_notes: notes || undefined
        })
      })

      if (response.ok) {
        toast({
          title: 'Hold updated',
          description: `Status changed to ${newStatus}`
        })
        fetchHolds()
        setInvestigationModalOpen(false)
        setSelectedHold(null)
        setResolutionNotes('')
      }
    } catch (error) {
      toast({
        title: 'Failed to update hold',
        variant: 'destructive'
      })
    }
  }

  // Assign hold to someone
  const assignHold = async (holdId: string, assigneeId: string) => {
    try {
      const response = await fetch(`/api/quality/holds/${holdId}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assigned_to: assigneeId })
      })

      if (response.ok) {
        toast({
          title: 'Hold assigned',
          description: 'Team member has been notified'
        })
        fetchHolds()
      }
    } catch (error) {
      toast({
        title: 'Failed to assign hold',
        variant: 'destructive'
      })
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive'
      case 'major': return 'default' 
      case 'minor': return 'secondary'
      default: return 'outline'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-red-100 text-red-800 border-red-200'
      case 'investigating': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'resolved': return 'bg-green-100 text-green-800 border-green-200'
      case 'escalated': return 'bg-purple-100 text-purple-800 border-purple-200'
      default: return ''
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <AlertTriangle className="h-4 w-4" />
      case 'investigating': return <Search className="h-4 w-4" />
      case 'resolved': return <CheckCircle className="h-4 w-4" />
      case 'escalated': return <TrendingUp className="h-4 w-4" />
      default: return <Shield className="h-4 w-4" />
    }
  }

  // Calculate hold duration
  const getHoldDuration = (hold: QualityHold) => {
    const start = new Date(hold.created_at)
    const end = hold.resolved_at ? new Date(hold.resolved_at) : new Date()
    const hours = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60))
    
    if (hours < 24) return `${hours}h`
    return `${Math.floor(hours / 24)}d ${hours % 24}h`
  }

  const activeHolds = holds.filter(h => h.status === 'active').length
  const criticalHolds = holds.filter(h => h.severity === 'critical' && h.status !== 'resolved').length

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Quality Holds</h2>
          <p className="text-muted-foreground">
            Manage production holds and quality investigations
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant="destructive" className="text-lg px-4 py-2">
            {activeHolds} Active Holds
          </Badge>
          {criticalHolds > 0 && (
            <Badge variant="destructive" className="text-lg px-4 py-2 animate-pulse">
              {criticalHolds} Critical
            </Badge>
          )}
        </div>
      </div>

      {/* Critical Alert */}
      {criticalHolds > 0 && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            <strong>{criticalHolds} critical hold(s)</strong> are blocking production. 
            Immediate action required to minimize impact.
          </AlertDescription>
        </Alert>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search by batch, component, or reason..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && fetchHolds()}
                className="pl-10"
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="investigating">Investigating</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="escalated">Escalated</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterSeverity} onValueChange={setFilterSeverity}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All Severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severity</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="major">Major</SelectItem>
                <SelectItem value="minor">Minor</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={fetchHolds} variant="outline">
              <Filter className="mr-2 h-4 w-4" />
              Apply
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Holds List */}
      <div className="grid gap-4">
        {holds.map((hold) => (
          <Card 
            key={hold.id} 
            className={`transition-all hover:shadow-md cursor-pointer ${
              hold.status === 'active' ? 'border-red-200' : ''
            }`}
            onClick={() => setSelectedHold(hold)}
          >
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1 space-y-3">
                  {/* Header */}
                  <div className="flex items-center gap-3">
                    <Badge className={`${getStatusColor(hold.status)} flex items-center gap-1`}>
                      {getStatusIcon(hold.status)}
                      {hold.status.charAt(0).toUpperCase() + hold.status.slice(1)}
                    </Badge>
                    <Badge variant={getSeverityColor(hold.severity)}>
                      {hold.severity.toUpperCase()}
                    </Badge>
                    {hold.batch && (
                      <Badge variant="outline">
                        <Package className="h-3 w-3 mr-1" />
                        {hold.batch.name}
                      </Badge>
                    )}
                    {hold.component && (
                      <Badge variant="outline">
                        {hold.component.specifications.model}
                      </Badge>
                    )}
                  </div>

                  {/* Hold Reason */}
                  <div>
                    <h3 className="font-semibold text-lg">{hold.hold_reason}</h3>
                    {hold.component && (
                      <p className="text-sm text-muted-foreground">
                        Component: {hold.component.left_cup_serial} / {hold.component.right_cup_serial}
                      </p>
                    )}
                  </div>

                  {/* Metadata */}
                  <div className="flex items-center gap-6 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      Reported by {hold.reporter?.name}
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Duration: {getHoldDuration(hold)}
                    </div>
                    {hold.assignee && (
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        Assigned to {hold.assignee.name}
                      </div>
                    )}
                  </div>

                  {/* Resolution Notes Preview */}
                  {hold.resolution_notes && (
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-700">
                        <strong>Resolution:</strong> {hold.resolution_notes}
                      </p>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2 ml-4">
                  {hold.status === 'active' && (
                    <Button 
                      size="sm" 
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedHold(hold)
                        setInvestigationModalOpen(true)
                      }}
                    >
                      Investigate
                    </Button>
                  )}
                  {hold.status === 'investigating' && (
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedHold(hold)
                        setInvestigationModalOpen(true)
                      }}
                    >
                      Update
                    </Button>
                  )}
                  <Button 
                    size="sm" 
                    variant="ghost"
                  >
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {holds.length === 0 && !loading && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Shield className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No quality holds found</h3>
            <p className="text-gray-500 text-center">
              {filterStatus !== 'all' || filterSeverity !== 'all' 
                ? 'Try adjusting your filters'
                : 'Quality holds will appear here when issues are reported'}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Investigation Modal */}
      <Dialog open={investigationModalOpen} onOpenChange={setInvestigationModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Quality Hold Investigation</DialogTitle>
            <DialogDescription>
              Update the status and add investigation notes
            </DialogDescription>
          </DialogHeader>

          {selectedHold && (
            <div className="space-y-4">
              {/* Hold Details */}
              <div className="p-4 bg-gray-50 rounded-lg space-y-2">
                <div className="flex items-center gap-2">
                  <Badge className={getStatusColor(selectedHold.status)}>
                    {selectedHold.status}
                  </Badge>
                  <Badge variant={getSeverityColor(selectedHold.severity)}>
                    {selectedHold.severity}
                  </Badge>
                </div>
                <p className="font-medium">{selectedHold.hold_reason}</p>
                <p className="text-sm text-muted-foreground">
                  Reported {new Date(selectedHold.created_at).toLocaleString()}
                </p>
              </div>

              {/* Status Update */}
              <div className="space-y-2">
                <Label>Update Status</Label>
                <Select 
                  value={selectedHold.status} 
                  onValueChange={(value) => updateHoldStatus(selectedHold.id, value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="investigating">Investigating</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="escalated">Escalated</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Resolution Notes */}
              <div className="space-y-2">
                <Label>Investigation Notes</Label>
                <Textarea
                  placeholder="Add findings, root cause, corrective actions..."
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  rows={4}
                />
              </div>

              {/* Investigation History */}
              <div className="space-y-2">
                <Label>Investigation History</Label>
                <div className="border rounded-lg p-3 space-y-2 max-h-48 overflow-y-auto">
                  <div className="text-sm space-y-2">
                    <div className="flex items-start gap-2">
                      <History className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="font-medium">Hold created</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(selectedHold.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    {/* Add more history items here */}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setInvestigationModalOpen(false)}>
                  Cancel
                </Button>
                {selectedHold.status !== 'resolved' && (
                  <Button 
                    onClick={() => updateHoldStatus(selectedHold.id, 'resolved', resolutionNotes)}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    Mark Resolved
                  </Button>
                )}
                {resolutionNotes && selectedHold.status === 'investigating' && (
                  <Button 
                    onClick={() => updateHoldStatus(selectedHold.id, 'investigating', resolutionNotes)}
                  >
                    Save Progress
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}