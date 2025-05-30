"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { useRepairContext } from "../contexts/repair-context"
import { Upload, Save, Send, Lightbulb, X, ImageIcon } from "lucide-react"
import type { RepairFormData } from "../types/repair"

export default function RepairIntakeForm() {
  const { createRepair, isLoading, uploadPhoto } = useRepairContext()
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [formData, setFormData] = useState<RepairFormData>({
    orderNumber: "",
    buildId: "",
    model: "",
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    repairCategory: "",
    issueDescription: "",
    location: "",
    priority: "standard" as "standard" | "rush",
    repairType: "production" as "production" | "finishing",
    photos: [],
  })

  const [selectedIssues, setSelectedIssues] = useState<string[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [uploadingPhotos, setUploadingPhotos] = useState(false)
  const [draft, setDraft] = useState(false)

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

  const repairCategories = [
    { value: "driver", label: "Driver Issue" },
    { value: "cable", label: "Cable Problem" },
    { value: "wood_finish", label: "Wood Damage" },
    { value: "metal_finish", label: "Metal Finish" },
    { value: "gimbal", label: "Gimbal Issue" },
    { value: "headband", label: "Headband Problem" },
    { value: "electronics", label: "Electronics" },
    { value: "other", label: "Other" },
  ]

  const handleInputChange = (field: keyof RepairFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const toggleIssue = (issue: string) => {
    setSelectedIssues((prev) => (prev.includes(issue) ? prev.filter((i) => i !== issue) : [...prev, issue]))
  }

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    if (files.length === 0) return

    setUploadingPhotos(true)
    try {
      const newPhotos = [...formData.photos, ...files]
      setFormData((prev) => ({ ...prev, photos: newPhotos }))

      toast({
        title: "Photos Added",
        description: `${files.length} photo(s) added successfully`,
      })
    } catch (error) {
      toast({
        title: "Upload Error",
        description: "Failed to upload photos",
        variant: "destructive",
      })
    } finally {
      setUploadingPhotos(false)
    }
  }

  const removePhoto = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index),
    }))
  }

  const getAISuggestion = () => {
    const description = formData.issueDescription.toLowerCase()

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
    const required = [
      "orderNumber",
      "model",
      "customerName",
      "customerEmail",
      "repairCategory",
      "issueDescription",
      "location",
      "repairType",
    ]
    const missing = required.filter((field) => !formData[field as keyof RepairFormData])

    if (missing.length > 0) {
      toast({
        title: "Validation Error",
        description: `Please fill in: ${missing.join(", ")}`,
        variant: "destructive",
      })
      return false
    }

    return true
  }

  const handleSaveDraft = () => {
    setDraft(true)
    localStorage.setItem("repairDraft", JSON.stringify(formData))
    toast({
      title: "Draft Saved",
      description: "Your repair form has been saved as a draft",
    })
  }

  const handleSubmit = async () => {
    if (!validateForm()) return

    try {
      const repair = await createRepair(formData)

      toast({
        title: "Repair Created",
        description: `Repair ${repair.repairNumber} has been created successfully`,
      })

      // Clear form
      setFormData({
        orderNumber: "",
        buildId: "",
        model: "",
        customerName: "",
        customerEmail: "",
        customerPhone: "",
        repairCategory: "",
        issueDescription: "",
        location: "",
        priority: "standard",
        repairType: "production",
        photos: [],
      })
      setSelectedIssues([])
      localStorage.removeItem("repairDraft")
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create repair",
        variant: "destructive",
      })
    }
  }

  const loadDraft = () => {
    const saved = localStorage.getItem("repairDraft")
    if (saved) {
      setFormData(JSON.parse(saved))
      setDraft(false)
      toast({
        title: "Draft Loaded",
        description: "Your saved draft has been loaded",
      })
    }
  }

  const aiSuggestion = getAISuggestion()

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">New Repair Intake</h1>
        <div className="flex space-x-2">
          {draft && (
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

      {/* Customer Information */}
      <Card>
        <CardHeader>
          <CardTitle>Customer Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="orderNumber">Order Number *</Label>
              <Input
                id="orderNumber"
                value={formData.orderNumber}
                onChange={(e) => handleInputChange("orderNumber", e.target.value)}
                placeholder="Enter order number"
              />
            </div>
            <div>
              <Label htmlFor="buildId">Build ID</Label>
              <Input
                id="buildId"
                value={formData.buildId}
                onChange={(e) => handleInputChange("buildId", e.target.value)}
                placeholder="Enter build ID"
              />
            </div>
            <div>
              <Label htmlFor="customerName">Customer Name *</Label>
              <Input
                id="customerName"
                value={formData.customerName}
                onChange={(e) => handleInputChange("customerName", e.target.value)}
                placeholder="Customer name"
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
          </div>
        </CardContent>
      </Card>

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
                  <SelectItem value="Verite Closed">Verite Closed</SelectItem>
                  <SelectItem value="Verite Open">Verite Open</SelectItem>
                  <SelectItem value="Atrium Closed">Atrium Closed</SelectItem>
                  <SelectItem value="Atrium Open">Atrium Open</SelectItem>
                  <SelectItem value="Aeolus">Aeolus</SelectItem>
                  <SelectItem value="Eikon">Eikon</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="location">Location *</Label>
              <Select value={formData.location} onValueChange={(value) => handleInputChange("location", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="workshop">Workshop</SelectItem>
                  <SelectItem value="qc">Quality Control</SelectItem>
                  <SelectItem value="shipping">Shipping</SelectItem>
                  <SelectItem value="customer_return">Customer Return</SelectItem>
                </SelectContent>
              </Select>
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
                </SelectContent>
              </Select>
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
              />

              {/* Photo Preview */}
              {formData.photos.length > 0 && (
                <div className="grid grid-cols-3 gap-4">
                  {formData.photos.map((photo, index) => (
                    <div key={index} className="relative">
                      <div className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center">
                        <ImageIcon className="h-8 w-8 text-gray-400" />
                      </div>
                      <button
                        onClick={() => removePhoto(index)}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center"
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
            <Label htmlFor="repairCategory">Repair Category *</Label>
            <Input
              id="repairCategory"
              value={formData.repairCategory}
              onChange={(e) => handleInputChange("repairCategory", e.target.value)}
              placeholder="Select or type repair category"
              list="repair-categories"
            />
            <datalist id="repair-categories">
              <option value="Driver Issue" />
              <option value="Cable Problem" />
              <option value="Wood Damage" />
              <option value="Metal Finish" />
              <option value="Gimbal Issue" />
              <option value="Headband Problem" />
              <option value="Electronics" />
              <option value="Other" />
            </datalist>
          </div>

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
            <Label htmlFor="issueDescription">Detailed Description *</Label>
            <Textarea
              id="issueDescription"
              value={formData.issueDescription}
              onChange={(e) => handleInputChange("issueDescription", e.target.value)}
              placeholder="Describe the issue in detail..."
              rows={4}
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
        <Button variant="outline" onClick={() => window.history.back()}>
          Cancel
        </Button>
        <div className="space-x-2">
          <Button variant="outline" onClick={handleSaveDraft}>
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
