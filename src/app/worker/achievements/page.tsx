'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { 
  Award, 
  Trophy, 
  Target, 
  TrendingUp, 
  Zap,
  Star,
  CheckCircle,
  Lock,
  Calendar,
  Flame
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface Achievement {
  id: string
  title: string
  description: string
  icon: string
  category: 'productivity' | 'quality' | 'milestone' | 'streak' | 'skill'
  earned_at: string | null
  progress?: number
  max_progress?: number
  is_earned: boolean
  difficulty: 'bronze' | 'silver' | 'gold' | 'platinum'
}

interface Streak {
  id: string
  type: 'daily_tasks' | 'quality_score' | 'on_time_completion'
  current_count: number
  best_count: number
  last_activity: string
}

interface Stats {
  total_achievements: number
  earned_achievements: number
  completion_percentage: number
  current_streaks: number
  points_earned: number
}

export default function WorkerAchievementsPage() {
  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [streaks, setStreaks] = useState<Streak[]>([])
  const [stats, setStats] = useState<Stats>({
    total_achievements: 0,
    earned_achievements: 0,
    completion_percentage: 0,
    current_streaks: 0,
    points_earned: 0
  })
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    fetchAchievementsData()
  }, [])

  const fetchAchievementsData = async () => {
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

      // Mock achievements data (in a real app, this would come from the database)
      const mockAchievements: Achievement[] = [
        {
          id: '1',
          title: 'First Steps',
          description: 'Complete your first task',
          icon: 'play',
          category: 'milestone',
          earned_at: new Date().toISOString(),
          is_earned: true,
          difficulty: 'bronze'
        },
        {
          id: '2',
          title: 'Quality Champion',
          description: 'Maintain 95%+ quality score for 30 days',
          icon: 'shield',
          category: 'quality',
          earned_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          is_earned: true,
          difficulty: 'gold'
        },
        {
          id: '3',
          title: 'Speed Demon',
          description: 'Complete 10 tasks in a single day',
          icon: 'zap',
          category: 'productivity',
          earned_at: null,
          progress: 7,
          max_progress: 10,
          is_earned: false,
          difficulty: 'silver'
        },
        {
          id: '4',
          title: 'Perfect Week',
          description: 'Complete all assigned tasks for 7 consecutive days',
          icon: 'calendar',
          category: 'streak',
          earned_at: null,
          progress: 4,
          max_progress: 7,
          is_earned: false,
          difficulty: 'silver'
        },
        {
          id: '5',
          title: 'Master Craftsman',
          description: 'Complete 1000 tasks with 90%+ quality',
          icon: 'award',
          category: 'milestone',
          earned_at: null,
          progress: 245,
          max_progress: 1000,
          is_earned: false,
          difficulty: 'platinum'
        },
        {
          id: '6',
          title: 'Team Player',
          description: 'Help complete 5 urgent team tasks',
          icon: 'users',
          category: 'skill',
          earned_at: null,
          progress: 2,
          max_progress: 5,
          is_earned: false,
          difficulty: 'bronze'
        }
      ]

      const mockStreaks: Streak[] = [
        {
          id: '1',
          type: 'daily_tasks',
          current_count: 12,
          best_count: 28,
          last_activity: new Date().toISOString()
        },
        {
          id: '2',
          type: 'quality_score',
          current_count: 8,
          best_count: 15,
          last_activity: new Date().toISOString()
        },
        {
          id: '3',
          type: 'on_time_completion',
          current_count: 5,
          best_count: 20,
          last_activity: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
        }
      ]

      setAchievements(mockAchievements)
      setStreaks(mockStreaks)
      
      const earned = mockAchievements.filter(a => a.is_earned).length
      setStats({
        total_achievements: mockAchievements.length,
        earned_achievements: earned,
        completion_percentage: Math.round((earned / mockAchievements.length) * 100),
        current_streaks: mockStreaks.filter(s => s.current_count > 0).length,
        points_earned: earned * 100 + mockStreaks.reduce((sum, s) => sum + s.current_count * 10, 0)
      })

    } catch (error) {
      console.error('Error fetching achievements data:', error)
      toast({
        title: 'Error',
        description: 'Failed to load achievements data',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'bronze': return 'text-amber-600 bg-amber-50 border-amber-200'
      case 'silver': return 'text-gray-600 bg-gray-50 border-gray-200'
      case 'gold': return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'platinum': return 'text-purple-600 bg-purple-50 border-purple-200'
      default: return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const getDifficultyIcon = (difficulty: string) => {
    switch (difficulty) {
      case 'bronze': return Award
      case 'silver': return Star
      case 'gold': return Trophy
      case 'platinum': return Zap
      default: return Award
    }
  }

  const getStreakIcon = (type: string) => {
    switch (type) {
      case 'daily_tasks': return CheckCircle
      case 'quality_score': return Target
      case 'on_time_completion': return Calendar
      default: return Flame
    }
  }

  const getStreakTitle = (type: string) => {
    switch (type) {
      case 'daily_tasks': return 'Daily Tasks'
      case 'quality_score': return 'Quality Excellence'
      case 'on_time_completion': return 'On-Time Completion'
      default: return 'Streak'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading achievements...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Achievements & Goals</h1>
        <p className="text-muted-foreground">Track your progress and celebrate your accomplishments</p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Achievements</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.earned_achievements}/{stats.total_achievements}</div>
            <Progress value={stats.completion_percentage} className="h-2 mt-2" />
            <p className="text-xs text-muted-foreground mt-1">{stats.completion_percentage}% complete</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Streaks</CardTitle>
            <Flame className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.current_streaks}</div>
            <p className="text-xs text-muted-foreground">Keep the momentum!</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Points Earned</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.points_earned.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Total score</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Progress</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {achievements.filter(a => !a.is_earned && a.progress).length}
            </div>
            <p className="text-xs text-muted-foreground">In progress</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for different views */}
      <Tabs defaultValue="achievements" className="space-y-4">
        <TabsList>
          <TabsTrigger value="achievements">Achievements</TabsTrigger>
          <TabsTrigger value="streaks">Streaks</TabsTrigger>
          <TabsTrigger value="progress">In Progress</TabsTrigger>
        </TabsList>

        <TabsContent value="achievements" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {achievements
              .filter(a => a.is_earned)
              .map((achievement) => {
                const DifficultyIcon = getDifficultyIcon(achievement.difficulty)
                return (
                  <Card key={achievement.id} className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-green-100 rounded-full">
                            <DifficultyIcon className="h-6 w-6 text-green-600" />
                          </div>
                          <div>
                            <CardTitle className="text-green-900">{achievement.title}</CardTitle>
                            <CardDescription className="text-green-700">
                              {achievement.description}
                            </CardDescription>
                          </div>
                        </div>
                        <Badge className={getDifficultyColor(achievement.difficulty)} variant="outline">
                          {achievement.difficulty}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-green-700">
                        🎉 Earned {formatDistanceToNow(new Date(achievement.earned_at!))} ago
                      </p>
                    </CardContent>
                  </Card>
                )
              })}
          </div>
        </TabsContent>

        <TabsContent value="streaks" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {streaks.map((streak) => {
              const StreakIcon = getStreakIcon(streak.type)
              const isActive = new Date(streak.last_activity).getTime() > Date.now() - 48 * 60 * 60 * 1000
              
              return (
                <Card key={streak.id} className={isActive ? 'border-orange-200 bg-orange-50' : ''}>
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${isActive ? 'bg-orange-100' : 'bg-gray-100'}`}>
                        <StreakIcon className={`h-6 w-6 ${isActive ? 'text-orange-600' : 'text-gray-600'}`} />
                      </div>
                      <div>
                        <CardTitle className={isActive ? 'text-orange-900' : 'text-gray-900'}>
                          {getStreakTitle(streak.type)}
                        </CardTitle>
                        <CardDescription className={isActive ? 'text-orange-700' : 'text-gray-600'}>
                          {isActive ? 'Active streak' : 'Inactive'}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Current</span>
                        <Badge variant={isActive ? 'default' : 'secondary'}>
                          {streak.current_count} days
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Best</span>
                        <span className="text-sm font-medium">{streak.best_count} days</span>
                      </div>
                      <Progress 
                        value={Math.min((streak.current_count / streak.best_count) * 100, 100)} 
                        className="h-2"
                      />
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>

        <TabsContent value="progress" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {achievements
              .filter(a => !a.is_earned)
              .map((achievement) => {
                const DifficultyIcon = getDifficultyIcon(achievement.difficulty)
                const progress = achievement.progress || 0
                const maxProgress = achievement.max_progress || 100
                const progressPercentage = (progress / maxProgress) * 100
                
                return (
                  <Card key={achievement.id} className="border-blue-200 bg-blue-50">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-blue-100 rounded-full">
                            {achievement.progress ? (
                              <DifficultyIcon className="h-6 w-6 text-blue-600" />
                            ) : (
                              <Lock className="h-6 w-6 text-gray-400" />
                            )}
                          </div>
                          <div>
                            <CardTitle className="text-blue-900">{achievement.title}</CardTitle>
                            <CardDescription className="text-blue-700">
                              {achievement.description}
                            </CardDescription>
                          </div>
                        </div>
                        <Badge className={getDifficultyColor(achievement.difficulty)} variant="outline">
                          {achievement.difficulty}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {achievement.progress !== undefined ? (
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Progress</span>
                            <span className="font-medium">{progress}/{maxProgress}</span>
                          </div>
                          <Progress value={progressPercentage} className="h-2" />
                          <p className="text-xs text-blue-700">
                            {Math.round(progressPercentage)}% complete
                          </p>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-600">
                          🔒 Requirements not yet met
                        </p>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
} 