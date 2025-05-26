'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { 
  RefreshCw, 
  Search, 
  Filter,
  Download,
  AlertCircle,
  Clock,
  Database,
  Code,
  User,
  Activity,
  TrendingUp,
  AlertTriangle,
  Info,
  Bug
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface LogEntry {
  id: string
  created_at: string
  level: number
  message: string
  context: string
  correlation_id?: string
  user_id?: string
  api_method?: string
  api_url?: string
  api_status_code?: number
  api_duration?: number
  db_query?: string
  db_duration?: number
  db_row_count?: number
  error_name?: string
  error_message?: string
  error_stack?: string
  performance_duration?: number
  memory_usage?: number
  metadata?: Record<string, any>
}

interface LogAnalytics {
  log_date: string
  context: string
  level: number
  total_logs: number
  error_count: number
  warn_count: number
  info_count: number
  debug_count: number
  avg_api_duration?: number
  max_api_duration?: number
  avg_db_duration?: number
  max_db_duration?: number
}

interface ErrorPattern {
  error_pattern: string
  occurrences: number
  first_seen: string
  last_seen: string
  contexts: string[]
  sample_correlation_id: string
}

const LOG_LEVELS = {
  0: { name: 'ERROR', color: 'bg-red-100 text-red-800', icon: AlertCircle },
  1: { name: 'WARN', color: 'bg-yellow-100 text-yellow-800', icon: AlertTriangle },
  2: { name: 'INFO', color: 'bg-blue-100 text-blue-800', icon: Info },
  3: { name: 'DEBUG', color: 'bg-gray-100 text-gray-800', icon: Bug }
}

