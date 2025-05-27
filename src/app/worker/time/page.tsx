'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { 
  Clock, 
  Play, 
  Pause, 
  StopCircle, 
  Calendar,
  TrendingUp,
  Timer,
  CheckCircle
} from 'lucide-react'
import { formatDistanceToNow, format, parseISO } from 'date-fns'

interface TimeEntry {
  id: string
  task_id: string
  start_time: string
  end_time: string | null
  duration_minutes: number | null
  task: {
    order_item: {
      product_name: string
      order: {
        order_number: string
      }
    }
    stage: string
  }
}

interface CurrentSession {
  id: string
  task_id: string
  start_time: string
  task: {
    order_item: {
      product_name: string
      order: {
        order_number: string
      }
    }
    stage: string
  }
}

export default function WorkerTimePage() {
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([])
  const [currentSession, setCurrentSession] = useState<CurrentSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [startingSession, setStartingSession] = useState(false)
  const [stoppingSession, setStoppingSession] = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date())
  const { toast } = useToast()

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    fetchTimeData()
  }, [])

  const fetchTimeData = async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Fetch worker
      const { data: worker } = await supabase
        .from('workers')
        .select('id')
        .eq('auth_user_id', user.id)
        .single()
      
      if (!worker) return

      // Mock current session for now
      setCurrentSession(null) // No active session for demo

      // Mock time entries for now (time tracking table structure needs to be clarified)
      const mockEntries = [
        {
          id: '1',
          task_id: 'task-1',
          start_time: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          end_time: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
          duration_minutes: 60,
          task: {
            order_item: {
              product_name: 'Custom Headphone Set',
              order: {
                order_number: 'ORD-12345'
              }
            },
            stage: 'assembly'
          }
        },
        {
          id: '2',
          task_id: 'task-2',
          start_time: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
          end_time: new Date(Date.now() - 3.5 * 60 * 60 * 1000).toISOString(),
          duration_minutes: 30,
          task: {
            order_item: {
              product_name: 'Premium Wireless Headphones',
              order: {
                order_number: 'ORD-12346'
              }
            },
            stage: 'qc'
          }
        }
      ]
      const entries = mockEntries

      if (entries) {
        setTimeEntries(entries)
      }

    } catch (error) {
      console.error('Error fetching time data:', error)
      toast({
        title: 'Error',
        description: 'Failed to load time tracking data',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleStartSession = async (taskId?: string) => {
    if (!taskId) {
      toast({
        title: 'No Task Selected',
        description: 'Please select a task to start timing',
        variant: 'destructive'
      })
      return
    }

    setStartingSession(true)
    try {
      const response = await fetch('/api/time/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId })
      })

      if (response.ok) {
        await fetchTimeData()
        toast({
          title: 'Session Started',
          description: 'Time tracking started for this task'
        })
      } else {
        throw new Error('Failed to start session')
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to start time tracking',
        variant: 'destructive'
      })
    } finally {
      setStartingSession(false)
    }
  }

  const handleStopSession = async () => {
    if (!currentSession) return

    setStoppingSession(true)
    try {
      const response = await fetch('/api/time/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: currentSession.id })
      })

      if (response.ok) {
        await fetchTimeData()
        toast({
          title: 'Session Stopped',
          description: 'Time has been recorded'
        })
      } else {
        throw new Error('Failed to stop session')
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to stop time tracking',
        variant: 'destructive'
      })
    } finally {
      setStoppingSession(false)
    }
  }

  const formatDuration = (minutes: number | null) => {
    if (!minutes) return '0m'
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours > 0) {
      return `${hours}h ${mins}m`
    }
    return `${mins}m`
  }

  const getCurrentSessionDuration = () => {
    if (!currentSession) return '0m'
    const start = parseISO(currentSession.start_time)
    const diffMs = currentTime.getTime() - start.getTime()
    const minutes = Math.floor(diffMs / (1000 * 60))
    return formatDuration(minutes)
  }

  const getTodayTotal = () => {
    const today = format(new Date(), 'yyyy-MM-dd')
    const todayEntries = timeEntries.filter(entry => 
      entry.start_time.startsWith(today)
    )
    const total = todayEntries.reduce((sum, entry) => sum + (entry.duration_minutes || 0), 0)
    return formatDuration(total)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading time tracking...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Time Tracking</h1>
        <p className="text-muted-foreground">Track your work time and productivity</p>
      </div>

      {/* Current Session */}
      {currentSession ? (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-900">
              <Timer className="h-5 w-5 animate-pulse" />
              Current Session - {getCurrentSessionDuration()}
            </CardTitle>
            <CardDescription className="text-green-700">
              Working on: {currentSession.task.order_item.product_name} 
              • Order: {currentSession.task.order_item.order.order_number}
              • Stage: {currentSession.task.stage}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-sm text-green-700">
                Started {formatDistanceToNow(parseISO(currentSession.start_time))} ago
              </div>
              <Button 
                onClick={handleStopSession}
                disabled={stoppingSession}
                variant="outline"
                className="border-green-600 text-green-700 hover:bg-green-100"
              >
                <StopCircle className="h-4 w-4 mr-2" />
                Stop Session
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-900">
              <Clock className="h-5 w-5" />
              No Active Session
            </CardTitle>
            <CardDescription className="text-blue-700">
              Start a time tracking session from your task list
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => window.location.href = '/worker'}
              variant="outline"
              className="border-blue-600 text-blue-700 hover:bg-blue-100"
            >
              <Play className="h-4 w-4 mr-2" />
              Go to Tasks
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Total</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{getTodayTotal()}</div>
            <p className="text-xs text-muted-foreground">Time worked today</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Week</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatDuration(timeEntries.reduce((sum, entry) => sum + (entry.duration_minutes || 0), 0))}
            </div>
            <p className="text-xs text-muted-foreground">Recent activity</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sessions</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{timeEntries.length}</div>
            <p className="text-xs text-muted-foreground">Completed sessions</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Time Entries */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Time Entries</CardTitle>
          <CardDescription>Your latest work sessions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {timeEntries.length === 0 ? (
              <div className="text-center py-8">
                <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No time entries yet</p>
                <p className="text-sm text-muted-foreground">Start tracking time on your tasks to see entries here</p>
              </div>
            ) : (
              timeEntries.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <h4 className="font-medium">{entry.task.order_item.product_name}</h4>
                    <p className="text-sm text-muted-foreground">
                      Order: {entry.task.order_item.order.order_number} • Stage: {entry.task.stage}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(parseISO(entry.start_time), 'MMM d, yyyy h:mm a')}
                      {entry.end_time && ` - ${format(parseISO(entry.end_time), 'h:mm a')}`}
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge variant="outline">
                      {formatDuration(entry.duration_minutes)}
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 