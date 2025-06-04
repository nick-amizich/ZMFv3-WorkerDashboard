'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { 
  Calendar,
  Package,
  Play,
  CheckCircle,
  Clock,
  AlertTriangle,
  TreePine,
  Layers,
  ArrowRight,
  BarChart3,
  ScanLine,
  Plus
} from 'lucide-react'
import { logBusiness, logError } from '@/lib/logger-client'
import { JobSelectionModal } from './job-selection-modal'
import { ProductionCompletionModal } from './production-completion-modal'
import { MaterialPullingModal } from './material-pulling-modal'

interface MachiningJob {
  id: string
  job_number: string
  model: string | null
  species_required: string
  thickness_required: number
  quantity_required: number
  scheduled_date: string
  priority: number
  status: 'not_started' | 'in_progress' | 'completed' | 'cancelled'
  assigned_to: string | null
  assigned_to_name?: string
  started_at: string | null
  completed_at: string | null
  actual_quantity_produced: number | null
  notes: string | null
  materials_pulled: number
  total_produced: number
}

interface InventorySummary {
  material_type: 'raw' | 'finished'
  species: string
  item_count: number
  total_board_feet: number | null
  avg_yield: number | null
}

interface DashboardMetrics {
  todaysJobs: number
  completedJobs: number
  inProgressJobs: number
  totalMaterialsPulled: number
  totalBlocksProduced: number
  lowStockSpecies: string[]
}