export function LogViewerClient() {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [analytics, setAnalytics] = useState<LogAnalytics[]>([])
  const [errorPatterns, setErrorPatterns] = useState<ErrorPattern[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [levelFilter, setLevelFilter] = useState<string>('all')
  const [contextFilter, setContextFilter] = useState<string>('all')
  const [timeFilter, setTimeFilter] = useState<string>('24h')
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null)
  const { toast } = useToast()
  const supabase = createClient()

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true)
      
      // For now, show a placeholder since application_logs table doesn't exist yet
      // This will be populated once the migration is run
      setLogs([])
      
      toast({
        title: 'Logs feature coming soon',
        description: 'Run the logs migration to enable logging functionality',
        variant: 'default'
      })
      
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch logs',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  const fetchAnalytics = useCallback(async () => {
    try {
      // Placeholder for analytics - will be implemented after migration
      setAnalytics([])
    } catch (error) {
      console.error('Analytics fetch error:', error)
    }
  }, [])

  const fetchErrorPatterns = useCallback(async () => {
    try {
      // Placeholder for error patterns - will be implemented after migration
      setErrorPatterns([])
    } catch (error) {
      console.error('Error patterns fetch error:', error)
    }
  }, [])

  useEffect(() => {
    fetchLogs()
    fetchAnalytics()
    fetchErrorPatterns()
  }, [fetchLogs, fetchAnalytics, fetchErrorPatterns])

  const exportLogs = () => {
    const csvContent = [
      ['Timestamp', 'Level', 'Context', 'Message', 'API URL', 'Duration', 'Error'].join(','),
      ...logs.map(log => [
        log.created_at,
        LOG_LEVELS[log.level as keyof typeof LOG_LEVELS]?.name || 'UNKNOWN',
        log.context,
        `"${log.message.replace(/"/g, '""')}"`,
        log.api_url || '',
        log.api_duration || log.db_duration || log.performance_duration || '',
        log.error_name || ''
      ].join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `logs-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const uniqueContexts = [...new Set(logs.map(log => log.context))].sort()

  return (
    <div className="space-y-6">
      {/* Filters and Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters & Controls
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search logs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={levelFilter} onValueChange={setLevelFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Log Level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="0">Errors Only</SelectItem>
                <SelectItem value="1">Warnings</SelectItem>
                <SelectItem value="2">Info</SelectItem>
                <SelectItem value="3">Debug</SelectItem>
              </SelectContent>
            </Select>

            <Select value={contextFilter} onValueChange={setContextFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Context" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Contexts</SelectItem>
                {uniqueContexts.map(context => (
                  <SelectItem key={context} value={context}>{context}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={timeFilter} onValueChange={setTimeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Time Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1h">Last Hour</SelectItem>
                <SelectItem value="24h">Last 24 Hours</SelectItem>
                <SelectItem value="7d">Last 7 Days</SelectItem>
                <SelectItem value="30d">Last 30 Days</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex gap-2">
              <Button onClick={fetchLogs} disabled={loading} size="sm">
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button onClick={exportLogs} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="logs" className="space-y-4">
        <TabsList>
          <TabsTrigger value="logs">Recent Logs</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="errors">Error Patterns</TabsTrigger>
        </TabsList>

        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Application Logs ({logs.length})</span>
                <Badge variant="outline">
                  {loading ? 'Loading...' : `Last updated ${formatDistanceToNow(new Date())} ago`}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {logs.map((log) => {
                  const levelInfo = LOG_LEVELS[log.level as keyof typeof LOG_LEVELS] || LOG_LEVELS[2]
                  const Icon = levelInfo.icon
                  
                  return (
                    <div
                      key={log.id}
                      className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => setSelectedLog(log)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <Icon className="h-4 w-4 text-gray-500 mt-0.5" />
                          <div>
                            <div className="flex items-center gap-2">
                              <Badge className={levelInfo.color}>
                                {levelInfo.name}
                              </Badge>
                              <Badge variant="outline">{log.context}</Badge>
                              {log.api_url && (
                                <Badge variant="secondary">
                                  {log.api_method} {log.api_url}
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-gray-900 mt-1">{log.message}</p>
                            {log.error_message && (
                              <p className="text-sm text-red-600 mt-1">{log.error_message}</p>
                            )}
                          </div>
                        </div>
                        <div className="text-right text-xs text-gray-500">
                          <div>{formatDistanceToNow(new Date(log.created_at))} ago</div>
                          {log.api_duration && (
                            <div className="flex items-center gap-1 mt-1">
                              <Clock className="h-3 w-3" />
                              {log.api_duration}ms
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
                
                {logs.length === 0 && !loading && (
                  <div className="text-center py-8 text-gray-500">
                    No logs found matching your criteria
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {analytics.slice(0, 8).map((stat, index) => (
              <Card key={index}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">{stat.context}</p>
                      <p className="text-2xl font-bold">{stat.total_logs}</p>
                      <p className="text-xs text-gray-500">
                        {stat.error_count} errors, {stat.warn_count} warnings
                      </p>
                    </div>
                    <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <Activity className="h-4 w-4 text-blue-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="errors" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-500" />
                Error Patterns (Last 7 Days)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {errorPatterns.map((pattern, index) => (
                  <div key={index} className="p-4 border rounded-lg">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{pattern.error_pattern}</h4>
                        <p className="text-sm text-gray-600 mt-1">
                          Occurred {pattern.occurrences} times in contexts: {pattern.contexts.join(', ')}
                        </p>
                        <p className="text-xs text-gray-500 mt-2">
                          First seen: {formatDistanceToNow(new Date(pattern.first_seen))} ago •
                          Last seen: {formatDistanceToNow(new Date(pattern.last_seen))} ago
                        </p>
                      </div>
                      <Badge variant="destructive">
                        {pattern.occurrences}
                      </Badge>
                    </div>
                  </div>
                ))}
                
                {errorPatterns.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No error patterns found in the last 7 days
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Log Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-4xl max-h-96 overflow-y-auto">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Log Details
                <Button variant="ghost" onClick={() => setSelectedLog(null)}>×</Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="text-sm bg-gray-100 p-4 rounded overflow-x-auto">
                {JSON.stringify(selectedLog, null, 2)}
              </pre>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
} 