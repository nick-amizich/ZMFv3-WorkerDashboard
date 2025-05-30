"use client"

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Checkbox } from '@/components/ui/checkbox'
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
  AlertCircle,
  Calendar,
  DollarSign,
  Package,
  Wrench,
  X
} from 'lucide-react'
import type { Database } from '@/types/database.types'

type RepairOrder = Database['public']['Tables']['repair_orders']['Row'] & {
  repair_issues: Database['public']['Tables']['repair_issues']['Row'][]
  repair_actions: Database['public']['Tables']['repair_actions']['Row'][]
  assigned_employee?: {
    id: string
    name: string
  }
}

interface RepairWorkPageProps {
  repair: RepairOrder
  technicians: { id: string; name: string }[]
  currentTechnician: { id: string; name: string }
}

export default function RepairWorkPage({ repair, technicians, currentTechnician }: RepairWorkPageProps) {
  const router = useRouter()
  const { toast } = useToast()
  
  const [isTimerRunning, setIsTimerRunning] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [totalTime, setTotalTime] = useState(repair.total_time_minutes || 0)
  const [repairNotes, setRepairNotes] = useState('')
  const [additionalFindings, setAdditionalFindings] = useState('')
  const [activeTab, setActiveTab] = useState('details')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [checklist, setChecklist] = useState([
    { id: 1, task: 'Visual inspection complete', completed: false },
    { id: 2, task: 'Cable continuity tested', completed: false },
    { id: 3, task: 'Driver resistance measured', completed: false },
    { id: 4, task: 'Solder joints inspected', completed: false },
  ])

  // Dialog states
  const [slackDialogOpen, setSlackDialogOpen] = useState(false)
  const [amendDialogOpen, setAmendDialogOpen] = useState(false)
  const [photoUploadDialogOpen, setPhotoUploadDialogOpen] = useState(false)
  const [saveProgressDialogOpen, setSaveProgressDialogOpen] = useState(false)
  const [finishRepairDialogOpen, setFinishRepairDialogOpen] = useState(false)
  const [aiQueryDialogOpen, setAiQueryDialogOpen] = useState(false)
  const [zenMasterDialogOpen, setZenMasterDialogOpen] = useState(false)
  
  // Form states
  const [slackMessage, setSlackMessage] = useState('')
  const [returnToQueueLocation, setReturnToQueueLocation] = useState('')
  const [continueWorkingLater, setContinueWorkingLater] = useState(false)
  const [repairSolution, setRepairSolution] = useState('')
  const [addToAIDatabase, setAddToAIDatabase] = useState(true)
  const [aiQuery, setAiQuery] = useState('')
  const [aiResponse, setAiResponse] = useState('')
  const [isAiLoading, setIsAiLoading] = useState(false)
  const [currentActionId, setCurrentActionId] = useState<string | null>(null)

  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const startTimeRef = useRef<number | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

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

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const handleStartTimer = async () => {
    try {
      // Start timer via API
      const response = await fetch(`/api/repairs/${repair.id}/time/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: 'repair_bench',
          notes: 'Started repair work'
        })
      })

      if (!response.ok) throw new Error('Failed to start timer')
      
      const data = await response.json()
      setCurrentActionId(data.actionId)
      setIsTimerRunning(true)
      
      // Update repair status if not already in progress
      if (repair.status !== 'in_progress') {
        await fetch(`/api/repairs/${repair.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'in_progress' })
        })
      }

      toast({
        title: 'Timer Started',
        description: 'Repair timer is now running'
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to start timer',
        variant: 'destructive'
      })
    }
  }

  const handlePauseTimer = async () => {
    if (!currentActionId) return

    try {
      await fetch(`/api/repairs/${repair.id}/time/stop`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actionId: currentActionId,
          timeSpentMinutes: Math.floor(currentTime / 60),
          notes: repairNotes
        })
      })

      setIsTimerRunning(false)
      setSaveProgressDialogOpen(true)
      
      toast({
        title: 'Timer Paused',
        description: 'Repair timer has been paused'
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to pause timer',
        variant: 'destructive'
      })
    }
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
    try {
      // Stop any running timer
      if (currentActionId && isTimerRunning) {
        await fetch(`/api/repairs/${repair.id}/time/stop`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            actionId: currentActionId,
            timeSpentMinutes: Math.floor(currentTime / 60),
            notes: repairNotes
          })
        })
      }

      // Create repair action for the solution
      await fetch(`/api/repairs/${repair.id}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actionType: 'repair_completed',
          actionDescription: repairSolution,
          technicianName: currentTechnician.name,
          partsUsed: [],
          beforePhotos: [],
          afterPhotos: []
        })
      })

      // Update repair status to testing
      await fetch(`/api/repairs/${repair.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: 'testing',
          totalTimeMinutes: totalTime + Math.floor(currentTime / 60)
        })
      })

      toast({
        title: 'Repair Completed',
        description: `Repair sent to testing. Total time: ${formatTime((totalTime * 60) + currentTime)}`
      })

      setFinishRepairDialogOpen(false)
      router.push('/worker/repairs')
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to complete repair',
        variant: 'destructive'
      })
    }
  }

  const handleSaveProgressConfirm = async () => {
    try {
      setTotalTime(prev => prev + Math.floor(currentTime / 60))
      setCurrentTime(0)
      setSaveProgressDialogOpen(false)
      
      if (!continueWorkingLater && returnToQueueLocation) {
        // Update repair location if returning to queue
        await fetch(`/api/repairs/${repair.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            location: returnToQueueLocation,
            totalTimeMinutes: totalTime + Math.floor(currentTime / 60)
          })
        })

        toast({
          title: 'Repair Returned to Queue',
          description: `Repair moved to ${returnToQueueLocation}`
        })

        router.push('/worker/repairs')
      } else {
        toast({
          title: 'Progress Saved',
          description: 'Repair progress has been saved'
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save progress',
        variant: 'destructive'
      })
    }
  }

  const handleAmendRepair = async () => {
    try {
      if (!additionalFindings.trim()) return

      await fetch(`/api/repairs/${repair.id}/issues`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: 'other',
          specificIssue: additionalFindings,
          severity: 'functional',
          photoUrls: []
        })
      })

      toast({
        title: 'Repair Amended',
        description: 'Additional findings have been added to the repair'
      })

      setAmendDialogOpen(false)
      setAdditionalFindings('')
      router.refresh()
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to amend repair',
        variant: 'destructive'
      })
    }
  }

  const handleSendSlackMessage = async () => {
    try {
      // Here you would integrate with Slack API
      console.log('Sending Slack message:', slackMessage)

      toast({
        title: 'Message Sent',
        description: 'Question sent to Slack channel'
      })

      setSlackMessage('')
      setSlackDialogOpen(false)
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to send Slack message',
        variant: 'destructive'
      })
    }
  }

  const handleAiQuery = async () => {
    if (!aiQuery.trim()) return

    setIsAiLoading(true)
    try {
      // Simulate AI response - in a real app, this would call an API
      await new Promise(resolve => setTimeout(resolve, 1500))

      // Mock response based on the query
      let response = "I don't have specific information about that repair issue yet."

      if (aiQuery.toLowerCase().includes('driver')) {
        response = 
          "Based on our repair database, driver issues are commonly caused by:\n\n" +
          "1. Loose solder joints (42% of cases)\n" +
          "2. Damaged driver diaphragm (28% of cases)\n" +
          "3. Cable connection issues (18% of cases)\n\n" +
          "The most successful repair approach has been to first check continuity, then inspect solder joints under magnification, and finally test the driver with a multimeter before replacement."
      } else if (aiQuery.toLowerCase().includes('cable')) {
        response = 
          "Cable repairs in our database show:\n\n" +
          "1. Most failures occur at the Y-split or connector points\n" +
          "2. Technician Jake has developed a reinforcement technique using heat shrink and flexible adhesive\n" +
          "3. For intermittent connections, resoldering with higher silver content solder has shown 94% success rate"
      }

      setAiResponse(response)
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to get AI response',
        variant: 'destructive'
      })
    } finally {
      setIsAiLoading(false)
    }
  }

  const toggleChecklistItem = (id: number) => {
    setChecklist(prev => prev.map(item => 
      item.id === id ? { ...item, completed: !item.completed } : item
    ))
  }

  const completedTasks = checklist.filter(item => item.completed).length
  const progressPercentage = (completedTasks / checklist.length) * 100

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" onClick={() => router.push('/worker/repairs')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Repairs
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{repair.repair_number}</h1>
            <p className="text-muted-foreground">
              {repair.headphone_model} - {repair.customer_name}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Badge className={repair.priority === 'rush' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}>
            {repair.priority}
          </Badge>
          <Badge variant="secondary">{repair.repair_type}</Badge>
          <Badge variant="outline" className="ml-2">
            <User className="mr-1 h-3 w-3" />
            {currentTechnician.name}
          </Badge>
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
              <div className="text-sm text-muted-foreground">
                Total time: {formatTime((totalTime * 60) + currentTime)}
              </div>
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
              <Button onClick={() => setSaveProgressDialogOpen(true)} variant="outline">
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
                    <div className="font-medium">{repair.original_order_number || 'N/A'}</div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Model</Label>
                    <div className="font-medium">{repair.headphone_model}</div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Wood Type</Label>
                    <div className="font-medium">{repair.wood_type || 'N/A'}</div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Serial Number</Label>
                    <div className="font-medium">{repair.serial_number || 'N/A'}</div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Received Date</Label>
                    <div className="font-medium">{new Date(repair.created_at).toLocaleDateString()}</div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Assigned To</Label>
                    <div className="font-medium">{repair.assigned_employee?.name || 'Unassigned'}</div>
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
                  <div className="font-medium">{repair.customer_name}</div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Email</Label>
                  <div className="font-medium">{repair.customer_email}</div>
                </div>
                {repair.customer_phone && (
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Phone</Label>
                    <div className="font-medium">{repair.customer_phone}</div>
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
                {repair.repair_issues.map((issue, index) => (
                  <div key={issue.id}>
                    <Label className="text-sm font-medium text-muted-foreground">
                      {index === 0 ? 'Original Issue' : `Additional Issue ${index}`}
                    </Label>
                    <div className="mt-1 p-3 bg-gray-50 rounded-md">
                      <p>{issue.specific_issue}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline">{issue.category}</Badge>
                        <Badge 
                          variant="outline" 
                          className={issue.severity === 'cosmetic' ? 'text-blue-600' : 'text-orange-600'}
                        >
                          {issue.severity}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}

                {repair.customer_note && (
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Customer Note</Label>
                    <div className="mt-1 p-3 bg-blue-50 rounded-md">
                      {repair.customer_note}
                    </div>
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
              {checklist.map(item => (
                <div key={item.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`task-${item.id}`}
                    checked={item.completed}
                    onCheckedChange={() => toggleChecklistItem(item.id)}
                  />
                  <label
                    htmlFor={`task-${item.id}`}
                    className={`text-sm ${item.completed ? 'line-through text-muted-foreground' : ''}`}
                  >
                    {item.task}
                  </label>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Diagnosis Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea 
                placeholder="Add detailed diagnosis notes..." 
                rows={4}
                value={repairNotes}
                onChange={(e) => setRepairNotes(e.target.value)}
              />
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
                <Button onClick={() => {
                  toast({
                    title: 'Notes Saved',
                    description: 'Your work notes have been saved'
                  })
                }}>
                  <Save className="mr-2 h-4 w-4" />
                  Save Notes
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Previous Actions */}
          {repair.repair_actions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Previous Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {repair.repair_actions.map(action => (
                    <div key={action.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant="outline">{action.action_type}</Badge>
                        <span className="text-sm text-muted-foreground">
                          {new Date(action.completed_at).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm">{action.action_description}</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        By: {action.technician_name}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
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
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Action Buttons */}
      <div className="flex justify-between">
        <div className="flex space-x-2">
          <Button variant="outline" onClick={() => setSlackDialogOpen(true)}>
            <MessageSquare className="mr-2 h-4 w-4" />
            Ask Question (Slack)
          </Button>
          <Button variant="outline" onClick={() => setAmendDialogOpen(true)}>
            <Edit className="mr-2 h-4 w-4" />
            Amend Repair
          </Button>
        </div>
      </div>

      {/* Slack Dialog */}
      <Dialog open={slackDialogOpen} onOpenChange={setSlackDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Question to Slack</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="slackChannel">Channel</Label>
              <Select defaultValue="repairs">
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

      {/* Amend Repair Dialog */}
      <Dialog open={amendDialogOpen} onOpenChange={setAmendDialogOpen}>
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
                  if (e.key === 'Enter' && aiQuery.trim()) {
                    handleAiQuery()
                  }
                }}
              />
              <Button onClick={handleAiQuery} disabled={!aiQuery.trim() || isAiLoading}>
                <Search className="mr-2 h-4 w-4" />
                {isAiLoading ? 'Searching...' : 'Search'}
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

      {/* Photo Upload Dialog */}
      <Dialog open={photoUploadDialogOpen} onOpenChange={setPhotoUploadDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Photo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="photoUpload">Select Photo</Label>
              <Input 
                id="photoUpload" 
                type="file" 
                accept="image/*" 
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    setSelectedFile(e.target.files[0])
                  }
                }}
                ref={fileInputRef} 
              />
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
              <Button onClick={() => {
                toast({
                  title: 'Photo Uploaded',
                  description: 'Photo has been added to the repair'
                })
                setPhotoUploadDialogOpen(false)
                setSelectedFile(null)
              }} disabled={!selectedFile}>
                Upload
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}