export function WoodInventoryDashboard() {
  const [jobs, setJobs] = useState<MachiningJob[]>([])
  const [inventory, setInventory] = useState<InventorySummary[]>([])
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    todaysJobs: 0,
    completedJobs: 0,
    inProgressJobs: 0,
    totalMaterialsPulled: 0,
    totalBlocksProduced: 0,
    lowStockSpecies: []
  })
  const [loading, setLoading] = useState(true)
  const [selectedJob, setSelectedJob] = useState<MachiningJob | null>(null)
  const [isJobModalOpen, setIsJobModalOpen] = useState(false)
  const [isPullingModalOpen, setIsPullingModalOpen] = useState(false)
  const [isCompletionModalOpen, setIsCompletionModalOpen] = useState(false)
  const [activeView, setActiveView] = useState<'jobs' | 'inventory' | 'reports'>('jobs')
  const { toast } = useToast()
  const supabase = createClient()

  useEffect(() => {
    loadData()

    // Set up real-time subscription
    const subscription = supabase
      .channel('wood_inventory_updates')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'machining_jobs'
      }, () => {
        loadData()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(subscription)
    }
  }, [])

  async function loadData() {
    try {
      // Load today's jobs
      const { data: jobsData, error: jobsError } = await supabase
        .from('todays_jobs')
        .select('*')

      if (jobsError) throw jobsError

      // Load inventory summary
      const { data: inventoryData, error: inventoryError } = await supabase
        .from('inventory_summary')
        .select('*')

      if (inventoryError) throw inventoryError

      // Calculate metrics
      const todaysJobs = jobsData?.length || 0
      const completedJobs = jobsData?.filter(j => j.status === 'completed').length || 0
      const inProgressJobs = jobsData?.filter(j => j.status === 'in_progress').length || 0
      const totalMaterialsPulled = jobsData?.reduce((sum, j) => sum + (j.materials_pulled || 0), 0) || 0
      const totalBlocksProduced = jobsData?.reduce((sum, j) => sum + (j.total_produced || 0), 0) || 0

      // Find low stock species (less than 5 items)
      const lowStockSpecies = inventoryData
        ?.filter(inv => inv.material_type === 'raw' && inv.item_count < 5)
        .map(inv => inv.species) || []

      setJobs(jobsData || [])
      setInventory(inventoryData || [])
      setMetrics({
        todaysJobs,
        completedJobs,
        inProgressJobs,
        totalMaterialsPulled,
        totalBlocksProduced,
        lowStockSpecies
      })

      logBusiness('Wood inventory dashboard loaded', 'WOOD_INVENTORY', {
        todaysJobs,
        inventoryItems: inventoryData?.length
      })
    } catch (error) {
      logError(error as Error, 'WOOD_INVENTORY', { action: 'load_data' })
      toast({
        title: 'Error',
        description: 'Failed to load inventory data',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  async function startJob(job: MachiningJob) {
    try {
      const { error } = await supabase
        .from('machining_jobs')
        .update({
          status: 'in_progress',
          started_at: new Date().toISOString(),
          assigned_to: (await supabase.auth.getUser()).data.user?.id
        })
        .eq('id', job.id)

      if (error) throw error

      logBusiness('Job started', 'WOOD_INVENTORY', { 
        jobId: job.id,
        jobNumber: job.job_number 
      })

      toast({
        title: 'Job started',
        description: `Job #${job.job_number} is now in progress`,
      })

      setSelectedJob({ ...job, status: 'in_progress' })
      setIsPullingModalOpen(true)
      loadData()
    } catch (error) {
      logError(error as Error, 'WOOD_INVENTORY', { action: 'start_job' })
      toast({
        title: 'Error',
        description: 'Failed to start job',
        variant: 'destructive',
      })
    }
  }

  function getStatusColor(status: string) {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-50'
      case 'in_progress':
        return 'text-blue-600 bg-blue-50'
      case 'not_started':
        return 'text-gray-600 bg-gray-50'
      default:
        return 'text-gray-600 bg-gray-50'
    }
  }

  function getStatusIcon(status: string) {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4" />
      case 'in_progress':
        return <Clock className="h-4 w-4" />
      case 'not_started':
        return <AlertTriangle className="h-4 w-4" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading inventory data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Today's Jobs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.todaysJobs}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Scheduled for {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{metrics.inProgressJobs}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Currently being machined
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{metrics.completedJobs}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {((metrics.completedJobs / metrics.todaysJobs) * 100).toFixed(0)}% completion rate
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Materials Pulled</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalMaterialsPulled}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Raw materials used
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Blocks Produced</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalBlocksProduced}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Finished blocks today
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Low Stock Alert */}
      {metrics.lowStockSpecies.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              Low Stock Alert
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">
              The following species are running low: {metrics.lowStockSpecies.join(', ')}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Main Content Tabs */}
      <Tabs value={activeView} onValueChange={(v: any) => setActiveView(v)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="jobs">Today's Jobs</TabsTrigger>
          <TabsTrigger value="inventory">Current Inventory</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="jobs" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Today's Schedule - {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</CardTitle>
                  <CardDescription>
                    Click on a job to start work and pull materials
                  </CardDescription>
                </div>
                <Button size="sm" variant="outline">
                  <ScanLine className="h-4 w-4 mr-2" />
                  Scan Job
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {jobs.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Package className="h-12 w-12 mx-auto mb-4 opacity-30" />
                    <p>No jobs scheduled for today</p>
                  </div>
                ) : (
                  jobs.map(job => (
                    <div 
                      key={job.id}
                      className={`border rounded-lg p-4 transition-all hover:shadow-md ${
                        job.status === 'completed' ? 'opacity-60' : 'cursor-pointer'
                      }`}
                      onClick={() => {
                        if (job.status !== 'completed') {
                          setSelectedJob(job)
                          if (job.status === 'not_started') {
                            setIsJobModalOpen(true)
                          } else {
                            setIsCompletionModalOpen(true)
                          }
                        }
                      }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold">Job #{job.job_number}</h3>
                            <Badge className={getStatusColor(job.status)}>
                              <span className="flex items-center gap-1">
                                {getStatusIcon(job.status)}
                                {job.status.replace('_', ' ')}
                              </span>
                            </Badge>
                            {job.priority <= 3 && (
                              <Badge variant="destructive">High Priority</Badge>
                            )}
                          </div>
                          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                            <div>
                              <p className="text-muted-foreground">Species</p>
                              <p className="font-medium flex items-center gap-1">
                                <TreePine className="h-4 w-4" />
                                {job.species_required}
                              </p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Thickness</p>
                              <p className="font-medium">{job.thickness_required}"</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Quantity</p>
                              <p className="font-medium flex items-center gap-1">
                                <Layers className="h-4 w-4" />
                                {job.quantity_required} blocks
                              </p>
                            </div>
                            {job.model && (
                              <div>
                                <p className="text-muted-foreground">Model</p>
                                <p className="font-medium">{job.model}</p>
                              </div>
                            )}
                          </div>
                          {job.status === 'in_progress' && (
                            <div className="mt-3 pt-3 border-t grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <p className="text-muted-foreground">Materials Pulled</p>
                                <p className="font-medium">{job.materials_pulled} pieces</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Blocks Produced</p>
                                <p className="font-medium">{job.total_produced || 0} / {job.quantity_required}</p>
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="ml-4">
                          {job.status === 'not_started' ? (
                            <Button 
                              onClick={(e) => {
                                e.stopPropagation()
                                startJob(job)
                              }}
                            >
                              <Play className="h-4 w-4 mr-2" />
                              Start Job
                            </Button>
                          ) : job.status === 'in_progress' ? (
                            <Button variant="outline">
                              <ArrowRight className="h-4 w-4 mr-2" />
                              Continue
                            </Button>
                          ) : (
                            <CheckCircle className="h-8 w-8 text-green-600" />
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inventory" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Raw Materials</CardTitle>
                <CardDescription>Available wood stock by species</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {inventory
                    .filter(inv => inv.material_type === 'raw')
                    .map(inv => (
                      <div key={`raw-${inv.species}`} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{inv.species}</p>
                          <p className="text-sm text-muted-foreground">
                            {inv.total_board_feet?.toFixed(1) || 0} board feet
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold">{inv.item_count}</p>
                          <p className="text-xs text-muted-foreground">pieces</p>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Finished Blocks</CardTitle>
                <CardDescription>Ready for assembly by species</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {inventory
                    .filter(inv => inv.material_type === 'finished')
                    .map(inv => (
                      <div key={`finished-${inv.species}`} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{inv.species}</p>
                          <p className="text-sm text-muted-foreground">
                            4.6" x 4.6" blocks
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold">{inv.item_count}</p>
                          <p className="text-xs text-muted-foreground">blocks</p>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Production Reports</CardTitle>
              <CardDescription>View and generate inventory reports</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button variant="outline" className="justify-start">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Daily Production Report
                </Button>
                <Button variant="outline" className="justify-start">
                  <Package className="h-4 w-4 mr-2" />
                  Material Usage Report
                </Button>
                <Button variant="outline" className="justify-start">
                  <TreePine className="h-4 w-4 mr-2" />
                  Yield Analysis Report
                </Button>
                <Button variant="outline" className="justify-start">
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Reorder Recommendations
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modals */}
      {selectedJob && (
        <>
          <JobSelectionModal
            job={selectedJob}
            isOpen={isJobModalOpen}
            onClose={() => setIsJobModalOpen(false)}
            onStartJob={() => {
              setIsJobModalOpen(false)
              startJob(selectedJob)
            }}
          />

          <MaterialPullingModal
            job={selectedJob}
            isOpen={isPullingModalOpen}
            onClose={() => setIsPullingModalOpen(false)}
            onComplete={() => {
              setIsPullingModalOpen(false)
              setIsCompletionModalOpen(true)
              loadData()
            }}
          />

          <ProductionCompletionModal
            job={selectedJob}
            isOpen={isCompletionModalOpen}
            onClose={() => {
              setIsCompletionModalOpen(false)
              setSelectedJob(null)
            }}
            onComplete={() => {
              setIsCompletionModalOpen(false)
              setSelectedJob(null)
              loadData()
            }}
          />
        </>
      )}
    </div>
  )
}