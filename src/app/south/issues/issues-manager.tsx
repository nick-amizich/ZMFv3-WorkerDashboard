'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { AlertTriangle, CheckCircle, Clock, User, Calendar } from 'lucide-react'
import { logBusiness, logError } from '@/lib/logger-client'

interface Issue {
  id: string
  title: string
  description: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  resolution_status: 'open' | 'in_progress' | 'resolved' | 'closed'
  issue_type: string
  stage: string
  reported_by_id: string
  resolved_by_id?: string
  created_at: string
  resolved_at?: string
  resolution_notes?: string
  batch_id?: string
  task_id?: string
  order_item_id?: string
  image_urls?: string[]
  slack_thread_id?: string
  reported_by?: {
    name: string
    email: string
  }
  resolved_by?: {
    name: string
    email: string
  }
}

export function IssuesManager() {
  const [issues, setIssues] = useState<Issue[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null)
  const { toast } = useToast()
  const supabase = createClient()

  useEffect(() => {
    fetchIssues()
  }, [])

  const fetchIssues = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('production_issues')
        .select(`
          *,
          reported_by:workers!reported_by_id(name, email),
          resolved_by:workers!resolved_by_id(name, email)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error

      setIssues(data as Issue[] || [])
      logBusiness('Issues fetched successfully', 'ISSUES_MANAGER', { count: data?.length })
    } catch (error) {
      logError(error as Error, 'ISSUES_MANAGER', { action: 'fetch_issues' })
      toast({
        title: 'Error',
        description: 'Failed to fetch issues',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const updateIssueStatus = async (issueId: string, status: Issue['resolution_status'], resolutionNotes?: string) => {
    try {
      const updateData: any = { 
        resolution_status: status,
        ...(status === 'resolved' && { resolved_at: new Date().toISOString() }),
        ...(resolutionNotes && { resolution_notes: resolutionNotes })
      }

      const { error } = await supabase
        .from('production_issues')
        .update(updateData)
        .eq('id', issueId)

      if (error) throw error

      await fetchIssues()
      logBusiness(`Issue status updated to ${status}`, 'ISSUES_MANAGER', { issueId, status })
      
      toast({
        title: 'Success',
        description: `Issue marked as ${status}`,
      })
    } catch (error) {
      logError(error as Error, 'ISSUES_MANAGER', { action: 'update_status', issueId, status })
      toast({
        title: 'Error',
        description: 'Failed to update issue status',
        variant: 'destructive',
      })
    }
  }

  const getSeverityColor = (severity: Issue['severity']) => {
    switch (severity) {
      case 'critical': return 'bg-red-500'
      case 'high': return 'bg-orange-500'
      case 'medium': return 'bg-yellow-500'
      case 'low': return 'bg-blue-500'
      default: return 'bg-gray-500'
    }
  }

  const getStatusColor = (status: Issue['resolution_status']) => {
    switch (status) {
      case 'open': return 'bg-red-100 text-red-800'
      case 'in_progress': return 'bg-yellow-100 text-yellow-800'
      case 'resolved': return 'bg-green-100 text-green-800'
      case 'closed': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: Issue['resolution_status']) => {
    switch (status) {
      case 'open': return <AlertTriangle className="h-4 w-4" />
      case 'in_progress': return <Clock className="h-4 w-4" />
      case 'resolved': return <CheckCircle className="h-4 w-4" />
      case 'closed': return <CheckCircle className="h-4 w-4" />
      default: return <AlertTriangle className="h-4 w-4" />
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading issues...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Issues</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{issues.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Open Issues</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {issues.filter(i => i.resolution_status === 'open').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {issues.filter(i => i.resolution_status === 'in_progress').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Resolved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {issues.filter(i => i.resolution_status === 'resolved').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Issues List */}
      <div className="space-y-4">
        {issues.length === 0 ? (
          <Card>
            <CardContent className="py-8">
              <div className="text-center text-muted-foreground">
                <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No issues found</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          issues.map((issue) => (
            <Card key={issue.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{issue.title}</CardTitle>
                    <CardDescription>{issue.description}</CardDescription>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge className={getSeverityColor(issue.severity)}>
                      {issue.severity}
                    </Badge>
                    <Badge variant="outline" className={getStatusColor(issue.resolution_status)}>
                      {getStatusIcon(issue.resolution_status)}
                      <span className="ml-1">{issue.resolution_status.replace('_', ' ')}</span>
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="flex items-center space-x-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span>Reported by: {issue.reported_by?.name || 'Unknown'}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>Created: {new Date(issue.created_at).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-muted-foreground">Stage: {issue.stage}</span>
                  </div>
                </div>

                {issue.resolution_notes && (
                  <div className="mt-4 p-3 bg-green-50 rounded-md">
                    <p className="text-sm"><strong>Resolution:</strong> {issue.resolution_notes}</p>
                    {issue.resolved_by && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Resolved by {issue.resolved_by.name} on {new Date(issue.resolved_at!).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                )}

                <div className="flex justify-end space-x-2 mt-4">
                  {issue.resolution_status === 'open' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateIssueStatus(issue.id, 'in_progress')}
                    >
                      Start Working
                    </Button>
                  )}
                  {issue.resolution_status === 'in_progress' && (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => updateIssueStatus(issue.id, 'resolved', 'Issue resolved by South team')}
                    >
                      Mark Resolved
                    </Button>
                  )}
                  {issue.resolution_status === 'resolved' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateIssueStatus(issue.id, 'closed')}
                    >
                      Close Issue
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
} 