"use client"

import { useState, useMemo, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, LineChart, Line } from "recharts"
import { useRepairContext } from "@/contexts/repair-context"
import { RepairProvider } from "@/contexts/repair-context"
import { ArrowLeft, Search, Download } from "lucide-react"
import { PieChart, Pie, Cell, Legend } from "recharts"
import { TrendingUp, TrendingDown, AlertTriangle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"

function AnalyticsPageContent() {
  const { repairs } = useRepairContext()
  const [searchTerm, setSearchTerm] = useState("")
  const [timePeriod, setTimePeriod] = useState("6months")
  const [selectedTechnician, setSelectedTechnician] = useState("all")
  const [showRepairAlert, setShowRepairAlert] = useState(false)
  const [weeklyRepairAlerts, setWeeklyRepairAlerts] = useState([])

  // Check for weekly repair patterns on component mount
  useEffect(() => {
    const checkWeeklyPatterns = () => {
      const now = new Date()
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

      // Get repairs from the last week
      const recentRepairs = repairs.filter((repair) => {
        const repairDate = new Date(repair.receivedDate)
        return repairDate >= oneWeekAgo && repairDate <= now
      })

      // Group by repair type and model combination
      const repairPatterns = {}

      recentRepairs.forEach((repair) => {
        const key = `${repair.repairType}-${repair.model}`
        if (!repairPatterns[key]) {
          repairPatterns[key] = {
            repairType: repair.repairType,
            model: repair.model,
            count: 0,
            repairs: [],
          }
        }
        repairPatterns[key].count++
        repairPatterns[key].repairs.push(repair)
      })

      // Find patterns with 2 or more occurrences
      const alerts = Object.values(repairPatterns).filter((pattern) => pattern.count >= 2)

      if (alerts.length > 0) {
        setWeeklyRepairAlerts(alerts)
        setShowRepairAlert(true)
      }
    }

    checkWeeklyPatterns()
  }, [repairs])

  // Generate monthly repair data
  const monthlyData = useMemo(() => {
    const months = []
    const now = new Date()
    const monthsToShow = timePeriod === "year" ? 12 : timePeriod === "6months" ? 6 : 3

    for (let i = monthsToShow - 1; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthName = date.toLocaleDateString("en-US", { month: "short", year: "numeric" })

      const monthRepairs = repairs.filter((repair) => {
        const repairDate = new Date(repair.completedDate || repair.receivedDate)
        return (
          repairDate.getMonth() === date.getMonth() &&
          repairDate.getFullYear() === date.getFullYear() &&
          repair.status === "completed"
        )
      })

      months.push({
        month: monthName,
        repairs: monthRepairs.length,
        avgTime:
          monthRepairs.length > 0
            ? Math.round(monthRepairs.reduce((sum, r) => sum + r.timeSpent, 0) / monthRepairs.length)
            : 0,
      })
    }
    return months
  }, [repairs, timePeriod])

  // Technician performance data
  const technicianData = useMemo(() => {
    const techStats = {}

    repairs.forEach((repair) => {
      if (repair.assignedTo && repair.status === "completed") {
        if (!techStats[repair.assignedTo]) {
          techStats[repair.assignedTo] = {
            name: repair.assignedTo,
            totalRepairs: 0,
            totalTime: 0,
            avgTime: 0,
            productionRepairs: 0,
            finishingRepairs: 0,
            sonicRepairs: 0,
          }
        }

        techStats[repair.assignedTo].totalRepairs++
        techStats[repair.assignedTo].totalTime += repair.timeSpent

        if (repair.repairType === "production") techStats[repair.assignedTo].productionRepairs++
        else if (repair.repairType === "finishing") techStats[repair.assignedTo].finishingRepairs++
        else if (repair.repairType === "sonic") techStats[repair.assignedTo].sonicRepairs++
      }
    })

    return Object.values(techStats).map((tech) => ({
      ...tech,
      avgTime: Math.round(tech.totalTime / tech.totalRepairs),
    }))
  }, [repairs])

  // Searchable repair history
  const filteredRepairHistory = useMemo(() => {
    return repairs
      .filter((repair) => {
        const matchesSearch =
          searchTerm === "" ||
          repair.repairNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
          repair.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          repair.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
          repair.serialNumber?.toLowerCase().includes(searchTerm.toLowerCase())

        const matchesTechnician = selectedTechnician === "all" || repair.assignedTo === selectedTechnician

        return matchesSearch && matchesTechnician
      })
      .sort((a, b) => new Date(b.receivedDate).getTime() - new Date(a.receivedDate).getTime())
  }, [repairs, searchTerm, selectedTechnician])

  // Get repeat customers
  const repeatCustomers = useMemo(() => {
    const serialCounts = {}
    repairs.forEach((repair) => {
      if (repair.serialNumber) {
        serialCounts[repair.serialNumber] = (serialCounts[repair.serialNumber] || 0) + 1
      }
    })

    return Object.entries(serialCounts)
      .filter(([_, count]) => count > 1)
      .map(([serial, count]) => ({ serial, count }))
      .sort((a, b) => b.count - a.count)
  }, [repairs])

  // Model breakdown data
  const modelBreakdownData = useMemo(() => {
    const modelStats = {}

    repairs.forEach((repair) => {
      if (!modelStats[repair.model]) {
        modelStats[repair.model] = {
          model: repair.model,
          production: 0,
          finishing: 0,
          sonic: 0,
          total: 0,
        }
      }

      modelStats[repair.model][repair.repairType]++
      modelStats[repair.model].total++
    })

    return Object.values(modelStats).sort((a, b) => b.total - a.total)
  }, [repairs])

  // Repair trend analysis
  const repairTrendData = useMemo(() => {
    const periods = {
      "3months": 3,
      "6months": 6,
      "12months": 12,
      "24months": 24,
    }

    const monthsToAnalyze = periods[timePeriod] || 6
    const now = new Date()

    // Get data for current period
    const currentPeriodStart = new Date(now.getFullYear(), now.getMonth() - monthsToAnalyze, 1)
    const currentPeriodRepairs = repairs.filter((repair) => new Date(repair.receivedDate) >= currentPeriodStart)

    // Get data for previous period (same length)
    const previousPeriodStart = new Date(now.getFullYear(), now.getMonth() - monthsToAnalyze * 2, 1)
    const previousPeriodEnd = new Date(now.getFullYear(), now.getMonth() - monthsToAnalyze, 1)
    const previousPeriodRepairs = repairs.filter((repair) => {
      const repairDate = new Date(repair.receivedDate)
      return repairDate >= previousPeriodStart && repairDate < previousPeriodEnd
    })

    // Calculate trends by repair type
    const repairTypes = ["production", "finishing", "sonic"]
    const trends = repairTypes.map((type) => {
      const currentCount = currentPeriodRepairs.filter((r) => r.repairType === type).length
      const previousCount = previousPeriodRepairs.filter((r) => r.repairType === type).length

      const percentChange =
        previousCount === 0 ? (currentCount > 0 ? 100 : 0) : ((currentCount - previousCount) / previousCount) * 100

      return {
        type,
        current: currentCount,
        previous: previousCount,
        change: percentChange,
        trend: percentChange > 10 ? "up" : percentChange < -10 ? "down" : "stable",
      }
    })

    return trends
  }, [repairs, timePeriod])

  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"]

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800"
      case "in_progress":
        return "bg-blue-100 text-blue-800"
      case "diagnosed":
        return "bg-yellow-100 text-yellow-800"
      case "shipped":
        return "bg-green-100 text-green-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Weekly Repair Pattern Alert Dialog */}
      <Dialog open={showRepairAlert} onOpenChange={setShowRepairAlert}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center text-red-600">
              <AlertTriangle className="mr-2 h-5 w-5" />
              Weekly Repair Pattern Alert
            </DialogTitle>
            <DialogDescription>
              Multiple repairs of the same type have been detected in the past week. This may indicate a systemic issue
              that requires investigation.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {weeklyRepairAlerts.map((alert, index) => (
              <div key={index} className="border border-red-200 rounded-lg p-4 bg-red-50">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-red-800">
                    {alert.count} {alert.repairType} repairs on {alert.model}
                  </h4>
                  <Badge variant="destructive">{alert.count} occurrences</Badge>
                </div>
                <div className="text-sm text-red-700 mb-3">
                  This pattern suggests there may be a quality issue or manufacturing defect that needs attention.
                </div>
                <div className="space-y-2">
                  <div className="font-medium text-sm text-red-800">Affected Repairs:</div>
                  {alert.repairs.map((repair) => (
                    <div key={repair.id} className="text-xs bg-white p-2 rounded border">
                      <div className="flex justify-between">
                        <span>
                          {repair.repairNumber} - {repair.customerName}
                        </span>
                        <span>{new Date(repair.receivedDate).toLocaleDateString()}</span>
                      </div>
                      {repair.customerNote && (
                        <div className="text-gray-600 mt-1 truncate">
                          Note: {repair.customerNote.substring(0, 100)}...
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setShowRepairAlert(false)}>
              Acknowledge
            </Button>
            <Button onClick={() => setShowRepairAlert(false)}>Investigate</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" onClick={() => (window.location.href = "/")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
          <h1 className="text-3xl font-bold">Repair Analytics</h1>
        </div>
        <Button variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Export Data
        </Button>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="technicians">Technicians</TabsTrigger>
          <TabsTrigger value="history">Repair History</TabsTrigger>
          <TabsTrigger value="repeats">Repeat Customers</TabsTrigger>
          <TabsTrigger value="trends">Trends & Models</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Time Period Selector */}
          <div className="flex items-center space-x-4">
            <Select value={timePeriod} onValueChange={setTimePeriod}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3months">Last 3 Months</SelectItem>
                <SelectItem value="6months">Last 6 Months</SelectItem>
                <SelectItem value="12months">Last 12 Months</SelectItem>
                <SelectItem value="24months">Last 24 Months</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Monthly Repairs Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Repairs Completed by Month</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={{
                  repairs: {
                    label: "Repairs",
                    color: "hsl(var(--chart-1))",
                  },
                }}
                className="h-[300px]"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="repairs" fill="var(--color-repairs)" />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* Average Time Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Average Repair Time by Month (Minutes)</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={{
                  avgTime: {
                    label: "Avg Time",
                    color: "hsl(var(--chart-2))",
                  },
                }}
                className="h-[300px]"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line type="monotone" dataKey="avgTime" stroke="var(--color-avgTime)" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="technicians" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Technician Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {technicianData.map((tech) => (
                  <div key={tech.name} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-lg">{tech.name}</h3>
                      <Badge variant="outline">{tech.totalRepairs} repairs</Badge>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <div className="text-muted-foreground">Avg Time</div>
                        <div className="font-medium">
                          {Math.floor(tech.avgTime / 60)}h {tech.avgTime % 60}m
                        </div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Production</div>
                        <div className="font-medium">{tech.productionRepairs}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Finishing</div>
                        <div className="font-medium">{tech.finishingRepairs}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Sonic</div>
                        <div className="font-medium">{tech.sonicRepairs}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          {/* Search and Filters */}
          <div className="flex space-x-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search by repair number, customer, model, or serial number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedTechnician} onValueChange={setSelectedTechnician}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All Technicians" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Technicians</SelectItem>
                <SelectItem value="Jake M.">Jake M.</SelectItem>
                <SelectItem value="Tony S.">Tony S.</SelectItem>
                <SelectItem value="Keith B.">Keith B.</SelectItem>
                <SelectItem value="Sarah L.">Sarah L.</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Repair History Table */}
          <Card>
            <CardHeader>
              <CardTitle>Repair History ({filteredRepairHistory.length} repairs)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {filteredRepairHistory.map((repair) => (
                  <div key={repair.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="font-semibold">{repair.repairNumber}</div>
                        <div className="text-sm text-muted-foreground">
                          {repair.customerName} | {repair.model} | Serial: {repair.serialNumber}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Received: {new Date(repair.receivedDate).toLocaleDateString()} | Time:{" "}
                          {Math.floor(repair.timeSpent / 60)}h {repair.timeSpent % 60}m
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge className={getStatusColor(repair.status)}>{repair.status.replace("_", " ")}</Badge>
                        {repair.assignedTo && <Badge variant="secondary">{repair.assignedTo}</Badge>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="repeats" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Repeat Customers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {repeatCustomers.map(({ serial, count }) => {
                  const relatedRepairs = repairs.filter((r) => r.serialNumber === serial)
                  return (
                    <div key={serial} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <div className="font-semibold">Serial: {serial}</div>
                          <div className="text-sm text-muted-foreground">
                            {relatedRepairs[0]?.model} | {relatedRepairs[0]?.customerName}
                          </div>
                        </div>
                        <Badge variant="destructive">{count} visits</Badge>
                      </div>
                      <div className="text-sm space-y-1">
                        {relatedRepairs.map((repair) => (
                          <div key={repair.id} className="flex justify-between">
                            <span>
                              {repair.repairNumber} - {new Date(repair.receivedDate).toLocaleDateString()}
                            </span>
                            <Badge className={getStatusColor(repair.status)} variant="outline">
                              {repair.status}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-6">
          {/* Repair Trend Alerts */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Repair Trend Analysis</h3>
            {repairTrendData.map((trend) => (
              <Alert
                key={trend.type}
                className={
                  trend.trend === "up"
                    ? "border-red-200 bg-red-50"
                    : trend.trend === "down"
                      ? "border-green-200 bg-green-50"
                      : "border-blue-200 bg-blue-50"
                }
              >
                <div className="flex items-center">
                  {trend.trend === "up" && <TrendingUp className="h-4 w-4 text-red-600" />}
                  {trend.trend === "down" && <TrendingDown className="h-4 w-4 text-green-600" />}
                  {trend.trend === "stable" && <AlertTriangle className="h-4 w-4 text-blue-600" />}
                  <AlertTitle className="ml-2 capitalize">
                    {trend.type} Repairs{" "}
                    {trend.trend === "up" ? "Trending Up" : trend.trend === "down" ? "Trending Down" : "Stable"}
                  </AlertTitle>
                </div>
                <AlertDescription className="mt-2">
                  {trend.change > 0 ? "+" : ""}
                  {trend.change.toFixed(1)}% change from previous {timePeriod.replace("months", " months")}
                  <br />
                  Current period: {trend.current} repairs | Previous period: {trend.previous} repairs
                </AlertDescription>
              </Alert>
            ))}
          </div>

          {/* Model Breakdown Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Repair Types by Model</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {modelBreakdownData.map((model, index) => (
                  <div key={model.model} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">{model.model}</h4>
                      <Badge variant="outline">{model.total} total repairs</Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div className="flex items-center justify-between p-2 bg-blue-50 rounded">
                        <span>Production</span>
                        <span className="font-medium">{model.production}</span>
                      </div>
                      <div className="flex items-center justify-between p-2 bg-green-50 rounded">
                        <span>Finishing</span>
                        <span className="font-medium">{model.finishing}</span>
                      </div>
                      <div className="flex items-center justify-between p-2 bg-yellow-50 rounded">
                        <span>Sonic</span>
                        <span className="font-medium">{model.sonic}</span>
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="flex h-2 rounded-full overflow-hidden">
                        <div className="bg-blue-500" style={{ width: `${(model.production / model.total) * 100}%` }} />
                        <div className="bg-green-500" style={{ width: `${(model.finishing / model.total) * 100}%` }} />
                        <div className="bg-yellow-500" style={{ width: `${(model.sonic / model.total) * 100}%` }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Pie Chart for Overall Repair Type Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Overall Repair Type Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={{
                  production: { label: "Production", color: "#0088FE" },
                  finishing: { label: "Finishing", color: "#00C49F" },
                  sonic: { label: "Sonic", color: "#FFBB28" },
                }}
                className="h-[400px]"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: "Production", value: repairs.filter((r) => r.repairType === "production").length },
                        { name: "Finishing", value: repairs.filter((r) => r.repairType === "finishing").length },
                        { name: "Sonic", value: repairs.filter((r) => r.repairType === "sonic").length },
                      ]}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={120}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {[0, 1, 2].map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default function AnalyticsPage() {
  return (
    <RepairProvider>
      <AnalyticsPageContent />
    </RepairProvider>
  )
}
