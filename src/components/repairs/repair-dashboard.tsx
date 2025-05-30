"use client"

import { useState, useMemo, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import {
  Search,
  Eye,
  UserPlus,
  RefreshCw,
  Clock,
  AlertCircle,
  Plus,
  BarChart3,
  Mail,
  DollarSign,
  CheckCircle,
  MessageSquare,
} from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Link from "next/link"
import { useRouter } from "next/navigation"
import type { RepairOrder } from "@/types/repairs"

interface Worker {
  id: string
  name: string
}

interface RepairDashboardProps {
  initialRepairs: RepairOrder[]
  workers?: Worker[]
  currentWorkerId?: string
}

export default function RepairDashboard({ initialRepairs, workers = [], currentWorkerId }: RepairDashboardProps) {
  const { toast } = useToast()
  const router = useRouter()
  const [repairs, setRepairs] = useState<RepairOrder[]>(initialRepairs)
  const [availableWorkers, setAvailableWorkers] = useState<Worker[]>(workers)
  
  const [selectedRepair, setSelectedRepair] = useState<string | null>(null)
  const [assignDialogOpen, setAssignDialogOpen] = useState(false)
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false)
  const [priorityDialogOpen, setPriorityDialogOpen] = useState(false)
  const [newAssignee, setNewAssignee] = useState("")
  const [newStatus, setNewStatus] = useState("")
  const [newPriority, setNewPriority] = useState<"standard" | "rush">("standard")
  const [repairTypeFilter, setRepairTypeFilter] = useState<"all" | "production" | "finishing" | "sonic">("all")
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [priorityFilter, setPriorityFilter] = useState("all")
  const [repairSourceFilter, setRepairSourceFilter] = useState<"all" | "customer" | "internal">("all")
  const [assignmentFilter, setAssignmentFilter] = useState<"all" | "my_repairs" | "unassigned">("all")
  
  const [customerNoteDialogOpen, setCustomerNoteDialogOpen] = useState(false)
  const [selectedCustomerNote, setSelectedCustomerNote] = useState("")

  // Fetch workers if not provided
  useEffect(() => {
    if (availableWorkers.length === 0) {
      const fetchWorkers = async () => {
        try {
          const response = await fetch('/api/workers')
          if (response.ok) {
            const workersData = await response.json()
            setAvailableWorkers(workersData)
          }
        } catch (error) {
          console.error('Failed to fetch workers:', error)
        }
      }
      fetchWorkers()
    }
  }, [availableWorkers.length])

  // Filter repairs based on search and filters
  const filteredRepairs = useMemo(() => {
    return repairs.filter((repair) => {
      const matchesSearch =
        searchTerm === "" ||
        repair.repair_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        repair.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        repair.original_order_number?.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesStatus = statusFilter === "all" || repair.status === statusFilter
      const matchesPriority = priorityFilter === "all" || repair.priority === priorityFilter
      const matchesRepairType = repairTypeFilter === "all" || repair.repair_type === repairTypeFilter
      const matchesRepairSource = repairSourceFilter === "all" || repair.repair_source === repairSourceFilter
      const matchesAssignment = 
        assignmentFilter === "all" || 
        (assignmentFilter === "my_repairs" && repair.assigned_to?.id === currentWorkerId) ||
        (assignmentFilter === "unassigned" && !repair.assigned_to)

      return matchesSearch && matchesStatus && matchesPriority && matchesRepairType && matchesRepairSource && matchesAssignment
    })
  }, [repairs, searchTerm, statusFilter, priorityFilter, repairTypeFilter, repairSourceFilter, assignmentFilter, currentWorkerId])

  // Calculate dashboard stats
  const stats = useMemo(() => {
    const today = new Date()
    const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1)

    const filteredByType =
      repairTypeFilter === "all" ? repairs : repairs.filter((r) => r.repair_type === repairTypeFilter)

    return {
      repairsNeeded: filteredByType.filter((r) => r.status === "intake" || r.status === "diagnosed").length,
      inProgress: filteredByType.filter((r) => r.status === "in_progress" || r.status === "approved").length,
      completedThisMonth: filteredByType.filter(
        (r) => r.status === "completed" && new Date(r.received_date) >= thisMonth,
      ).length,
    }
  }, [repairs, repairTypeFilter])

  const handleViewRepair = (repair: RepairOrder) => {
    router.push(`/worker/repairs/${repair.id}`)
  }

  const handleAssignRepair = async () => {
    if (!selectedRepair || !newAssignee) return

    try {
      const response = await fetch(`/api/repairs/${selectedRepair}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assigned_to: newAssignee })
      })

      if (!response.ok) throw new Error('Failed to assign repair')

      toast({
        title: "Repair Assigned",
        description: `Repair assigned successfully`,
      })
      
      setAssignDialogOpen(false)
      setNewAssignee("")
      setSelectedRepair(null)
      router.refresh()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to assign repair",
        variant: "destructive",
      })
    }
  }

  const handleUpdateStatus = async () => {
    if (!selectedRepair || !newStatus) return

    try {
      const response = await fetch(`/api/repairs/${selectedRepair}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })

      if (!response.ok) throw new Error('Failed to update status')

      toast({
        title: "Status Updated",
        description: `Repair status updated to ${newStatus}`,
      })
      
      setUpdateDialogOpen(false)
      setNewStatus("")
      setSelectedRepair(null)
      router.refresh()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update status",
        variant: "destructive",
      })
    }
  }

  const handleUpdatePriority = async () => {
    if (!selectedRepair || !newPriority) return

    try {
      const response = await fetch(`/api/repairs/${selectedRepair}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priority: newPriority })
      })

      if (!response.ok) throw new Error('Failed to update priority')

      toast({
        title: "Priority Updated",
        description: `Repair priority updated to ${newPriority}`,
      })
      
      setPriorityDialogOpen(false)
      setNewPriority("standard")
      setSelectedRepair(null)
      router.refresh()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update priority",
        variant: "destructive",
      })
    }
  }

  const handleApproveRepair = async (repairId: string) => {
    try {
      const response = await fetch(`/api/repairs/${repairId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: 'approved',
          customer_approved: true
        })
      })

      if (!response.ok) throw new Error('Failed to approve repair')

      toast({
        title: "Repair Approved",
        description: "Repair has been approved and can proceed",
      })
      
      router.refresh()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to approve repair",
        variant: "destructive",
      })
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800"
      case "in_progress":
        return "bg-blue-100 text-blue-800"
      case "diagnosed":
        return "bg-yellow-100 text-yellow-800"
      case "approved":
        return "bg-purple-100 text-purple-800"
      case "testing":
        return "bg-orange-100 text-orange-800"
      case "intake":
        return "bg-gray-100 text-gray-800"
      case "shipped":
        return "bg-green-100 text-green-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "rush":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const handleViewCustomerNote = (repair: RepairOrder) => {
    setSelectedCustomerNote(repair.customer_note || "No customer note provided.")
    setCustomerNoteDialogOpen(true)
  }

  const handleOpenEmailDialog = (repair: RepairOrder) => {
    toast({
      title: "Email Feature",
      description: "Email notification feature coming soon!",
    })
  }

  const renderRepairItem = (repair: RepairOrder) => (
    <div key={repair.id} className="border rounded-lg p-4 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div>
            <div className="font-semibold">{repair.repair_number}</div>
            <div className="text-sm text-muted-foreground">
              {repair.model} {repair.wood_type && `| ${repair.wood_type}`} {repair.original_order_number && `| Order #${repair.original_order_number}`}
            </div>
          </div>
          <Badge className={getStatusColor(repair.status)}>{repair.status.replace("_", " ")}</Badge>
          <Badge className={getPriorityColor(repair.priority)}>{repair.priority}</Badge>
          <Badge
            variant="secondary"
            className={
              repair.repair_type === "production"
                ? "bg-blue-100 text-blue-800"
                : repair.repair_type === "sonic"
                  ? "bg-purple-100 text-purple-800"
                  : "bg-green-100 text-green-800"
            }
          >
            {repair.repair_type}
          </Badge>
          {repair.estimated_cost && (
            <Badge variant="outline">
              <DollarSign className="mr-1 h-3 w-3" />${repair.estimated_cost.toFixed(2)}
            </Badge>
          )}
        </div>

        <div className="flex space-x-2">
          <div className="flex flex-col items-center space-y-1">
            <div className="text-xs font-bold text-gray-600">LOCATION:</div>
            <div className="text-sm font-bold text-blue-800 bg-blue-50 px-2 py-1 rounded border">
              {repair.location || "Repair Wall"}
            </div>
          </div>

          <Button size="sm" variant="outline" onClick={() => handleViewRepair(repair)}>
            <Eye className="mr-1 h-3 w-3" />
            View
          </Button>

          <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" onClick={() => setSelectedRepair(repair.id)}>
                <UserPlus className="mr-1 h-3 w-3" />
                Assign
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Assign Repair</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="assignee">Assign to Technician</Label>
                  <Select value={newAssignee} onValueChange={setNewAssignee}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select technician" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableWorkers.map((worker) => (
                        <SelectItem key={worker.id} value={worker.id}>
                          {worker.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAssignRepair}>Assign</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={updateDialogOpen} onOpenChange={setUpdateDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" onClick={() => setSelectedRepair(repair.id)}>
                <RefreshCw className="mr-1 h-3 w-3" />
                Update
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Update Repair Status</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="status">New Status</Label>
                  <Select value={newStatus} onValueChange={setNewStatus}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="intake">Intake</SelectItem>
                      <SelectItem value="diagnosed">Diagnosed</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="testing">Testing</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="shipped">Shipped</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setUpdateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleUpdateStatus}>Update</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {repair.customer_note && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleViewCustomerNote(repair)}
              className="bg-blue-50 hover:bg-blue-100 border-blue-200"
            >
              <MessageSquare className="mr-1 h-3 w-3" />
              Customer Note
            </Button>
          )}

          {repair.status === "diagnosed" && !repair.customer_approved && (
            <Button size="sm" onClick={() => handleApproveRepair(repair.id)}>
              <CheckCircle className="mr-1 h-3 w-3" />
              Approve
            </Button>
          )}

          <Button size="sm" variant="outline" onClick={() => handleOpenEmailDialog(repair)}>
            <Mail className="mr-1 h-3 w-3" />
            Notify
          </Button>
        </div>
      </div>

      <div className="text-sm text-muted-foreground flex items-center justify-between">
        <span>
          Customer: {repair.customer_name} | Received: {new Date(repair.received_date).toLocaleDateString()} 
          {repair.totalTimeSpent && repair.totalTimeSpent > 0 && (
            <> | Time: {Math.floor(repair.totalTimeSpent / 60)}h {repair.totalTimeSpent % 60}m</>
          )}
        </span>
        <div className="flex items-center space-x-2">
          {repair.assigned_to && <Badge variant="secondary">Assigned to: {repair.assigned_to.name}</Badge>}
          {repair.order_type === "warranty" && (
            <Badge className="bg-green-100 text-green-800">
              <CheckCircle className="mr-1 h-3 w-3" />
              Warranty
            </Badge>
          )}
        </div>
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">ZMF Repair Center</h1>
        <div className="flex items-center space-x-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search repairs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-64"
            />
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Repairs Needed</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.repairsNeeded}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.inProgress}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed This Month</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completedThisMonth}</div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-2">
            <Button asChild>
              <Link href="/worker/repairs/new">
                <Plus className="mr-2 h-4 w-4" />
                New Repair
              </Link>
            </Button>
            <Button variant="outline" onClick={() => toast({ title: "Analytics coming soon!" })}>
              <BarChart3 className="mr-2 h-4 w-4" />
              Analytics
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex space-x-4">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="intake">Intake</SelectItem>
            <SelectItem value="diagnosed">Diagnosed</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="testing">Testing</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="shipped">Shipped</SelectItem>
          </SelectContent>
        </Select>

        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priority</SelectItem>
            <SelectItem value="standard">Standard</SelectItem>
            <SelectItem value="rush">Rush</SelectItem>
          </SelectContent>
        </Select>

        <Select value={repairSourceFilter} onValueChange={setRepairSourceFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All Sources" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sources</SelectItem>
            <SelectItem value="customer">Customer Repairs</SelectItem>
            <SelectItem value="internal">Internal Repairs</SelectItem>
          </SelectContent>
        </Select>

        {currentWorkerId && (
          <Select value={assignmentFilter} onValueChange={setAssignmentFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All Assignments" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Repairs</SelectItem>
              <SelectItem value="my_repairs">My Repairs</SelectItem>
              <SelectItem value="unassigned">Unassigned</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Repair Queue with Tabs */}
      <Card>
        <CardHeader>
          <CardTitle>Repair Queue ({filteredRepairs.length} repairs)</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs
            value={repairTypeFilter}
            onValueChange={(value) => setRepairTypeFilter(value as "all" | "production" | "finishing" | "sonic")}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="all">All Repairs</TabsTrigger>
              <TabsTrigger value="production">Production</TabsTrigger>
              <TabsTrigger value="finishing">Finishing</TabsTrigger>
              <TabsTrigger value="sonic">Sonic</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="mt-4">
              <div className="space-y-4">
                {filteredRepairs.length > 0 ? (
                  filteredRepairs.map(renderRepairItem)
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No repairs found matching your filters.
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="production" className="mt-4">
              <div className="space-y-4">
                {filteredRepairs.filter((repair) => repair.repair_type === "production").map(renderRepairItem)}
              </div>
            </TabsContent>

            <TabsContent value="finishing" className="mt-4">
              <div className="space-y-4">
                {filteredRepairs.filter((repair) => repair.repair_type === "finishing").map(renderRepairItem)}
              </div>
            </TabsContent>

            <TabsContent value="sonic" className="mt-4">
              <div className="space-y-4">
                {filteredRepairs.filter((repair) => repair.repair_type === "sonic").map(renderRepairItem)}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Customer Note Dialog */}
      <Dialog open={customerNoteDialogOpen} onOpenChange={setCustomerNoteDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Customer Note</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-gray-50 border rounded-lg p-4">
              <div className="text-sm text-gray-600 mb-2">Customer's description of the issue:</div>
              <div className="text-gray-900 whitespace-pre-wrap">{selectedCustomerNote}</div>
            </div>
            <div className="flex justify-end">
              <Button variant="outline" onClick={() => setCustomerNoteDialogOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}