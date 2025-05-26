'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useToast } from '@/hooks/use-toast'
import { 
  Shield, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  TrendingUp, 
  TrendingDown,
  Award,
  Target,
  FileCheck,
  AlertTriangle,
  Lightbulb
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface QualityMetrics {
  firstPassYield: number
  defectRate: number
  totalInspections: number
  passedInspections: number
  failedInspections: number
  averageScore: number
  trend: 'up' | 'down' | 'stable'
}

interface RecentInspection {
  id: string
  component_tracking_id: string
  serial_number: string
  model: string
  status: 'passed' | 'failed' | 'needs_rework'
  overall_score: number
  created_at: string
  checkpoint_type: string
}

interface QualityPattern {
  id: string
  issue_type: string
  stage: string
  occurrence_count: number | null
  affected_models: string[] | null
  common_causes: string[] | null
  effective_solutions: string[] | null
  prevention_tips: string[] | null
  severity_trend: string | null
  created_at: string | null
}

interface Achievement {
  id: string
  title: string
  description: string
  icon: string
  earned_at: string
  type: 'milestone' | 'streak' | 'quality'
}

export default function WorkerQualityPage() {
  const [metrics, setMetrics] = useState<QualityMetrics | null>(null)
  const [recentInspections, setRecentInspections] = useState<RecentInspection[]>([])
  const [patterns, setPatterns] = useState<QualityPattern[]>([])
  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState('week')
  const { toast } = useToast()

  useEffect(() => {
    fetchQualityData()
  }, [period])

  const fetchQualityData = async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Fetch worker ID
      const { data: worker } = await supabase
        .from('workers')
        .select('id')
        .eq('auth_user_id', user.id)
        .single()
      
      if (!worker) return

      // Fetch quality metrics
      const response = await fetch(`/api/quality/analytics?period=${period}&group_by=worker`)
      if (response.ok) {
        const data = await response.json()
        const workerMetrics = data.find((m: any) => m.worker_id === worker.id)
        if (workerMetrics) {
          setMetrics({
            ...workerMetrics,
            trend: calculateTrend(workerMetrics)
          })
        }
      }

      // Fetch recent inspections
      const { data: inspections } = await supabase
        .from('inspection_results')
        .select(`
          *,
          component_tracking!inner(serial_number, model)
        `)
        .eq('inspector_id', worker.id)
        .order('created_at', { ascending: false })
        .limit(10)

      if (inspections) {
        setRecentInspections(inspections.map((i: any) => ({
          ...i,
          serial_number: i.component_tracking.serial_number,
          model: i.component_tracking.model
        })))
      }

      // Fetch quality patterns relevant to worker
      const { data: patternsData } = await supabase
        .from('quality_patterns')
        .select('*')
        .order('frequency', { ascending: false })
        .limit(5)

      if (patternsData) {
        setPatterns(patternsData)
      }

      // Mock achievements (would come from a real achievements table)
      setAchievements([
        {
          id: '1',
          title: 'Quality Champion',
          description: 'Maintained 95%+ first-pass yield for 30 days',
          icon: 'trophy',
          earned_at: new Date().toISOString(),
          type: 'quality'
        },
        {
          id: '2',
          title: 'Eagle Eye',
          description: 'Caught 10 critical defects before gate inspection',
          icon: 'eye',
          earned_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          type: 'milestone'
        }
      ])

    } catch (error) {
      console.error('Error fetching quality data:', error)
      toast({
        title: 'Error',
        description: 'Failed to load quality data',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const calculateTrend = (metrics: any): 'up' | 'down' | 'stable' => {
    // In a real app, compare with previous period
    if (metrics.firstPassYield > 90) return 'up'
    if (metrics.firstPassYield < 80) return 'down'
    return 'stable'
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'passed': return 'text-green-600'
      case 'failed': return 'text-red-600'
      case 'needs_rework': return 'text-yellow-600'
      default: return 'text-gray-600'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'passed': return CheckCircle
      case 'failed': return XCircle
      case 'needs_rework': return AlertCircle
      default: return AlertCircle
    }
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
      <div>
        <h1 className="text-3xl font-bold">Your Quality Dashboard</h1>
        <p className="text-muted-foreground">Track your quality metrics and improve your craft</p>
      </div>

      {/* Key Metrics */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">First-Pass Yield</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.firstPassYield.toFixed(1)}%</div>
              <div className="flex items-center text-xs text-muted-foreground">
                {metrics.trend === 'up' && <TrendingUp className="h-3 w-3 text-green-600 mr-1" />}
                {metrics.trend === 'down' && <TrendingDown className="h-3 w-3 text-red-600 mr-1" />}
                {metrics.trend === 'up' ? 'Improving' : metrics.trend === 'down' ? 'Needs attention' : 'Stable'}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Score</CardTitle>
              <Award className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.averageScore.toFixed(1)}/100</div>
              <Progress value={metrics.averageScore} className="h-2 mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Inspections</CardTitle>
              <FileCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.totalInspections}</div>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-green-600">{metrics.passedInspections} passed</span>
                <span className="text-muted-foreground">•</span>
                <span className="text-red-600">{metrics.failedInspections} failed</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Defect Rate</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.defectRate.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground">Lower is better</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Quality Tips */}
      <Alert className="border-blue-200 bg-blue-50">
        <Lightbulb className="h-4 w-4" />
        <AlertDescription>
          <strong>Quality Tip:</strong> Focus on component alignment during assembly - it&apos;s the most common cause of rework in your recent inspections.
        </AlertDescription>
      </Alert>

      {/* Tabs for detailed views */}
      <Tabs defaultValue="recent" className="space-y-4">
        <TabsList>
          <TabsTrigger value="recent">Recent Inspections</TabsTrigger>
          <TabsTrigger value="patterns">Quality Patterns</TabsTrigger>
          <TabsTrigger value="achievements">Achievements</TabsTrigger>
        </TabsList>

        <TabsContent value="recent" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Inspection Results</CardTitle>
              <CardDescription>Your last 10 quality inspections</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentInspections.map((inspection) => {
                  const StatusIcon = getStatusIcon(inspection.status)
                  return (
                    <div key={inspection.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <StatusIcon className={`h-5 w-5 ${getStatusColor(inspection.status)}`} />
                        <div>
                          <p className="font-medium">{inspection.serial_number}</p>
                          <p className="text-sm text-muted-foreground">
                            {inspection.model} • {inspection.checkpoint_type}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant={inspection.status === 'passed' ? 'default' : 'destructive'}>
                          Score: {inspection.overall_score}
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDistanceToNow(new Date(inspection.created_at))} ago
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="patterns" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Common Quality Patterns</CardTitle>
              <CardDescription>Recurring issues to watch out for</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {patterns.map((pattern) => (
                  <div key={pattern.id} className="p-4 border rounded-lg">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-semibold capitalize">{pattern.issue_type.replace('_', ' ')}</h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          Stage: {pattern.stage}
                          {pattern.common_causes && pattern.common_causes.length > 0 && 
                            <> • Common causes: {pattern.common_causes.join(', ')}</>
                          }
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span>Occurrences: {pattern.occurrence_count || 0}</span>
                          {pattern.affected_models && pattern.affected_models.length > 0 && (
                            <span>Models: {pattern.affected_models.join(', ')}</span>
                          )}
                        </div>
                        {pattern.prevention_tips && pattern.prevention_tips.length > 0 && (
                          <div className="mt-2 p-2 bg-blue-50 rounded text-xs">
                            <strong>Prevention:</strong> {pattern.prevention_tips[0]}
                          </div>
                        )}
                      </div>
                      <Button size="sm" variant="outline">
                        Learn More
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="achievements" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Your Achievements</CardTitle>
              <CardDescription>Recognition for quality excellence</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {achievements.map((achievement) => (
                  <div key={achievement.id} className="p-4 border rounded-lg bg-gradient-to-r from-yellow-50 to-orange-50">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-yellow-100 rounded-full">
                        <Award className="h-6 w-6 text-yellow-600" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold">{achievement.title}</h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          {achievement.description}
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                          Earned {formatDistanceToNow(new Date(achievement.earned_at))} ago
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {achievements.length === 0 && (
                <div className="text-center py-8">
                  <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">Complete quality inspections to earn achievements!</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Period Selector */}
      <div className="flex justify-end">
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="px-3 py-1 border rounded-md text-sm"
        >
          <option value="day">Today</option>
          <option value="week">This Week</option>
          <option value="month">This Month</option>
          <option value="all">All Time</option>
        </select>
      </div>
    </div>
  )
}