'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { 
  DollarSign,
  TrendingUp,
  TrendingDown,
  Package,
  Wrench,
  Users,
  BarChart3,
  Calendar,
  Download,
  AlertTriangle,
  CheckCircle,
  Clock,
  Activity,
  Target,
  Zap,
  Calculator,
  FileText,
  PieChart,
  LineChart
} from 'lucide-react'
import { logBusiness, logError } from '@/lib/logger-client'

interface CostMetrics {
  totalRevenue: number
  totalCosts: number
  profit: number
  profitMargin: number
  materialCosts: number
  laborCosts: number
  overheadCosts: number
  averageJobCost: number
  costPerUnit: number
  materialWastePercentage: number
}

interface JobCost {
  id: string
  production_request_id: string
  customer_name: string
  part_name: string
  quantity: number
  material_cost: number
  labor_cost: number
  overhead_cost: number
  total_cost: number
  revenue: number
  profit: number
  profit_margin: number
  completion_date: string
  efficiency_score: number
}

interface MaterialCostTrend {
  date: string
  wood_cost: number
  hardware_cost: number
  consumables_cost: number
  total_cost: number
}

interface LaborProductivity {
  worker_name: string
  total_hours: number
  units_produced: number
  units_per_hour: number
  labor_cost: number
  revenue_generated: number
  efficiency_score: number
}

interface CostAnalysis {
  category: string
  budgeted: number
  actual: number
  variance: number
  variance_percentage: number
}

