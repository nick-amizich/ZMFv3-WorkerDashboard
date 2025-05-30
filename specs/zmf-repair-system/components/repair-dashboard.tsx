"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { useRepairContext } from "../contexts/repair-context"
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

import QCSection from "./qc-section"
import ReadyToShipSection from "./ready-to-ship-section"
import type { RepairOrder } from "@/contexts/repair-context"

// Update the component props to include onNewRepair
export default function RepairDashboard({ onNewRepair }: { onNewRepair: () => void }) {
  const { repairs } = useRepairContext()

  const { toast } = useToast()
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

  const [qcRepairs, setQcRepairs] = useState<any[]>([])
  const [readyToShipRepairs, setReadyToShipRepairs] = useState<any[]>([])

  const [customerNoteDialogOpen, setCustomerNoteDialogOpen] = useState(false)
  const [selectedCustomerNote, setSelectedCustomerNote] = useState("")

  const [showFlexingMan, setShowFlexingMan] = useState(false)

  // Filter repairs based on search and filters
  const filteredRepairs = useMemo(() => {
    return repairs.filter((repair) => {
      const matchesSearch =
        searchTerm === "" ||
        repair.repairNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        repair.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        repair.originalOrderNumber?.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesStatus = statusFilter === "all" || repair.status === statusFilter
      const matchesPriority = priorityFilter === "all" || repair.priority === priorityFilter
      const matchesRepairType = repairTypeFilter === "all" || repair.repairType === repairTypeFilter
      const matchesRepairSource = repairSourceFilter === "all" || repair.repairSource === repairSourceFilter

      return matchesSearch && matchesStatus && matchesPriority && matchesRepairType && matchesRepairSource
    })
  }, [repairs, searchTerm, statusFilter, priorityFilter, repairTypeFilter, repairSourceFilter])

  // Calculate dashboard stats
  const stats = useMemo(() => {
    const today = new Date()
    const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1)

    const filteredByType =
      repairTypeFilter === "all" ? repairs : repairs.filter((r) => r.repairType === repairTypeFilter)

    return {
      repairsNeeded: filteredByType.filter((r) => r.status === "intake" || r.status === "diagnosed").length,
      inProgress: filteredByType.filter((r) => r.status === "in_progress" || r.status === "approved").length,
      completedThisMonth: filteredByType.filter(
        (r) => r.status === "completed" && new Date(r.receivedDate) >= thisMonth,
      ).length,
    }
  }, [repairs, repairTypeFilter])

  const handleViewRepair = (repair: any) => {
    toast({
      title: "Repair Opened",
      description: `Viewing repair ${repair.repairNumber}`,
    })
  }

  const handleAssignRepair = async () => {
    if (!selectedRepair || !newAssignee) return

    try {
      toast({
        title: "Repair Assigned",
        description: `Repair assigned to ${newAssignee}`,
      })
      setAssignDialogOpen(false)
      setNewAssignee("")
      setSelectedRepair(null)
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
      toast({
        title: "Status Updated",
        description: `Repair status updated to ${newStatus}`,
      })
      setUpdateDialogOpen(false)
      setNewStatus("")
      setSelectedRepair(null)
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
      toast({
        title: "Priority Updated",
        description: `Repair priority updated to ${newPriority}`,
      })
      setPriorityDialogOpen(false)
      setNewPriority("standard")
      setSelectedRepair(null)
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
      toast({
        title: "Repair Approved",
        description: "Repair has been approved and can proceed",
      })
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

  const handleStartRepair = (repair: any) => {
    // Show the flexing man image
    setShowFlexingMan(true)

    // Hide it after 2 seconds and navigate
    setTimeout(() => {
      setShowFlexingMan(false)
      window.location.href = `/repair-work/${repair.id}`
    }, 2000)
  }

  const handleViewCustomerNote = (repair: any) => {
    setSelectedCustomerNote(repair.customerNote || "No customer note provided.")
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
            <div className="font-semibold">{repair.repairNumber}</div>
            <div className="text-sm text-muted-foreground">
              {repair.model} | {repair.woodType} | Order #{repair.originalOrderNumber}
            </div>
          </div>
          <Badge className={getStatusColor(repair.status)}>{repair.status.replace("_", " ")}</Badge>
          <Badge className={getPriorityColor(repair.priority)}>{repair.priority}</Badge>
          <Badge
            variant="secondary"
            className={
              repair.repairType === "production"
                ? "bg-blue-100 text-blue-800"
                : repair.repairType === "sonic"
                  ? "bg-purple-100 text-purple-800"
                  : "bg-green-100 text-green-800"
            }
          >
            {repair.repairType}
          </Badge>
          {repair.isFirstTime && (
            <Badge className="bg-yellow-100 text-yellow-800">
              <Clock className="mr-1 h-3 w-3" />
              First Time
            </Badge>
          )}
          {repair.estimatedCost && (
            <Badge variant="outline">
              <DollarSign className="mr-1 h-3 w-3" />${repair.estimatedCost.toFixed(2)}
            </Badge>
          )}
        </div>

        <div className="flex space-x-2">
          <div className="flex flex-col items-center space-y-1">
            <div className="text-xs font-bold text-gray-600">LOCATION:</div>
            <div className="text-sm font-bold text-blue-800 bg-blue-50 px-2 py-1 rounded border">
              {repair.location || "Repair Wall"}
            </div>
            <Button
              size="sm"
              className="bg-green-600 hover:bg-green-700 font-bold"
              onClick={() => handleStartRepair(repair)}
            >
              Start Repair
            </Button>
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
                      <SelectItem value="Zach">Zach</SelectItem>
                      <SelectItem value="Keith">Keith</SelectItem>
                      <SelectItem value="Landon">Landon</SelectItem>
                      <SelectItem value="Stephen">Stephen</SelectItem>
                      <SelectItem value="Jake">Jake</SelectItem>
                      <SelectItem value="Kevin">Kevin</SelectItem>
                      <SelectItem value="Tony">Tony</SelectItem>
                      <SelectItem value="Matt">Matt</SelectItem>
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

          <Dialog open={priorityDialogOpen} onOpenChange={setPriorityDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" onClick={() => setSelectedRepair(repair.id)}>
                {repair.priority === "rush" ? (
                  <Badge className="bg-red-100 text-red-800 mr-1">Rush</Badge>
                ) : (
                  <Badge className="bg-gray-100 text-gray-800 mr-1">Standard</Badge>
                )}
                Change Priority
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Update Repair Priority</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="priority">New Priority</Label>
                  <Select value={newPriority} onValueChange={setNewPriority}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="standard">Standard</SelectItem>
                      <SelectItem value="rush">Rush</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setPriorityDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleUpdatePriority}>Update</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {repair.customerNote && (
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

          {repair.status === "diagnosed" && !repair.customerApproved && (
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
          Customer: {repair.customerName} | Received: {new Date(repair.receivedDate).toLocaleDateString()} | Time:{" "}
          {Math.floor((repair.timeSpent || 0) / 60)}h {(repair.timeSpent || 0) % 60}m
        </span>
        <div className="flex items-center space-x-2">
          {repair.assignedTo && <Badge variant="secondary">Assigned to: {repair.assignedTo}</Badge>}
          {repair.orderType === "warranty" && (
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
    <div className="p-6 space-y-6">
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
            <Button onClick={onNewRepair}>
              <Plus className="mr-2 h-4 w-4" />
              New Repair
            </Button>
            <Button variant="outline" onClick={() => (window.location.href = "/analytics")}>
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
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="all">All Repairs</TabsTrigger>
              <TabsTrigger value="production">Production</TabsTrigger>
              <TabsTrigger value="finishing">Finishing</TabsTrigger>
              <TabsTrigger value="sonic">Sonic</TabsTrigger>
              <TabsTrigger value="qc">Ready for QC</TabsTrigger>
              <TabsTrigger value="shipping">Ready to Ship</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="mt-4">
              <div className="space-y-4">{filteredRepairs.map(renderRepairItem)}</div>
            </TabsContent>

            <TabsContent value="production" className="mt-4">
              <div className="space-y-4">
                {filteredRepairs.filter((repair) => repair.repairType === "production").map(renderRepairItem)}
              </div>
            </TabsContent>

            <TabsContent value="finishing" className="mt-4">
              <div className="space-y-4">
                {filteredRepairs.filter((repair) => repair.repairType === "finishing").map(renderRepairItem)}
              </div>
            </TabsContent>

            <TabsContent value="sonic" className="mt-4">
              <div className="space-y-4">
                {filteredRepairs.filter((repair) => repair.repairType === "sonic").map(renderRepairItem)}
              </div>
            </TabsContent>

            <TabsContent value="qc" className="mt-4">
              <QCSection repairs={filteredRepairs.filter((repair) => repair.status === "testing")} />
            </TabsContent>

            <TabsContent value="shipping" className="mt-4">
              <ReadyToShipSection repairs={readyToShipRepairs} />
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

      {/* Flexing Man Dialog */}
      <Dialog open={showFlexingMan} onOpenChange={setShowFlexingMan}>
        <DialogContent className="max-w-md border-none bg-transparent shadow-none">
          <div className="flex flex-col items-center justify-center space-y-4 bg-white rounded-lg p-6 shadow-lg">
            <div className="text-6xl animate-bounce">💪</div>
            <div className="text-2xl font-bold text-center">LET'S GET TO WORK!</div>
            <div className="text-lg text-center text-gray-600">Time to flex those repair skills!</div>
            <div className="flex space-x-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: "0.2s" }}></div>
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: "0.4s" }}></div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
