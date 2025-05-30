"use client"

import { useState, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { Upload, Save, Send, Lightbulb, X, ImageIcon, User, Building2 } from "lucide-react"
import { useRouter } from "next/navigation"
import type { CreateRepairInput } from "@/types/repairs"

export default function RepairIntakeForm() {
  const { toast } = useToast()
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [uploadingPhotos, setUploadingPhotos] = useState(false)
  const [currentStep, setCurrentStep] = useState<'selection' | 'form'>('selection')
  const [repairSource, setRepairSource] = useState<'customer' | 'internal'>('customer')

  const [formData, setFormData] = useState<Partial<CreateRepairInput>>({
    orderNumber: "",
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    model: "",
    serialNumber: "",
    woodType: "",
    repairType: "production",
    priority: "standard",
    repairSource: "customer",
    orderType: "customer_return",
    customerNote: "",
    location: "Repair Wall",
    issues: []
  })

  const [selectedIssues, setSelectedIssues] = useState<string[]>([])
  const [issueDetails, setIssueDetails] = useState("")
  const [photos, setPhotos] = useState<File[]>([])

  const commonIssues = [
    "Driver Failure",
    "Cable Issue",
    "Wood Damage",
    "Gimbal",
    "Headband",
    "Metal Finish",
    "Electronics",
    "Other",
  ]

  const headphoneModels = [
    "Verite Closed",
    "Verite Open",
    "Atrium Closed",
    "Atrium Open",
    "Aeolus",
    "Eikon",
    "Auteur",
    "Blackwood"
  ]

  const handleInputChange = (field: keyof CreateRepairInput, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const toggleIssue = (issue: string) => {
    setSelectedIssues((prev) => 
      prev.includes(issue) ? prev.filter((i) => i !== issue) : [...prev, issue]
    )
  }

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    if (files.length === 0) return

    setUploadingPhotos(true)
    try {
      setPhotos(prev => [...prev, ...files])
      toast({
        title: "Photos Added",
        description: `${files.length} photo(s) added successfully`,
      })
    } catch (error) {
      toast({
        title: "Upload Error",
        description: "Failed to add photos",
        variant: "destructive",
      })
    } finally {
      setUploadingPhotos(false)
    }
  }

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index))
  }

  const getAISuggestion = () => {
    const description = issueDetails.toLowerCase()

    if (description.includes("driver") && description.includes("cutting")) {
      return {
        suggestion: 'Based on "driver cutting out", check:',
        items: [
          "• Cable connection at cup (80% of similar issues)",
          "• Solder joint integrity (15% of similar issues)",
        ],
      }
    }

    if (description.includes("cable") && (description.includes("loose") || description.includes("disconnect"))) {
      return {
        suggestion: "Based on cable issues, check:",
        items: ["• XLR connector pins (65% of cable issues)", "• Cable strain relief (25% of cable issues)"],
      }
    }

    if (description.includes("wood") && (description.includes("crack") || description.includes("split"))) {
      return {
        suggestion: "Based on wood damage, consider:",
        items: ["• Wood glue repair for minor cracks", "• Wood cup replacement for major damage"],
      }
    }

    return null
  }

  const validateForm = (): boolean => {
    // Only validate customer fields for customer repairs
    if (repairSource === 'customer') {
      if (!formData.customerName?.trim()) {
        toast({
          title: "Validation Error",
          description: "Customer name is required",
          variant: "destructive",
        })
        return false
      }

      if (!formData.customerEmail?.trim()) {
        toast({
          title: "Validation Error",
          description: "Customer email is required",
          variant: "destructive",
        })
        return false
      }
    }

    if (!formData.model) {
      toast({
        title: "Validation Error",
        description: "Model is required",
        variant: "destructive",
      })
      return false
    }

    if (selectedIssues.length === 0 && !issueDetails.trim()) {
      toast({
        title: "Validation Error",
        description: "Please select at least one issue or describe the problem",
        variant: "destructive",
      })
      return false
    }

    return true
  }

  const handleSaveDraft = () => {
    localStorage.setItem("repairDraft", JSON.stringify({ formData, selectedIssues, issueDetails }))
    toast({
      title: "Draft Saved",
      description: "Your repair form has been saved as a draft",
    })
  }

  const handleSubmit = async () => {
    if (!validateForm()) return

    setIsLoading(true)
    try {
      // Build issues array
      const issues: CreateRepairInput['issues'] = []
      
      // Add selected common issues
      selectedIssues.forEach(issue => {
        issues.push({
          category: issue.toLowerCase().replace(" ", "_"),
          specificIssue: issue,
          severity: 'functional' // Default, can be enhanced later
        })
      })
      
      // Add custom issue description if provided
      if (issueDetails.trim()) {
        issues.push({
          category: 'other',
          specificIssue: issueDetails,
          severity: 'functional'
        })
      }

      const repairData: CreateRepairInput = {
        ...formData as CreateRepairInput,
        repairSource,
        // For internal repairs, set default customer info
        customerName: repairSource === 'internal' ? 'Internal Repair' : formData.customerName || '',
        customerEmail: repairSource === 'internal' ? 'internal@zmfheadphones.com' : formData.customerEmail || '',
        orderType: repairSource === 'internal' ? 'internal_qc' : (formData.orderType || 'customer_return'),
        issues
      }

      const response = await fetch('/api/repairs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(repairData)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create repair')
      }

      const { repair } = await response.json()

      toast({
        title: "Repair Created",
        description: `Repair ${repair.repair_number} has been created successfully`,
      })

      // Clear draft
      localStorage.removeItem("repairDraft")
      
      // Redirect to repairs dashboard
      router.push('/worker/repairs')
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create repair",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const loadDraft = () => {
    const saved = localStorage.getItem("repairDraft")
    if (saved) {
      const { formData: savedForm, selectedIssues: savedIssues, issueDetails: savedDetails } = JSON.parse(saved)
      setFormData(savedForm)
      setSelectedIssues(savedIssues || [])
      setIssueDetails(savedDetails || "")
      toast({
        title: "Draft Loaded",
        description: "Your saved draft has been loaded",
      })
    }
  }

  const aiSuggestion = getAISuggestion()

  if (currentStep === 'selection') {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2">New Repair Intake</h1>
          <p className="text-gray-600">What type of repair are you creating?</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
          {/* Customer Repair */}
          <Card 
            className="cursor-pointer hover:shadow-lg transition-shadow border-2 hover:border-blue-500"
            onClick={() => {
              setRepairSource('customer')
              setCurrentStep('form')
            }}
          >
            <CardContent className="p-8 text-center">
              <User className="h-12 w-12 mx-auto mb-4 text-blue-600" />
              <h3 className="text-xl font-semibold mb-2">Customer Repair</h3>
              <p className="text-gray-600">Repair for a customer return or warranty claim</p>
            </CardContent>
          </Card>

          {/* Internal Repair */}
          <Card 
            className="cursor-pointer hover:shadow-lg transition-shadow border-2 hover:border-blue-500"
            onClick={() => {
              setRepairSource('internal')
              setCurrentStep('form')
            }}
          >
            <CardContent className="p-8 text-center">
              <Building2 className="h-12 w-12 mx-auto mb-4 text-blue-600" />
              <h3 className="text-xl font-semibold mb-2">Internal Repair</h3>
              <p className="text-gray-600">Internal QC or production repair</p>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Button 
            variant="ghost" 
            onClick={() => setCurrentStep('selection')}
            className="mb-2"
          >
            ← Back to Selection
          </Button>
          <h1 className="text-3xl font-bold">
            New {repairSource === 'customer' ? 'Customer' : 'Internal'} Repair
          </h1>
        </div>
        <div className="flex space-x-2">
          {localStorage.getItem("repairDraft") && (
            <Button variant="outline" onClick={loadDraft}>
              <Save className="mr-2 h-4 w-4" />
              Load Draft
            </Button>
          )}
          <Button variant="outline" onClick={handleSaveDraft}>
            <Save className="mr-2 h-4 w-4" />
            Save Draft
          </Button>
        </div>
      </div>

      {/* Customer Information - Only for customer repairs */}
      {repairSource === 'customer' && (
        <Card>
          <CardHeader>
            <CardTitle>Customer Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="orderNumber">Order Number</Label>
              <Input
                id="orderNumber"
                value={formData.orderNumber}
                onChange={(e) => handleInputChange("orderNumber", e.target.value)}
                placeholder="Original order number (optional)"
              />
            </div>
            <div>
              <Label htmlFor="customerName">Customer Name *</Label>
              <Input
                id="customerName"
                value={formData.customerName}
                onChange={(e) => handleInputChange("customerName", e.target.value)}
                placeholder="Customer name"
                required
              />
            </div>
            <div>
              <Label htmlFor="customerEmail">Email *</Label>
              <Input
                id="customerEmail"
                type="email"
                value={formData.customerEmail}
                onChange={(e) => handleInputChange("customerEmail", e.target.value)}
                placeholder="customer@email.com"
                required
              />
            </div>
            <div>
              <Label htmlFor="customerPhone">Phone</Label>
              <Input
                id="customerPhone"
                value={formData.customerPhone}
                onChange={(e) => handleInputChange("customerPhone", e.target.value)}
                placeholder="Phone number"
              />
            </div>
          </div>
        </CardContent>
        </Card>
      )}

      {/* Product Information */}
      <Card>
        <CardHeader>
          <CardTitle>Product Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="model">Model *</Label>
              <Select value={formData.model} onValueChange={(value) => handleInputChange("model", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select model" />
                </SelectTrigger>
                <SelectContent>
                  {headphoneModels.map(model => (
                    <SelectItem key={model} value={model}>{model}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="serialNumber">Serial Number</Label>
              <Input
                id="serialNumber"
                value={formData.serialNumber}
                onChange={(e) => handleInputChange("serialNumber", e.target.value)}
                placeholder="Serial number (if available)"
              />
            </div>
            <div>
              <Label htmlFor="woodType">Wood Type</Label>
              <Input
                id="woodType"
                value={formData.woodType}
                onChange={(e) => handleInputChange("woodType", e.target.value)}
                placeholder="e.g., Sapele, Cherry, Stabilized"
              />
            </div>
            <div>
              <Label htmlFor="repairType">Repair Type *</Label>
              <Select value={formData.repairType} onValueChange={(value) => handleInputChange("repairType", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select repair type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="production">Production Repair</SelectItem>
                  <SelectItem value="finishing">Finishing Repair</SelectItem>
                  <SelectItem value="sonic">Sonic Repair</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="priority">Priority</Label>
              <Select value={formData.priority} onValueChange={(value) => handleInputChange("priority", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">Standard</SelectItem>
                  <SelectItem value="rush">Rush</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => handleInputChange("location", e.target.value)}
                placeholder="e.g., Repair Wall, Bench 1"
              />
            </div>
          </div>

          {/* Photo Upload */}
          <div>
            <Label>Product Photos</Label>
            <div className="mt-2 space-y-4">
              <div
                className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="mx-auto h-12 w-12 text-gray-400" />
                <div className="mt-4">
                  <p className="text-gray-600">Click to upload photos or drag and drop</p>
                  <p className="text-sm text-gray-500">PNG, JPG up to 10MB each</p>
                </div>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
                disabled={uploadingPhotos}
              />

              {/* Photo Preview */}
              {photos.length > 0 && (
                <div className="grid grid-cols-3 gap-4">
                  {photos.map((photo, index) => (
                    <div key={index} className="relative">
                      <div className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center">
                        <ImageIcon className="h-8 w-8 text-gray-400" />
                      </div>
                      <button
                        onClick={() => removePhoto(index)}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600"
                        type="button"
                      >
                        <X className="h-3 w-3" />
                      </button>
                      <p className="text-xs text-gray-500 mt-1 truncate">{photo.name}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Issue Description */}
      <Card>
        <CardHeader>
          <CardTitle>Issue Description</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Quick Select (Common Issues)</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {commonIssues.map((issue) => (
                <Badge
                  key={issue}
                  variant={selectedIssues.includes(issue) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => toggleIssue(issue)}
                >
                  {issue}
                </Badge>
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="issueDescription">Detailed Description</Label>
            <Textarea
              id="issueDescription"
              value={issueDetails}
              onChange={(e) => setIssueDetails(e.target.value)}
              placeholder="Describe the issue in detail..."
              rows={4}
            />
          </div>

          <div>
            <Label htmlFor="customerNote">Customer Note (Optional)</Label>
            <Textarea
              id="customerNote"
              value={formData.customerNote}
              onChange={(e) => handleInputChange("customerNote", e.target.value)}
              placeholder="Any specific instructions or notes from the customer..."
              rows={3}
            />
          </div>

          {aiSuggestion && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start space-x-2">
                <Lightbulb className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <div className="font-medium text-blue-900">🤖 AI Suggestion</div>
                  <div className="text-blue-800 mt-1">{aiSuggestion.suggestion}</div>
                  <div className="text-blue-700 mt-2 space-y-1">
                    {aiSuggestion.items.map((item, index) => (
                      <div key={index} className="text-sm">
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <div className="space-x-2">
          <Button variant="outline" onClick={handleSaveDraft} disabled={isLoading}>
            <Save className="mr-2 h-4 w-4" />
            Save as Draft
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading || uploadingPhotos}>
            <Send className="mr-2 h-4 w-4" />
            {isLoading ? "Submitting..." : "Submit for Diagnosis"}
          </Button>
        </div>
      </div>
    </div>
  )
}