export function CostTrackingAnalytics() {
  const [metrics, setMetrics] = useState<CostMetrics>({
    totalRevenue: 0,
    totalCosts: 0,
    profit: 0,
    profitMargin: 0,
    materialCosts: 0,
    laborCosts: 0,
    overheadCosts: 0,
    averageJobCost: 0,
    costPerUnit: 0,
    materialWastePercentage: 0
  })
  const [jobCosts, setJobCosts] = useState<JobCost[]>([])
  const [materialTrends, setMaterialTrends] = useState<MaterialCostTrend[]>([])
  const [laborProductivity, setLaborProductivity] = useState<LaborProductivity[]>([])
  const [costAnalysis, setCostAnalysis] = useState<CostAnalysis[]>([])
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    end: new Date()
  })
  const [selectedView, setSelectedView] = useState<'overview' | 'jobs' | 'materials' | 'labor' | 'analysis'>('overview')
  const [isCostInputDialogOpen, setIsCostInputDialogOpen] = useState(false)
  const [selectedJob, setSelectedJob] = useState<any>(null)
  const { toast } = useToast()
  const supabase = createClient()

  useEffect(() => {
    loadData()
  }, [dateRange])

  async function loadData() {
    try {
      // Load production data
      const { data: productionData, error: productionError } = await supabase
        .from('daily_production')
        .select(`
          *,
          production_request:production_requests(
            customer_name,
            quantity_ordered,
            unit_price,
            part:parts_catalog(
              part_name,
              material_cost,
              estimated_labor_hours
            )
          ),
          machine:machines(machine_name, hourly_rate),
          completed_by:workers(name, hourly_rate)
        `)
        .gte('manufacturing_date', dateRange.start.toISOString().split('T')[0])
        .lte('manufacturing_date', dateRange.end.toISOString().split('T')[0])

      if (productionError) throw productionError

      // Load material usage
      const { data: materialData, error: materialError } = await supabase
        .from('wood_inventory')
        .select('*')
        .order('last_updated', { ascending: false })

      if (materialError) throw materialError

      // Load worker time data
      const { data: timeData, error: timeError } = await supabase
        .from('time_entries')
        .select(`
          *,
          worker:workers(name, hourly_rate)
        `)
        .gte('start_time', dateRange.start.toISOString())
        .lte('start_time', dateRange.end.toISOString())

      if (timeError) throw timeError

      // Calculate metrics
      const calculatedMetrics = calculateMetrics(productionData || [], materialData || [], timeData || [])
      const calculatedJobCosts = calculateJobCosts(productionData || [])
      const calculatedMaterialTrends = calculateMaterialTrends(productionData || [], materialData || [])
      const calculatedLaborProductivity = calculateLaborProductivity(productionData || [], timeData || [])
      const calculatedCostAnalysis = calculateCostAnalysis(calculatedMetrics)

      setMetrics(calculatedMetrics)
      setJobCosts(calculatedJobCosts)
      setMaterialTrends(calculatedMaterialTrends)
      setLaborProductivity(calculatedLaborProductivity)
      setCostAnalysis(calculatedCostAnalysis)

      logBusiness('Cost tracking data loaded', 'COST_TRACKING', {
        totalJobs: calculatedJobCosts.length,
        profitMargin: calculatedMetrics.profitMargin
      })
    } catch (error) {
      logError(error as Error, 'COST_TRACKING', { action: 'load_data' })
      toast({
        title: 'Error',
        description: 'Failed to load cost tracking data',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  function calculateMetrics(production: any[], materials: any[], timeEntries: any[]): CostMetrics {
    let totalRevenue = 0
    let materialCosts = 0
    let laborCosts = 0
    let overheadCosts = 0
    let totalUnits = 0

    // Calculate revenue and costs from production
    production.forEach(job => {
      const quantity = job.quantity_produced || 0
      const unitPrice = job.production_request?.unit_price || 50 // Default price
      const revenue = quantity * unitPrice
      
      totalRevenue += revenue
      totalUnits += quantity

      // Material costs
      const materialCostPerUnit = job.production_request?.part?.material_cost || 10
      materialCosts += quantity * materialCostPerUnit

      // Labor costs
      const laborHours = (job.setup_time_minutes + job.run_time_minutes) / 60
      const workerRate = job.completed_by?.hourly_rate || 25
      laborCosts += laborHours * workerRate

      // Machine overhead
      const machineRate = job.machine?.hourly_rate || 50
      overheadCosts += laborHours * machineRate * 0.3 // 30% of machine rate as overhead
    })

    // Add additional labor costs from time entries
    timeEntries.forEach(entry => {
      if (entry.end_time) {
        const hours = (new Date(entry.end_time).getTime() - new Date(entry.start_time).getTime()) / (1000 * 60 * 60)
        const rate = entry.worker?.hourly_rate || 25
        laborCosts += hours * rate
      }
    })

    // Calculate material waste
    const totalMaterialValue = materials.reduce((sum, m) => sum + (m.quantity_in_stock * m.unit_cost), 0)
    const materialWastePercentage = totalMaterialValue > 0 ? (materialCosts / totalMaterialValue) * 100 : 0

    const totalCosts = materialCosts + laborCosts + overheadCosts
    const profit = totalRevenue - totalCosts
    const profitMargin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0
    const averageJobCost = production.length > 0 ? totalCosts / production.length : 0
    const costPerUnit = totalUnits > 0 ? totalCosts / totalUnits : 0

    return {
      totalRevenue,
      totalCosts,
      profit,
      profitMargin,
      materialCosts,
      laborCosts,
      overheadCosts,
      averageJobCost,
      costPerUnit,
      materialWastePercentage
    }
  }

  function calculateJobCosts(production: any[]): JobCost[] {
    return production.map(job => {
      const quantity = job.quantity_produced || 0
      const unitPrice = job.production_request?.unit_price || 50
      const revenue = quantity * unitPrice

      // Calculate costs
      const materialCostPerUnit = job.production_request?.part?.material_cost || 10
      const material_cost = quantity * materialCostPerUnit

      const laborHours = (job.setup_time_minutes + job.run_time_minutes) / 60
      const workerRate = job.completed_by?.hourly_rate || 25
      const labor_cost = laborHours * workerRate

      const machineRate = job.machine?.hourly_rate || 50
      const overhead_cost = laborHours * machineRate * 0.3

      const total_cost = material_cost + labor_cost + overhead_cost
      const profit = revenue - total_cost
      const profit_margin = revenue > 0 ? (profit / revenue) * 100 : 0

      // Calculate efficiency score
      const estimatedHours = job.production_request?.part?.estimated_labor_hours || laborHours
      const efficiency_score = estimatedHours > 0 ? (estimatedHours / laborHours) * 100 : 100

      return {
        id: job.id,
        production_request_id: job.production_request_id,
        customer_name: job.production_request?.customer_name || 'Unknown',
        part_name: job.production_request?.part?.part_name || 'Unknown',
        quantity,
        material_cost,
        labor_cost,
        overhead_cost,
        total_cost,
        revenue,
        profit,
        profit_margin,
        completion_date: job.manufacturing_date,
        efficiency_score
      }
    })
  }

  function calculateMaterialTrends(production: any[], inventory: any[]): MaterialCostTrend[] {
    const trends: Map<string, MaterialCostTrend> = new Map()
    
    // Group production by date
    production.forEach(job => {
      const date = job.manufacturing_date
      if (!trends.has(date)) {
        trends.set(date, {
          date,
          wood_cost: 0,
          hardware_cost: 0,
          consumables_cost: 0,
          total_cost: 0
        })
      }

      const trend = trends.get(date)!
      const quantity = job.quantity_produced || 0
      const materialCostPerUnit = job.production_request?.part?.material_cost || 10
      
      // Simplified categorization
      if (job.production_request?.part?.part_name?.toLowerCase().includes('cup')) {
        trend.wood_cost += quantity * materialCostPerUnit * 0.7
        trend.hardware_cost += quantity * materialCostPerUnit * 0.2
        trend.consumables_cost += quantity * materialCostPerUnit * 0.1
      } else {
        trend.wood_cost += quantity * materialCostPerUnit * 0.5
        trend.hardware_cost += quantity * materialCostPerUnit * 0.3
        trend.consumables_cost += quantity * materialCostPerUnit * 0.2
      }

      trend.total_cost = trend.wood_cost + trend.hardware_cost + trend.consumables_cost
    })

    return Array.from(trends.values()).sort((a, b) => a.date.localeCompare(b.date))
  }

  function calculateLaborProductivity(production: any[], timeEntries: any[]): LaborProductivity[] {
    const workerStats: Map<string, LaborProductivity> = new Map()

    // Aggregate production by worker
    production.forEach(job => {
      const workerName = job.completed_by?.name || 'Unknown'
      
      if (!workerStats.has(workerName)) {
        workerStats.set(workerName, {
          worker_name: workerName,
          total_hours: 0,
          units_produced: 0,
          units_per_hour: 0,
          labor_cost: 0,
          revenue_generated: 0,
          efficiency_score: 0
        })
      }

      const stats = workerStats.get(workerName)!
      const hours = (job.setup_time_minutes + job.run_time_minutes) / 60
      const units = job.quantity_produced || 0
      const rate = job.completed_by?.hourly_rate || 25
      const unitPrice = job.production_request?.unit_price || 50

      stats.total_hours += hours
      stats.units_produced += units
      stats.labor_cost += hours * rate
      stats.revenue_generated += units * unitPrice
    })

    // Calculate productivity metrics
    return Array.from(workerStats.values()).map(stats => {
      stats.units_per_hour = stats.total_hours > 0 ? stats.units_produced / stats.total_hours : 0
      stats.efficiency_score = stats.labor_cost > 0 ? (stats.revenue_generated / stats.labor_cost) * 20 : 0
      return stats
    }).sort((a, b) => b.efficiency_score - a.efficiency_score)
  }

  function calculateCostAnalysis(metrics: CostMetrics): CostAnalysis[] {
    // Mock budget data - in production would come from database
    const budgets = {
      materials: metrics.materialCosts * 0.9, // Assume 10% over budget
      labor: metrics.laborCosts * 1.05, // Assume 5% under budget
      overhead: metrics.overheadCosts * 0.95, // Assume 5% over budget
      total: metrics.totalCosts * 0.98 // Assume 2% over budget
    }

    return [
      {
        category: 'Materials',
        budgeted: budgets.materials,
        actual: metrics.materialCosts,
        variance: metrics.materialCosts - budgets.materials,
        variance_percentage: ((metrics.materialCosts - budgets.materials) / budgets.materials) * 100
      },
      {
        category: 'Labor',
        budgeted: budgets.labor,
        actual: metrics.laborCosts,
        variance: metrics.laborCosts - budgets.labor,
        variance_percentage: ((metrics.laborCosts - budgets.labor) / budgets.labor) * 100
      },
      {
        category: 'Overhead',
        budgeted: budgets.overhead,
        actual: metrics.overheadCosts,
        variance: metrics.overheadCosts - budgets.overhead,
        variance_percentage: ((metrics.overheadCosts - budgets.overhead) / budgets.overhead) * 100
      },
      {
        category: 'Total',
        budgeted: budgets.total,
        actual: metrics.totalCosts,
        variance: metrics.totalCosts - budgets.total,
        variance_percentage: ((metrics.totalCosts - budgets.total) / budgets.total) * 100
      }
    ]
  }

  async function updateJobCost(jobId: string, costs: any) {
    try {
      // In production, would update database
      // For now, update local state
      setJobCosts(prev => prev.map(job => 
        job.id === jobId ? { ...job, ...costs } : job
      ))

      logBusiness('Job cost updated', 'COST_TRACKING', { jobId, costs })
      
      toast({
        title: 'Cost updated',
        description: 'Job cost has been updated successfully',
      })

      setIsCostInputDialogOpen(false)
      loadData()
    } catch (error) {
      logError(error as Error, 'COST_TRACKING', { action: 'update_job_cost' })
      toast({
        title: 'Error',
        description: 'Failed to update job cost',
        variant: 'destructive',
      })
    }
  }

  async function exportCostReport() {
    try {
      // Generate CSV report
      const headers = ['Date', 'Customer', 'Part', 'Quantity', 'Material Cost', 'Labor Cost', 'Overhead', 'Total Cost', 'Revenue', 'Profit', 'Margin %']
      const rows = jobCosts.map(job => [
        job.completion_date,
        job.customer_name,
        job.part_name,
        job.quantity,
        job.material_cost.toFixed(2),
        job.labor_cost.toFixed(2),
        job.overhead_cost.toFixed(2),
        job.total_cost.toFixed(2),
        job.revenue.toFixed(2),
        job.profit.toFixed(2),
        job.profit_margin.toFixed(1)
      ])

      const csv = [headers, ...rows].map(row => row.join(',')).join('\n')
      const blob = new Blob([csv], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `cost-report-${new Date().toISOString().split('T')[0]}.csv`
      a.click()

      logBusiness('Cost report exported', 'COST_TRACKING', { 
        rowCount: rows.length,
        dateRange: { start: dateRange.start, end: dateRange.end }
      })

      toast({
        title: 'Report exported',
        description: 'Cost report has been downloaded',
      })
    } catch (error) {
      logError(error as Error, 'COST_TRACKING', { action: 'export_report' })
      toast({
        title: 'Error',
        description: 'Failed to export report',
        variant: 'destructive',
      })
    }
  }

  // Calculate additional insights
  const insights = useMemo(() => {
    const topProfitableJobs = [...jobCosts].sort((a, b) => b.profit_margin - a.profit_margin).slice(0, 5)
    const leastProfitableJobs = [...jobCosts].sort((a, b) => a.profit_margin - b.profit_margin).slice(0, 5)
    const avgEfficiency = laborProductivity.reduce((sum, w) => sum + w.efficiency_score, 0) / laborProductivity.length || 0
    
    return {
      topProfitableJobs,
      leastProfitableJobs,
      avgEfficiency,
      costTrend: metrics.totalCosts > metrics.totalRevenue * 0.7 ? 'high' : 'normal'
    }
  }, [jobCosts, laborProductivity, metrics])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading cost data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ${metrics.totalRevenue.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {dateRange.start.toLocaleDateString()} - {dateRange.end.toLocaleDateString()}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Costs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              ${metrics.totalCosts.toLocaleString()}
            </div>
            <div className="mt-2 space-y-1 text-xs">
              <div className="flex justify-between">
                <span>Materials:</span>
                <span>${metrics.materialCosts.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Labor:</span>
                <span>${metrics.laborCosts.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Overhead:</span>
                <span>${metrics.overheadCosts.toLocaleString()}</span>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${metrics.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              ${metrics.profit.toLocaleString()}
            </div>
            <Progress 
              value={Math.max(0, Math.min(100, metrics.profitMargin))} 
              className="mt-2"
            />
            <p className="text-xs text-muted-foreground mt-1">
              {metrics.profitMargin.toFixed(1)}% margin
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Cost Per Unit</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${metrics.costPerUnit.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Average across all products
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Label>Date Range:</Label>
                <Input
                  type="date"
                  value={dateRange.start.toISOString().split('T')[0]}
                  onChange={(e) => setDateRange(prev => ({ ...prev, start: new Date(e.target.value) }))}
                  className="w-40"
                />
                <span>to</span>
                <Input
                  type="date"
                  value={dateRange.end.toISOString().split('T')[0]}
                  onChange={(e) => setDateRange(prev => ({ ...prev, end: new Date(e.target.value) }))}
                  className="w-40"
                />
              </div>
            </div>
            <Button onClick={exportCostReport}>
              <Download className="h-4 w-4 mr-2" />
              Export Report
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <Tabs value={selectedView} onValueChange={(v: any) => setSelectedView(v)}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="jobs">Job Costs</TabsTrigger>
          <TabsTrigger value="materials">Materials</TabsTrigger>
          <TabsTrigger value="labor">Labor</TabsTrigger>
          <TabsTrigger value="analysis">Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Cost Breakdown</CardTitle>
                <CardDescription>
                  Distribution of costs by category
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium">Materials</span>
                      <span className="text-sm">
                        ${metrics.materialCosts.toLocaleString()} 
                        ({((metrics.materialCosts / metrics.totalCosts) * 100).toFixed(0)}%)
                      </span>
                    </div>
                    <Progress value={(metrics.materialCosts / metrics.totalCosts) * 100} />
                  </div>
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium">Labor</span>
                      <span className="text-sm">
                        ${metrics.laborCosts.toLocaleString()}
                        ({((metrics.laborCosts / metrics.totalCosts) * 100).toFixed(0)}%)
                      </span>
                    </div>
                    <Progress value={(metrics.laborCosts / metrics.totalCosts) * 100} />
                  </div>
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium">Overhead</span>
                      <span className="text-sm">
                        ${metrics.overheadCosts.toLocaleString()}
                        ({((metrics.overheadCosts / metrics.totalCosts) * 100).toFixed(0)}%)
                      </span>
                    </div>
                    <Progress value={(metrics.overheadCosts / metrics.totalCosts) * 100} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Profitability Insights</CardTitle>
                <CardDescription>
                  Key indicators and recommendations
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className={`p-3 rounded-lg ${
                  metrics.profitMargin >= 20 ? 'bg-green-50' : 
                  metrics.profitMargin >= 10 ? 'bg-yellow-50' : 
                  'bg-red-50'
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    {metrics.profitMargin >= 20 ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : metrics.profitMargin >= 10 ? (
                      <AlertTriangle className="h-5 w-5 text-yellow-600" />
                    ) : (
                      <AlertTriangle className="h-5 w-5 text-red-600" />
                    )}
                    <span className="font-medium">Profit Margin Status</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {metrics.profitMargin >= 20 ? 
                      'Excellent profit margin. Operations are highly efficient.' :
                      metrics.profitMargin >= 10 ?
                      'Good profit margin. Consider optimizing material costs.' :
                      'Low profit margin. Review pricing and reduce costs.'
                    }
                  </p>
                </div>

                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Quick Recommendations</h4>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    {insights.costTrend === 'high' && (
                      <li className="flex items-start gap-2">
                        <TrendingUp className="h-4 w-4 text-orange-600 mt-0.5" />
                        <span>Costs are trending high - review overhead expenses</span>
                      </li>
                    )}
                    {metrics.materialWastePercentage > 15 && (
                      <li className="flex items-start gap-2">
                        <Package className="h-4 w-4 text-orange-600 mt-0.5" />
                        <span>Material waste at {metrics.materialWastePercentage.toFixed(0)}% - optimize cutting patterns</span>
                      </li>
                    )}
                    {insights.avgEfficiency < 80 && (
                      <li className="flex items-start gap-2">
                        <Users className="h-4 w-4 text-orange-600 mt-0.5" />
                        <span>Labor efficiency below target - consider training programs</span>
                      </li>
                    )}
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Top & Bottom Performers</CardTitle>
              <CardDescription>
                Most and least profitable jobs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-sm font-medium mb-3 text-green-600">Top Profitable Jobs</h4>
                  <div className="space-y-2">
                    {insights.topProfitableJobs.map((job, index) => (
                      <div key={job.id} className="flex items-center justify-between p-2 bg-green-50 rounded">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">#{index + 1}</span>
                          <div>
                            <p className="text-sm font-medium">{job.part_name}</p>
                            <p className="text-xs text-muted-foreground">{job.customer_name}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-green-600">
                            {job.profit_margin.toFixed(0)}%
                          </p>
                          <p className="text-xs text-muted-foreground">
                            ${job.profit.toFixed(0)} profit
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-medium mb-3 text-red-600">Least Profitable Jobs</h4>
                  <div className="space-y-2">
                    {insights.leastProfitableJobs.map((job, index) => (
                      <div key={job.id} className="flex items-center justify-between p-2 bg-red-50 rounded">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">#{index + 1}</span>
                          <div>
                            <p className="text-sm font-medium">{job.part_name}</p>
                            <p className="text-xs text-muted-foreground">{job.customer_name}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-red-600">
                            {job.profit_margin.toFixed(0)}%
                          </p>
                          <p className="text-xs text-muted-foreground">
                            ${job.profit.toFixed(0)} profit
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="jobs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Job Cost Details</CardTitle>
              <CardDescription>
                Individual job profitability analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {jobCosts.map(job => (
                  <div key={job.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium">{job.part_name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {job.customer_name} - {job.quantity} units
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Completed: {new Date(job.completion_date).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge variant={job.profit_margin >= 20 ? 'default' : job.profit_margin >= 10 ? 'secondary' : 'destructive'}>
                          {job.profit_margin.toFixed(0)}% margin
                        </Badge>
                        <p className={`text-sm font-bold mt-1 ${job.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          ${job.profit.toFixed(2)} profit
                        </p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-5 gap-4 mt-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Material</p>
                        <p className="font-medium">${job.material_cost.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Labor</p>
                        <p className="font-medium">${job.labor_cost.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Overhead</p>
                        <p className="font-medium">${job.overhead_cost.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Total Cost</p>
                        <p className="font-medium">${job.total_cost.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Revenue</p>
                        <p className="font-medium text-green-600">${job.revenue.toFixed(2)}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-4">
                      <div className="flex items-center gap-2">
                        <Activity className="h-4 w-4" />
                        <span className="text-sm">
                          Efficiency: {job.efficiency_score.toFixed(0)}%
                        </span>
                      </div>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => setSelectedJob(job)}
                          >
                            <Calculator className="h-3 w-3 mr-1" />
                            Update Costs
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Update Job Costs</DialogTitle>
                          </DialogHeader>
                          <UpdateCostForm
                            job={job}
                            onSubmit={(costs) => updateJobCost(job.id, costs)}
                            onCancel={() => setSelectedJob(null)}
                          />
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="materials" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Material Cost Trends</CardTitle>
              <CardDescription>
                Daily material usage and costs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Total Material Cost</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-xl font-bold">
                        ${materialTrends.reduce((sum, t) => sum + t.total_cost, 0).toFixed(0)}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Wood Cost</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-xl font-bold text-orange-600">
                        ${materialTrends.reduce((sum, t) => sum + t.wood_cost, 0).toFixed(0)}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Hardware Cost</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-xl font-bold text-blue-600">
                        ${materialTrends.reduce((sum, t) => sum + t.hardware_cost, 0).toFixed(0)}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Daily Breakdown</h4>
                  {materialTrends.map(trend => (
                    <div key={trend.date} className="border rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-sm">
                          {new Date(trend.date).toLocaleDateString()}
                        </span>
                        <span className="font-bold">
                          ${trend.total_cost.toFixed(2)}
                        </span>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Wood</span>
                          <span>${trend.wood_cost.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Hardware</span>
                          <span>${trend.hardware_cost.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Consumables</span>
                          <span>${trend.consumables_cost.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="labor" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Labor Productivity & Costs</CardTitle>
              <CardDescription>
                Worker efficiency and cost analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {laborProductivity.map(worker => (
                  <div key={worker.worker_name} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-medium">{worker.worker_name}</h4>
                        <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {worker.total_hours.toFixed(1)} hours
                          </span>
                          <span className="flex items-center gap-1">
                            <Package className="h-3 w-3" />
                            {worker.units_produced} units
                          </span>
                        </div>
                      </div>
                      <Badge variant={worker.efficiency_score >= 100 ? 'default' : 'secondary'}>
                        {worker.efficiency_score.toFixed(0)}% efficiency
                      </Badge>
                    </div>

                    <div className="grid grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Units/Hour</p>
                        <p className="font-medium">{worker.units_per_hour.toFixed(1)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Labor Cost</p>
                        <p className="font-medium text-red-600">${worker.labor_cost.toFixed(0)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Revenue Generated</p>
                        <p className="font-medium text-green-600">${worker.revenue_generated.toFixed(0)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">ROI</p>
                        <p className="font-medium">
                          {((worker.revenue_generated / worker.labor_cost - 1) * 100).toFixed(0)}%
                        </p>
                      </div>
                    </div>

                    <Progress 
                      value={Math.min(100, worker.efficiency_score)} 
                      className="mt-3"
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analysis" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Budget vs Actual Analysis</CardTitle>
              <CardDescription>
                Cost variance analysis and budget performance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {costAnalysis.map(analysis => (
                  <div key={analysis.category} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">{analysis.category}</h4>
                      <Badge variant={
                        analysis.variance <= 0 ? 'default' : 
                        analysis.variance_percentage <= 5 ? 'secondary' : 
                        'destructive'
                      }>
                        {analysis.variance >= 0 ? '+' : ''}{analysis.variance_percentage.toFixed(1)}%
                      </Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Budgeted</p>
                        <p className="font-medium">${analysis.budgeted.toFixed(0)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Actual</p>
                        <p className="font-medium">${analysis.actual.toFixed(0)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Variance</p>
                        <p className={`font-medium ${analysis.variance <= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {analysis.variance >= 0 ? '+' : ''}${analysis.variance.toFixed(0)}
                        </p>
                      </div>
                    </div>
                    <Progress 
                      value={(analysis.actual / analysis.budgeted) * 100} 
                      className={analysis.variance > 0 ? 'bg-red-100' : ''}
                    />
                  </div>
                ))}
              </div>

              <div className="mt-6 p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-2">Cost Optimization Opportunities</h4>
                <ul className="space-y-2 text-sm">
                  {costAnalysis.filter(a => a.variance > 0).map(analysis => (
                    <li key={analysis.category} className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-orange-600 mt-0.5" />
                      <span>
                        {analysis.category} costs are {analysis.variance_percentage.toFixed(0)}% over budget - 
                        {analysis.category === 'Materials' && ' negotiate better supplier rates'}
                        {analysis.category === 'Labor' && ' improve process efficiency'}
                        {analysis.category === 'Overhead' && ' review fixed cost allocations'}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function UpdateCostForm({ 
  job,
  onSubmit, 
  onCancel 
}: { 
  job: JobCost
  onSubmit: (costs: any) => void
  onCancel: () => void
}) {
  const [materialCost, setMaterialCost] = useState(job.material_cost.toString())
  const [laborCost, setLaborCost] = useState(job.labor_cost.toString())
  const [overheadCost, setOverheadCost] = useState(job.overhead_cost.toString())

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({
      material_cost: parseFloat(materialCost),
      labor_cost: parseFloat(laborCost),
      overhead_cost: parseFloat(overheadCost),
      total_cost: parseFloat(materialCost) + parseFloat(laborCost) + parseFloat(overheadCost),
      profit: job.revenue - (parseFloat(materialCost) + parseFloat(laborCost) + parseFloat(overheadCost)),
      profit_margin: ((job.revenue - (parseFloat(materialCost) + parseFloat(laborCost) + parseFloat(overheadCost))) / job.revenue) * 100
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="material">Material Cost</Label>
        <Input
          id="material"
          type="number"
          step="0.01"
          value={materialCost}
          onChange={(e) => setMaterialCost(e.target.value)}
          required
        />
      </div>

      <div>
        <Label htmlFor="labor">Labor Cost</Label>
        <Input
          id="labor"
          type="number"
          step="0.01"
          value={laborCost}
          onChange={(e) => setLaborCost(e.target.value)}
          required
        />
      </div>

      <div>
        <Label htmlFor="overhead">Overhead Cost</Label>
        <Input
          id="overhead"
          type="number"
          step="0.01"
          value={overheadCost}
          onChange={(e) => setOverheadCost(e.target.value)}
          required
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          Update Costs
        </Button>
      </div>
    </form>
  )
}