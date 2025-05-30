"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card } from "@/components/ui/card"
import { Mail, Send, AlertCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import type { RepairOrder } from "@/types/repair"

interface EmailNotificationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  repair: RepairOrder | null
  onSend: (repairId: string, subject: string, message: string, templateType: string) => Promise<boolean>
  isLoading: boolean
}

export function EmailNotificationDialog({
  open,
  onOpenChange,
  repair,
  onSend,
  isLoading,
}: EmailNotificationDialogProps) {
  const { toast } = useToast()
  const [subject, setSubject] = useState("")
  const [message, setMessage] = useState("")
  const [templateType, setTemplateType] = useState("status_update")
  const [activeTab, setActiveTab] = useState("compose")

  // Reset form when dialog opens or repair changes
  useEffect(() => {
    if (open && repair) {
      // Set default subject based on repair status
      setSubject(`Update on your ZMF repair #${repair.repairNumber}`)

      // Set default message based on template type
      updateMessageTemplate(templateType)
    }
  }, [open, repair, templateType])

  const updateMessageTemplate = (template: string) => {
    if (!repair) return

    let newMessage = ""

    switch (template) {
      case "status_update":
        newMessage = `Dear ${repair.customerName},

We wanted to let you know that your ${repair.model} headphones (repair #${repair.repairNumber}) have been updated to status: ${repair.status.replace("_", " ")}.

${getStatusSpecificMessage(repair.status)}

If you have any questions, please don't hesitate to contact us.

Best regards,
The ZMF Team`
        break

      case "repair_complete":
        newMessage = `Dear ${repair.customerName},

Great news! Your ${repair.model} headphones (repair #${repair.repairNumber}) have been successfully repaired and are ready to ship.

We've completed all necessary work and performed our quality control checks. Your headphones are now ready to be returned to you.

You can expect to receive a shipping notification with tracking information shortly.

Thank you for your patience throughout this process.

Best regards,
The ZMF Team`
        break

      case "repair_diagnosed":
        newMessage = `Dear ${repair.customerName},

We've completed our diagnosis of your ${repair.model} headphones (repair #${repair.repairNumber}).

Our technicians have identified the following issues:
${repair.issues.map((issue) => `- ${issue.specificIssue}`).join("\n")}

${repair.estimatedCost ? `The estimated cost for this repair is $${repair.estimatedCost.toFixed(2)}.` : ""}

Please let us know if you'd like to proceed with the repair.

Best regards,
The ZMF Team`
        break

      case "custom":
        // Keep existing message for custom template
        return

      default:
        newMessage = ""
    }

    setMessage(newMessage)
    setTemplateType(template)
  }

  const getStatusSpecificMessage = (status: string) => {
    switch (status) {
      case "intake":
        return "We've received your headphones and they're currently in our intake process. We'll begin diagnosis soon."
      case "diagnosed":
        return "We've completed our diagnosis and determined what repairs are needed. We'll be in touch about next steps."
      case "approved":
        return "Your repair has been approved and is now in our queue. We'll begin work shortly."
      case "in_progress":
        return "Your repair is actively being worked on by our technicians."
      case "testing":
        return "Your repair is complete and is now in our quality control testing phase."
      case "completed":
        return "Your repair is complete and has passed our quality control checks. It will be shipped soon."
      case "shipped":
        return "Your repaired headphones have been shipped back to you."
      default:
        return ""
    }
  }

  const handleSend = async () => {
    if (!repair) return

    if (!subject.trim()) {
      toast({
        title: "Subject Required",
        description: "Please enter an email subject",
        variant: "destructive",
      })
      return
    }

    if (!message.trim()) {
      toast({
        title: "Message Required",
        description: "Please enter an email message",
        variant: "destructive",
      })
      return
    }

    try {
      const success = await onSend(repair.id, subject, message, templateType)
      if (success) {
        toast({
          title: "Email Sent",
          description: `Notification sent to ${repair.customerEmail}`,
        })
        onOpenChange(false)
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send email notification",
        variant: "destructive",
      })
    }
  }

  if (!repair) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email Customer: {repair.customerName}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="compose">Compose Email</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
          </TabsList>

          <TabsContent value="compose" className="space-y-4 py-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="recipient">Recipient</Label>
                <Input id="recipient" value={repair.customerEmail} disabled className="bg-gray-50" />
              </div>

              <div>
                <Label htmlFor="template">Email Template</Label>
                <Select value={templateType} onValueChange={updateMessageTemplate}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select template" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="status_update">Status Update</SelectItem>
                    <SelectItem value="repair_complete">Repair Complete</SelectItem>
                    <SelectItem value="repair_diagnosed">Repair Diagnosed</SelectItem>
                    <SelectItem value="custom">Custom Message</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="subject">Subject</Label>
                <Input
                  id="subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Email subject"
                />
              </div>

              <div>
                <Label htmlFor="message">Message</Label>
                <Textarea
                  id="message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Enter your message to the customer"
                  className="min-h-[200px]"
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="preview" className="py-4">
            <Card className="p-6 border rounded-lg bg-white">
              <div className="space-y-4">
                <div className="border-b pb-2">
                  <div className="text-sm text-gray-500">From: ZMF Headphones &lt;repairs@zmfheadphones.com&gt;</div>
                  <div className="text-sm text-gray-500">
                    To: {repair.customerName} &lt;{repair.customerEmail}&gt;
                  </div>
                  <div className="text-sm text-gray-500">Subject: {subject}</div>
                </div>

                <div className="whitespace-pre-wrap">{message}</div>

                <div className="border-t pt-4 text-sm text-gray-500">
                  <p>ZMF Headphones</p>
                  <p>www.zmfheadphones.com</p>
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <div className="flex items-center text-sm text-amber-600 mr-auto">
            <AlertCircle className="h-4 w-4 mr-1" />
            This will send a real email to the customer
          </div>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={isLoading} className="gap-1">
            <Send className="h-4 w-4" />
            Send Email
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
