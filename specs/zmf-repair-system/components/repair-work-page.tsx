"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { useRepairContext } from "../contexts/repair-context"
import {
  Play,
  Pause,
  Clock,
  MessageSquare,
  ArrowLeft,
  Save,
  CheckCircle,
  Edit,
  Camera,
  Upload,
  Bot,
  Database,
  Search,
  User,
} from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Checkbox } from "@/components/ui/checkbox"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface RepairWorkPageProps {
  repairId: string
}

export default function RepairWorkPage({ repairId }: RepairWorkPageProps) {
  const { repairs, updateRepairStatus, updateTimeSpent, addRepairIssue } = useRepairContext()
  const { toast } = useToast()

  const [repair, setRepair] = useState(repairs.find((r) => r.id === repairId))
  const [isTimerRunning, setIsTimerRunning] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [totalTime, setTotalTime] = useState(repair?.timeSpent || 0)
  const [repairNotes, setRepairNotes] = useState("")
  const [additionalFindings, setAdditionalFindings] = useState("")
  const [slackMessage, setSlackMessage] = useState("")
  const [slackDialogOpen, setSlackDialogOpen] = useState(false)
  const [amendDialogOpen, setAmendDialogOpen] = useState(false)
  const [activeTab, setActiveTab] = useState("details")
  const [photoUploadDialogOpen, setPhotoUploadDialogOpen] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [checklist, setChecklist] = useState([
    { id: 1, task: "Visual inspection complete", completed: false },
    { id: 2, task: "Cable continuity tested", completed: false },
    { id: 3, task: "Driver resistance measured", completed: false },
    { id: 4, task: "Solder joints inspected", completed: false },
  ])

  // New states for the requested features
  const [saveProgressDialogOpen, setSaveProgressDialogOpen] = useState(false)
  const [returnToQueueLocation, setReturnToQueueLocation] = useState("")
  const [continueWorkingLater, setContinueWorkingLater] = useState(false)
  const [finishRepairDialogOpen, setFinishRepairDialogOpen] = useState(false)
  const [repairSolution, setRepairSolution] = useState("")
  const [addToAIDatabase, setAddToAIDatabase] = useState(true)
  const [technicianDialogOpen, setTechnicianDialogOpen] = useState(false)
  const [selectedTechnician, setSelectedTechnician] = useState("")
  const [aiQueryDialogOpen, setAiQueryDialogOpen] = useState(false)
  const [aiQuery, setAiQuery] = useState("")
  const [aiResponse, setAiResponse] = useState("")
  const [isAiLoading, setIsAiLoading] = useState(false)
  const [zenMasterDialogOpen, setZenMasterDialogOpen] = useState(false)

  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const startTimeRef = useRef<number | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    // Load repair data
    const currentRepair = repairs.find((r) => r.id === repairId)
    if (currentRepair) {
      setRepair(currentRepair)
      setTotalTime(currentRepair.timeSpent || 0)
    }
  }, [repairId, repairs])

  useEffect(() => {
    if (isTimerRunning) {
      startTimeRef.current = Date.now() - currentTime * 1000
      timerRef.current = setInterval(() => {
        if (startTimeRef.current) {
          const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000)
          setCurrentTime(elapsed)
        }
      }, 1000)
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [isTimerRunning, currentTime])

  // Show technician selection dialog when the component mounts
  useEffect(() => {
    if (!selectedTechnician) {
      setTechnicianDialogOpen(true)
    }
  }, [selectedTechnician])

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  const handleStartTimer = () => {
    if (!selectedTechnician) {
      setTechnicianDialogOpen(true)
      return
    }

    setIsTimerRunning(true)
    updateRepairStatus(repairId, "in_progress")
    toast({
      title: "Timer Started",
      description: "Repair timer is now running",
    })
  }

  const handlePauseTimer = () => {
    setIsTimerRunning(false)
    handleSaveProgress()
    toast({
      title: "Timer Paused",
      description: "Repair timer has been paused",
    })
  }

  const handleFinishRepair = async () => {
    setIsTimerRunning(false)
    setZenMasterDialogOpen(true)

    // After 2 seconds, close the zen dialog and open the finish repair dialog
    setTimeout(() => {
      setZenMasterDialogOpen(false)
      setFinishRepairDialogOpen(true)
    }, 2000)
  }

  const handleFinishRepairConfirm = async () => {
    const finalTime = totalTime + currentTime

    try {
      await updateTimeSpent(repairId, Math.floor(currentTime / 60))
      await updateRepairStatus(repairId, "completed")

      // Save the repair solution to the database
      if (addToAIDatabase) {
        // In a real app, you would save this to a database
        console.log("Adding to AI database:", {
          repairId,
          solution: repairSolution,
          technician: selectedTechnician,
          timeSpent: finalTime,
          model: repair?.model,
          issue: repair?.issues[0]?.specificIssue,
        })
      }

      toast({
        title: "Repair Completed",
        description: `Repair finished in ${formatTime(finalTime)}`,
      })

      setFinishRepairDialogOpen(false)

      // Navigate back to dashboard
      window.location.href = "/"
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to complete repair",
        variant: "destructive",
      })
    }
  }

  const handleSaveProgress = async () => {
    // Pause the timer first
    setIsTimerRunning(false)

    // Open the dialog to ask about next steps
    setSaveProgressDialogOpen(true)
  }

  const handleSaveProgressConfirm = async () => {
    try {
      // Save the current time spent
      await updateTimeSpent(repairId, Math.floor(currentTime / 60))

      // If returning to queue, update the repair location
      if (!continueWorkingLater && returnToQueueLocation) {
        // Here you would update the repair location in a real app
        toast({
          title: "Repair Returned to Queue",
          description: `Repair moved to ${returnToQueueLocation}`,
        })

        // Navigate back to dashboard if returning to queue
        window.location.href = "/"
      } else {
        // Just save progress if continuing later
        toast({
          title: "Progress Saved",
          description: "Repair progress has been saved",
        })

        setTotalTime((prev) => prev + currentTime)
        setCurrentTime(0)
      }

      // Close the dialog
      setSaveProgressDialogOpen(false)
      setReturnToQueueLocation("")
      setContinueWorkingLater(false)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save progress",
        variant: "destructive",
      })
    }
  }

  const handleAmendRepair = async () => {
    try {
      if (!additionalFindings.trim()) return

      await addRepairIssue(repairId, {
        repairOrderId: repairId,
        category: "other",
        specificIssue: additionalFindings,
        severity: "functional",
        photoUrls: [],
      })

      toast({
        title: "Repair Amended",
        description: "Additional findings have been added to the repair",
      })

      setAmendDialogOpen(false)
      setAdditionalFindings("")

      // Refresh repair data
      const updatedRepair = repairs.find((r) => r.id === repairId)
      if (updatedRepair) {
        setRepair(updatedRepair)
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to amend repair",
        variant: "destructive",
      })
    }
  }

  const handleSendSlackMessage = async () => {
    try {
      // Here you would integrate with Slack API
      console.log("Sending Slack message:", slackMessage)

      toast({
        title: "Message Sent",
        description: "Question sent to Slack channel",
      })

      setSlackMessage("")
      setSlackDialogOpen(false)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send Slack message",
        variant: "destructive",
      })
    }
  }

  const handleReturnToQueue = async () => {
    setIsTimerRunning(false)

    try {
      await updateTimeSpent(repairId, Math.floor(currentTime / 60))
      await updateRepairStatus(repairId, "in_progress")

      toast({
        title: "Returned to Queue",
        description: "Repair has been returned to the queue",
      })

      // Navigate back to dashboard
      window.location.href = "/"
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to return to queue",
      })
    }
  }

  const toggleChecklistItem = (id: number) => {
    setChecklist((prev) => prev.map((item) => (item.id === id ? { ...item, completed: !item.completed } : item)))
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0])
    }
  }

  const handleUploadPhoto = () => {
    if (selectedFile) {
      // Here you would upload the photo to your storage
      toast({
        title: "Photo Uploaded",
        description: `Photo "${selectedFile.name}" has been uploaded`,
      })
      setSelectedFile(null)
      setPhotoUploadDialogOpen(false)
    }
  }

  const handleAiQuery = async () => {
    if (!aiQuery.trim()) return

    setIsAiLoading(true)
    try {
      // Simulate AI response - in a real app, this would call an API
      await new Promise((resolve) => setTimeout(resolve, 1500))

      // Mock response based on the query
      let response = "I don't have specific information about that repair issue yet."

      if (aiQuery.toLowerCase().includes("driver")) {
        response =
          "Based on our repair database, driver issues are commonly caused by:\n\n" +
          "1. Loose solder joints (42% of cases)\n" +
          "2. Damaged driver diaphragm (28% of cases)\n" +
          "3. Cable connection issues (18% of cases)\n\n" +
          "The most successful repair approach has been to first check continuity, then inspect solder joints under magnification, and finally test the driver with a multimeter before replacement."
      } else if (aiQuery.toLowerCase().includes("cable")) {
        response =
          "Cable repairs in our database show:\n\n" +
          "1. Most failures occur at the Y-split or connector points\n" +
          "2. Technician Jake has developed a reinforcement technique using heat shrink and flexible adhesive\n" +
          "3. For intermittent connections, resoldering with higher silver content solder has shown 94% success rate"
      } else if (aiQuery.toLowerCase().includes("wood")) {
        response =
          "Wood cup repairs require specific approaches based on the wood type:\n\n" +
          "- For stabilized wood: Use cyanoacrylate adhesive with accelerator\n" +
          "- For natural woods: Use wood glue with 24-hour clamping\n" +
          "- For hairline cracks: Capillary action with thin CA glue shows best results\n\n" +
          "Technician Zach documented that pre-warming natural wood cups to 100°F before gluing improves bond strength by approximately 30%."
      }

      setAiResponse(response)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to get AI response",
        variant: "destructive",
      })
    } finally {
      setIsAiLoading(false)
    }
  }

  const completedTasks = checklist.filter((item) => item.completed).length
  const progressPercentage = (completedTasks / checklist.length) * 100

  if (!repair) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6 text-center">
            <h2 className="text-xl font-semibold mb-2">Repair Not Found</h2>
            <p className="text-muted-foreground mb-4">The requested repair could not be found.</p>
            <Button onClick={() => (window.location.href = "/")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" onClick={() => (window.location.href = "/")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{repair.repairNumber}</h1>
            <p className="text-muted-foreground">
              {repair.model} - {repair.customerName}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Badge className={repair.priority === "rush" ? "bg-red-100 text-red-800" : "bg-gray-100 text-gray-800"}>
            {repair.priority}
          </Badge>
          <Badge variant="secondary">{repair.repairType}</Badge>
          {selectedTechnician && (
            <Badge variant="outline" className="ml-2">
              <User className="mr-1 h-3 w-3" />
              {selectedTechnician}
            </Badge>
          )}
        </div>
      </div>

      {/* Timer Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Clock className="mr-2 h-5 w-5" />
            Repair Timer
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="text-4xl font-mono font-bold">{formatTime(currentTime)}</div>
              <div className="text-sm text-muted-foreground">Total time: {formatTime(totalTime + currentTime)}</div>
            </div>
            <div className="flex space-x-2">
              {!isTimerRunning ? (
                <Button onClick={handleStartTimer} className="bg-green-600 hover:bg-green-700">
                  <Play className="mr-2 h-4 w-4" />
                  Start
                </Button>
              ) : (
                <Button onClick={handlePauseTimer} variant="outline">
                  <Pause className="mr-2 h-4 w-4" />
                  Pause
                </Button>
              )}
              <Button onClick={handleSaveProgress} variant="outline">
                <Save className="mr-2 h-4 w-4" />
                Save Progress
              </Button>
              <Button onClick={handleFinishRepair} className="bg-blue-600 hover:bg-blue-700">
                <CheckCircle className="mr-2 h-4 w-4" />
                Finish Repair
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI Assistant Button */}
      <Button
        variant="outline"
        className="w-full border-dashed border-2 bg-blue-50 hover:bg-blue-100 hover:border-blue-300"
        onClick={() => setAiQueryDialogOpen(true)}
      >
        <Bot className="mr-2 h-5 w-5 text-blue-600" />
        <span className="text-blue-700">Ask Repair AI Assistant</span>
      </Button>

      {/* Tabs for different sections */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="details">Repair Details</TabsTrigger>
          <TabsTrigger value="diagnosis">Diagnosis</TabsTrigger>
          <TabsTrigger value="work">Work Notes</TabsTrigger>
          <TabsTrigger value="photos">Photos</TabsTrigger>
        </TabsList>

        {/* Details Tab */}
        <TabsContent value="details" className="mt-4 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Repair Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Order Number</Label>
                    <div className="font-medium">{repair.originalOrderNumber || "N/A"}</div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Model</Label>
                    <div className="font-medium">{repair.model}</div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Wood Type</Label>
                    <div className="font-medium">{repair.woodType || "N/A"}</div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Serial Number</Label>
                    <div className="font-medium">{repair.serialNumber || "N/A"}</div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Received Date</Label>
                    <div className="font-medium">{new Date(repair.receivedDate).toLocaleDateString()}</div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Assigned To</Label>
                    <div className="font-medium">{repair.assignedTo || "Unassigned"}</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Customer Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Name</Label>
                  <div className="font-medium">{repair.customerName}</div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Email</Label>
                  <div className="font-medium">{repair.customerEmail}</div>
                </div>
                {repair.customerPhone && (
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Phone</Label>
                    <div className="font-medium">{repair.customerPhone}</div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Issue Description */}
          <Card>
            <CardHeader>
              <CardTitle>Issue Description</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Original Issue</Label>
                  <div className="mt-1 p-3 bg-gray-50 rounded-md">
                    {repair.issues.length > 0 ? repair.issues[0].specificIssue : "No issue description available"}
                  </div>
                </div>

                {repair.issues.length > 1 && (
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Additional Issues</Label>
                    {repair.issues.slice(1).map((issue, index) => (
                      <div key={index} className="mt-1 p-3 bg-gray-50 rounded-md">
                        {issue.specificIssue}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Diagnosis Tab */}
        <TabsContent value="diagnosis" className="mt-4 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Diagnosis Checklist</CardTitle>
              <Progress value={progressPercentage} className="h-2" />
            </CardHeader>
            <CardContent className="space-y-3">
              {checklist.map((item) => (
                <div key={item.id} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id={`task-${item.id}`}
                    checked={item.completed}
                    onChange={() => toggleChecklistItem(item.id)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label
                    htmlFor={`task-${item.id}`}
                    className={`text-sm ${item.completed ? "line-through text-muted-foreground" : ""}`}
                  >
                    {item.task}
                  </label>
                </div>
              ))}

              <div className="pt-4">
                <Label htmlFor="customTask">Add Custom Task</Label>
                <div className="flex mt-2">
                  <Input id="customTask" placeholder="Enter new task..." className="flex-1 mr-2" />
                  <Button variant="outline" size="sm">
                    Add
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Diagnosis Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea placeholder="Add detailed diagnosis notes..." rows={4} />
              <div className="flex justify-end mt-4">
                <Button>Save Diagnosis</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Work Notes Tab */}
        <TabsContent value="work" className="mt-4 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Work Notes</CardTitle>
              <CardDescription>Document the repair work being performed</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={repairNotes}
                onChange={(e) => setRepairNotes(e.target.value)}
                placeholder="Add notes about the repair work being performed..."
                rows={6}
              />
              <div className="flex justify-end mt-4">
                <Button
                  onClick={() => {
                    toast({
                      title: "Notes Saved",
                      description: "Your work notes have been saved",
                    })
                  }}
                >
                  <Save className="mr-2 h-4 w-4" />
                  Save Notes
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Parts Used</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="partName">Part Name</Label>
                    <Input id="partName" placeholder="e.g., 50mm Driver" />
                  </div>
                  <div>
                    <Label htmlFor="partQuantity">Quantity</Label>
                    <Input id="partQuantity" type="number" min="1" defaultValue="1" />
                  </div>
                  <div className="flex items-end">
                    <Button className="w-full">Add Part</Button>
                  </div>
                </div>

                <div className="border rounded-md p-4">
                  <div className="text-sm font-medium mb-2">No parts added yet</div>
                  <div className="text-sm text-muted-foreground">Add parts used in this repair</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Photos Tab */}
        <TabsContent value="photos" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Repair Photos</CardTitle>
              <CardDescription>Upload photos of the repair process</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div
                  className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 cursor-pointer flex flex-col items-center justify-center aspect-square"
                  onClick={() => setPhotoUploadDialogOpen(true)}
                >
                  <Upload className="h-8 w-8 text-gray-400 mb-2" />
                  <div className="text-sm text-gray-600">Upload Photo</div>
                </div>

                {/* Sample photos - replace with actual photos */}
                <div className="border rounded-lg overflow-hidden aspect-square bg-gray-100 flex items-center justify-center">
                  <Camera className="h-8 w-8 text-gray-400" />
                </div>
                <div className="border rounded-lg overflow-hidden aspect-square bg-gray-100 flex items-center justify-center">
                  <Camera className="h-8 w-8 text-gray-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Action Buttons */}
      <div className="flex justify-between">
        <div className="flex space-x-2">
          <Dialog open={slackDialogOpen} onOpenChange={setSlackDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <MessageSquare className="mr-2 h-4 w-4" />
                Ask Question (Slack)
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Send Question to Slack</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="slackChannel">Channel</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select channel" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="repairs">repairs</SelectItem>
                      <SelectItem value="production">production</SelectItem>
                      <SelectItem value="general">general</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="slackMessage">Message</Label>
                  <Textarea
                    id="slackMessage"
                    value={slackMessage}
                    onChange={(e) => setSlackMessage(e.target.value)}
                    placeholder="Type your question here..."
                    rows={4}
                  />
                </div>

                {/* Add the note about taking photos */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="flex items-start space-x-2">
                    <Camera className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-blue-800">
                      <div className="font-medium mb-1">📱 Production Team Note</div>
                      <div>
                        For issues that could affect future builds, please use your phone to take a picture and post it
                        directly to the <strong>#production</strong> Slack channel so the team can be aware of potential
                        improvements.
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setSlackDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSendSlackMessage} disabled={!slackMessage.trim()}>
                    Send to Slack
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={amendDialogOpen} onOpenChange={setAmendDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Edit className="mr-2 h-4 w-4" />
                Amend Repair
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Amend Repair</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="additionalFindings">Additional Findings</Label>
                  <Textarea
                    id="additionalFindings"
                    value={additionalFindings}
                    onChange={(e) => setAdditionalFindings(e.target.value)}
                    placeholder="Describe any additional issues found during repair..."
                    rows={4}
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setAmendDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAmendRepair} disabled={!additionalFindings.trim()}>
                    Add to Repair
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex space-x-2">
          <Button variant="outline" onClick={handleReturnToQueue}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Return to Queue
          </Button>
        </div>
      </div>

      {/* Photo Upload Dialog */}
      <Dialog open={photoUploadDialogOpen} onOpenChange={setPhotoUploadDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Photo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="photoUpload">Select Photo</Label>
              <Input id="photoUpload" type="file" accept="image/*" onChange={handleFileChange} ref={fileInputRef} />
            </div>
            {selectedFile && (
              <div className="text-sm">
                Selected: {selectedFile.name} ({Math.round(selectedFile.size / 1024)} KB)
              </div>
            )}
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setPhotoUploadDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleUploadPhoto} disabled={!selectedFile}>
                Upload
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Save Progress Dialog */}
      <Dialog open={saveProgressDialogOpen} onOpenChange={setSaveProgressDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Repair Progress</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>What would you like to do with this repair?</Label>

              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="return-to-queue"
                    name="progress-option"
                    checked={!continueWorkingLater}
                    onChange={() => setContinueWorkingLater(false)}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="return-to-queue">Return repair to queue</Label>
                </div>

                {!continueWorkingLater && (
                  <div className="ml-6 mt-2">
                    <Label htmlFor="queue-location">Select location</Label>
                    <Select value={returnToQueueLocation} onValueChange={setReturnToQueueLocation}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select location" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="repair_wall">Repair Wall</SelectItem>
                        <SelectItem value="repair_shelves">Repair Shelves</SelectItem>
                        <SelectItem value="qc_room">QC Room</SelectItem>
                        <SelectItem value="in_repair">In Repair</SelectItem>
                        <SelectItem value="finishing_area">Finishing Area</SelectItem>
                        <SelectItem value="shipping">Shipping</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="continue-later"
                    name="progress-option"
                    checked={continueWorkingLater}
                    onChange={() => setContinueWorkingLater(true)}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="continue-later">I'll continue working on this repair today</Label>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setSaveProgressDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveProgressConfirm} disabled={!continueWorkingLater && !returnToQueueLocation}>
                Confirm
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Finish Repair Dialog */}
      <Dialog open={finishRepairDialogOpen} onOpenChange={setFinishRepairDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Complete Repair</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="repairSolution" className="text-base font-medium">
                How was this issue repaired?
              </Label>
              <Textarea
                id="repairSolution"
                value={repairSolution}
                onChange={(e) => setRepairSolution(e.target.value)}
                placeholder="Describe the repair process, parts replaced, and solution in detail..."
                rows={6}
                className="mt-2"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="addToDatabase"
                checked={addToAIDatabase}
                onCheckedChange={(checked) => setAddToAIDatabase(checked as boolean)}
              />
              <Label htmlFor="addToDatabase" className="text-sm">
                Add this repair solution to the AI knowledge database
              </Label>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <div className="flex items-start space-x-2">
                <Database className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-amber-800">
                  <div className="font-medium mb-1">Knowledge Database</div>
                  <div>
                    When checked, this repair solution will be added to our AI knowledge database to help other
                    technicians with similar repairs in the future. Only include detailed technical information, no
                    customer details.
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setFinishRepairDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleFinishRepairConfirm}
                disabled={!repairSolution.trim()}
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                Complete Repair
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Technician Selection Dialog */}
      <Dialog
        open={technicianDialogOpen}
        onOpenChange={(open) => {
          // Only allow closing if a technician is selected
          if (!open && !selectedTechnician) return
          setTechnicianDialogOpen(open)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Who's working on this repair?</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="technician">Select Technician</Label>
              <Select value={selectedTechnician} onValueChange={setSelectedTechnician}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select your name" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Zach">Zach</SelectItem>
                  <SelectItem value="Kevin">Kevin</SelectItem>
                  <SelectItem value="Matt">Matt</SelectItem>
                  <SelectItem value="Landon">Landon</SelectItem>
                  <SelectItem value="Jake">Jake</SelectItem>
                  <SelectItem value="Stephen">Stephen</SelectItem>
                  <SelectItem value="Tony">Tony</SelectItem>
                  <SelectItem value="Atticus">Atticus</SelectItem>
                  <SelectItem value="Keith">Keith</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end">
              <Button onClick={() => setTechnicianDialogOpen(false)} disabled={!selectedTechnician}>
                Confirm
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* AI Query Dialog */}
      <Dialog open={aiQueryDialogOpen} onOpenChange={setAiQueryDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Bot className="mr-2 h-5 w-5 text-blue-600" />
              Repair AI Assistant
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="text-sm text-blue-800">
                Ask about repair techniques, common issues, or solutions from our repair knowledge database.
              </div>
            </div>

            <div className="flex space-x-2">
              <Input
                value={aiQuery}
                onChange={(e) => setAiQuery(e.target.value)}
                placeholder="e.g., How to fix intermittent driver issues in Verite?"
                className="flex-1"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && aiQuery.trim()) {
                    handleAiQuery()
                  }
                }}
              />
              <Button onClick={handleAiQuery} disabled={!aiQuery.trim() || isAiLoading}>
                <Search className="mr-2 h-4 w-4" />
                {isAiLoading ? "Searching..." : "Search"}
              </Button>
            </div>

            {aiResponse && (
              <div className="border rounded-lg p-4 bg-gray-50">
                <div className="flex items-start space-x-3">
                  <Bot className="h-5 w-5 text-blue-600 mt-1 flex-shrink-0" />
                  <div className="space-y-2">
                    <div className="font-medium">AI Response:</div>
                    <div className="text-sm whitespace-pre-line">{aiResponse}</div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <Button variant="outline" onClick={() => setAiQueryDialogOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Zen Master Dialog */}
      <Dialog open={zenMasterDialogOpen} onOpenChange={setZenMasterDialogOpen}>
        <DialogContent className="sm:max-w-md text-center">
          <div className="flex flex-col items-center justify-center py-4 space-y-4">
            <div className="text-6xl animate-pulse">🧘</div>
            <DialogTitle className="text-xl">REPAIR COMPLETE</DialogTitle>
            <p className="text-muted-foreground">Inner peace achieved through perfect craftsmanship</p>
            <div className="text-sm text-muted-foreground flex items-center space-x-1">
              <span>Finding zen</span>
              <span className="animate-bounce">.</span>
              <span className="animate-bounce delay-100">.</span>
              <span className="animate-bounce delay-200">.</span>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
