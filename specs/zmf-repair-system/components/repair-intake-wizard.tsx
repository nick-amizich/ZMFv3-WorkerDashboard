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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Upload, Send, ArrowLeft, ArrowRight, X, ImageIcon, Search, CheckCircle, Mail } from "lucide-react"
import type { RepairFormData } from "../types/repair"

type WizardStep = "repair-type" | "shopify-lookup" | "customer-form" | "internal-form"

export default function RepairIntakeWizard() {
  const { createRepair, isLoading } = useRepairContext()
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [currentStep, setCurrentStep] = useState<WizardStep>("repair-type")
  const [formData, setFormData] = useState<RepairFormData>({
    repairSource: "customer",
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
    repairType: "production",
    photos: [],
    builder: "",
    repairNeeded: "",
    additionalNotes: "",
    shopifyOrderId: "",
    isPreFilled: false,
    modelType: "",
    modelWood: "",
    specs: "",
  })

  const [shopifySearch, setShopifySearch] = useState("")
  const [shopifyResults, setShopifyResults] = useState<any[]>([])
  const [searchingShopify, setSearchingShopify] = useState(false)

  // Add new state for customer lookup
  const [customerSearch, setCustomerSearch] = useState("")
  const [customerResults, setCustomerResults] = useState<any[]>([])
  const [searchingCustomers, setSearchingCustomers] = useState(false)
  const [emailDialogOpen, setEmailDialogOpen] = useState(false)
  const [emailMessage, setEmailMessage] = useState("")

  // Mock Shopify orders for demonstration
  const mockShopifyOrders = [
    {
      id: "26851",
      customerName: "John Smith",
      customerEmail: "john@example.com",
      customerPhone: "+1-555-0123",
      model: "Verite Closed",
      woodType: "Sapele",
      orderDate: "2024-01-15",
      status: "fulfilled",
    },
    {
      id: "26849",
      customerName: "Sarah Johnson",
      customerEmail: "sarah@example.com",
      customerPhone: "+1-555-0456",
      model: "Aeolus",
      woodType: "Stabilized",
      orderDate: "2024-01-13",
      status: "fulfilled",
    },
  ]

  // Add mock customer data
  const mockCustomers = [
    {
      id: "1",
      name: "John Smith",
      email: "john@example.com",
      orders: ["26851", "26743"],
      lastOrder: "2024-01-15",
    },
    {
      id: "2",
      name: "Sarah Johnson",
      email: "sarah@example.com",
      orders: ["26849", "26701"],
      lastOrder: "2024-01-13",
    },
    {
      id: "3",
      name: "Mike Wilson",
      email: "mike@example.com",
      orders: ["26820"],
      lastOrder: "2024-01-10",
    },
  ]

  const handleInputChange = (field: keyof RepairFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleRepairTypeSelection = (type: "internal" | "customer") => {
    setFormData((prev) => ({ ...prev, repairSource: type }))
    if (type === "customer") {
      setCurrentStep("shopify-lookup")
    } else {
      setCurrentStep("internal-form")
    }
  }

  const searchShopifyOrders = async () => {
    if (!shopifySearch.trim()) return

    setSearchingShopify(true)
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000))

    const results = mockShopifyOrders.filter(
      (order) =>
        order.id.includes(shopifySearch) ||
        order.customerName.toLowerCase().includes(shopifySearch.toLowerCase()) ||
        order.customerEmail.toLowerCase().includes(shopifySearch.toLowerCase()),
    )

    setShopifyResults(results)
    setSearchingShopify(false)
  }

  const selectShopifyOrder = (order: any) => {
    setFormData((prev) => ({
      ...prev,
      orderNumber: order.id,
      customerName: order.customerName,
      customerEmail: order.customerEmail,
      customerPhone: order.customerPhone,
      model: order.model,
      shopifyOrderId: order.id,
      isPreFilled: true,
    }))
    setCurrentStep("customer-form")
  }

  const skipShopifyLookup = () => {
    setFormData((prev) => ({ ...prev, isPreFilled: false }))
    setCurrentStep("customer-form")
  }

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    if (files.length === 0) return

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
    }
  }

  const removePhoto = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index),
    }))
  }

  const validateForm = (): boolean => {
    if (formData.repairSource === "internal") {
      const required = ["orderNumber", "builder", "repairNeeded", "location", "repairCategory"]
      const missing = required.filter((field) => !formData[field as keyof RepairFormData])

      if (missing.length > 0) {
        toast({
          title: "Validation Error",
          description: `Please fill in: ${missing.join(", ")}`,
          variant: "destructive",
        })
        return false
      }
    } else {
      const required = formData.isPreFilled
        ? ["additionalNotes", "repairCategory", "location"]
        : ["model", "customerName", "customerEmail", "repairCategory", "issueDescription", "location"]

      const missing = required.filter((field) => !formData[field as keyof RepairFormData])

      if (missing.length > 0) {
        toast({
          title: "Validation Error",
          description: `Please fill in: ${missing.join(", ")}`,
          variant: "destructive",
        })
        return false
      }
    }

    return true
  }

  const handleSubmit = async () => {
    if (!validateForm()) return

    try {
      const repair = await createRepair(formData)

      toast({
        title: "Repair Created",
        description: `Repair ${repair.repairNumber} has been created successfully`,
      })

      // Reset form
      setCurrentStep("repair-type")
      setFormData({
        repairSource: "customer",
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
        repairType: "production",
        photos: [],
        builder: "",
        repairNeeded: "",
        additionalNotes: "",
        shopifyOrderId: "",
        isPreFilled: false,
        modelType: "",
        modelWood: "",
        specs: "",
      })
      setShopifySearch("")
      setShopifyResults([])
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create repair",
        variant: "destructive",
      })
    }
  }

  const renderRepairTypeSelection = () => (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="text-center">New Repair Intake</CardTitle>
        <p className="text-center text-muted-foreground">What type of repair are you creating?</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Button
            variant="outline"
            className="h-32 flex flex-col space-y-2 hover:bg-blue-50"
            onClick={() => handleRepairTypeSelection("customer")}
          >
            <div className="text-2xl">👤</div>
            <div className="font-semibold">Customer Repair</div>
            <div className="text-sm text-muted-foreground text-center">
              Repair for a customer return or warranty claim
            </div>
          </Button>

          <Button
            variant="outline"
            className="h-32 flex flex-col space-y-2 hover:bg-green-50"
            onClick={() => handleRepairTypeSelection("internal")}
          >
            <div className="text-2xl">🏭</div>
            <div className="font-semibold">Internal Repair</div>
            <div className="text-sm text-muted-foreground text-center">Internal QC or production repair</div>
          </Button>
        </div>
      </CardContent>
    </Card>
  )

  const renderShopifyLookup = () => (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Link to Shopify Order</CardTitle>
        <p className="text-muted-foreground">Search for an existing order to pre-fill customer information</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex space-x-2">
          <Input
            placeholder="Search by order number, customer name, or email"
            value={shopifySearch}
            onChange={(e) => setShopifySearch(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && searchShopifyOrders()}
          />
          <Button onClick={searchShopifyOrders} disabled={searchingShopify}>
            <Search className="mr-2 h-4 w-4" />
            {searchingShopify ? "Searching..." : "Search"}
          </Button>
        </div>

        {shopifyResults.length > 0 && (
          <div className="space-y-2">
            <Label>Search Results:</Label>
            {shopifyResults.map((order) => (
              <div
                key={order.id}
                className="border rounded-lg p-4 cursor-pointer hover:bg-gray-50"
                onClick={() => selectShopifyOrder(order)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold">Order #{order.id}</div>
                    <div className="text-sm text-muted-foreground">
                      {order.customerName} - {order.model} ({order.woodType})
                    </div>
                    <div className="text-xs text-muted-foreground">{order.customerEmail}</div>
                  </div>
                  <Badge variant="outline">{order.status}</Badge>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-between">
          <Button variant="outline" onClick={() => setCurrentStep("repair-type")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <Button variant="outline" onClick={skipShopifyLookup}>
            Skip - Enter Manually
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )

  // Add customer search function
  const searchCustomers = async () => {
    if (!customerSearch.trim()) return

    setSearchingCustomers(true)
    await new Promise((resolve) => setTimeout(resolve, 800))

    const results = mockCustomers.filter(
      (customer) =>
        customer.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
        customer.email.toLowerCase().includes(customerSearch.toLowerCase()),
    )

    setCustomerResults(results)
    setSearchingCustomers(false)
  }

  const selectCustomer = (customer: any) => {
    setFormData((prev) => ({
      ...prev,
      customerName: customer.name,
      customerEmail: customer.email,
    }))
    setCustomerResults([])
    setCustomerSearch("")
  }

  // Add email sending function
  const sendEmailToCustomer = async () => {
    if (!emailMessage.trim() || !formData.customerEmail) return

    try {
      // Simulate email sending
      await new Promise((resolve) => setTimeout(resolve, 1000))

      toast({
        title: "Email Sent",
        description: `Message sent to ${formData.customerEmail}`,
      })

      setEmailMessage("")
      setEmailDialogOpen(false)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send email",
        variant: "destructive",
      })
    }
  }

  const renderCustomerForm = () => (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Customer Repair Form</h1>
        {formData.isPreFilled && (
          <Badge className="bg-green-100 text-green-800">
            <CheckCircle className="mr-1 h-3 w-3" />
            Pre-filled from Shopify
          </Badge>
        )}
      </div>

      {formData.isPreFilled ? (
        <Card>
          <CardHeader>
            <CardTitle>Order Information</CardTitle>
            <p className="text-muted-foreground">Information automatically filled from Shopify order</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Order Number</Label>
                <div className="font-medium">{formData.orderNumber}</div>
              </div>
              <div>
                <Label>Model</Label>
                <div className="font-medium">{formData.model}</div>
              </div>
              <div>
                <Label>Customer Name</Label>
                <div className="font-medium">{formData.customerName}</div>
              </div>
              <div>
                <Label>Email</Label>
                <div className="font-medium">{formData.customerEmail}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Customer Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="orderNumber">Order Number (Optional)</Label>
                <Input
                  id="orderNumber"
                  value={formData.orderNumber}
                  onChange={(e) => handleInputChange("orderNumber", e.target.value)}
                  placeholder="Enter order number if available"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customerName">Customer Name *</Label>
                <div className="flex space-x-2">
                  <Input
                    id="customerName"
                    value={formData.customerName}
                    onChange={(e) => handleInputChange("customerName", e.target.value)}
                    placeholder="Customer name"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCustomerSearch(formData.customerName)}
                    disabled={!formData.customerName}
                  >
                    <Search className="h-4 w-4" />
                  </Button>
                </div>

                {/* Customer Search */}
                {formData.customerName && !formData.customerEmail && (
                  <div className="space-y-2">
                    <div className="flex space-x-2">
                      <Input
                        placeholder="Search existing customers..."
                        value={customerSearch}
                        onChange={(e) => setCustomerSearch(e.target.value)}
                        onKeyPress={(e) => e.key === "Enter" && searchCustomers()}
                      />
                      <Button onClick={searchCustomers} disabled={searchingCustomers} size="sm">
                        {searchingCustomers ? "Searching..." : "Search"}
                      </Button>
                    </div>

                    {customerResults.length > 0 && (
                      <div className="border rounded-lg max-h-32 overflow-y-auto">
                        {customerResults.map((customer) => (
                          <div
                            key={customer.id}
                            className="p-2 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                            onClick={() => selectCustomer(customer)}
                          >
                            <div className="font-medium">{customer.name}</div>
                            <div className="text-sm text-muted-foreground">{customer.email}</div>
                            <div className="text-xs text-muted-foreground">
                              Last order: {customer.lastOrder} | {customer.orders.length} orders
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="customerEmail">Email *</Label>
                  {formData.customerEmail && (
                    <Button type="button" variant="outline" size="sm" onClick={() => setEmailDialogOpen(true)}>
                      <Mail className="mr-1 h-3 w-3" />
                      Email Customer
                    </Button>
                  )}
                </div>
                <Input
                  id="customerEmail"
                  type="email"
                  value={formData.customerEmail}
                  onChange={(e) => handleInputChange("customerEmail", e.target.value)}
                  placeholder="customer@email.com"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Product Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                  <SelectItem value="Caldera Closed">Caldera Closed</SelectItem>
                  <SelectItem value="Caldera Open">Caldera Open</SelectItem>
                  <SelectItem value="Bokeh Closed">Bokeh Closed</SelectItem>
                  <SelectItem value="Bokeh Open">Bokeh Open</SelectItem>
                  <SelectItem value="Aeolus">Aeolus</SelectItem>
                  <SelectItem value="Ori 3.0">Ori 3.0</SelectItem>
                  <SelectItem value="Atticus">Atticus</SelectItem>
                  <SelectItem value="Eikon">Eikon</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="modelWood">Wood Type</Label>
              <Input
                id="modelWood"
                value={formData.modelWood || ""}
                onChange={(e) => handleInputChange("modelWood", e.target.value)}
                placeholder="Enter wood type (e.g., Sapele, Cherry, Stabilized)"
                list="wood-types"
              />
              <datalist id="wood-types">
                <option value="Sapele" />
                <option value="Cherry" />
                <option value="Stabilized" />
                <option value="Ash" />
                <option value="Walnut" />
                <option value="Padauk" />
                <option value="Cocobolo" />
                <option value="Ziricote" />
              </datalist>
            </div>
            <div>
              <Label htmlFor="specs">Specifications</Label>
              <Input
                id="specs"
                value={formData.specs || ""}
                onChange={(e) => handleInputChange("specs", e.target.value)}
                placeholder="e.g., 300 ohm, special finish"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Issue Description */}
      <Card>
        <CardHeader>
          <CardTitle>{formData.isPreFilled ? "Additional Information" : "Issue Description"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            <div>
              <Label htmlFor="location">Location *</Label>
              <Select value={formData.location} onValueChange={(value) => handleInputChange("location", value)}>
                <SelectTrigger>
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

          <div>
            <Label htmlFor="issueDescription">
              {formData.isPreFilled ? "Additional Intake Notes *" : "Issue Description *"}
            </Label>
            <Textarea
              id="issueDescription"
              value={formData.issueDescription}
              onChange={(e) => handleInputChange("issueDescription", e.target.value)}
              placeholder={
                formData.isPreFilled ? "Add any additional notes about the issue..." : "Describe the issue in detail..."
              }
              rows={4}
            />
          </div>

          {!formData.isPreFilled && (
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
          )}
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={() => setCurrentStep("shopify-lookup")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button onClick={handleSubmit} disabled={isLoading}>
          <Send className="mr-2 h-4 w-4" />
          {isLoading ? "Submitting..." : "Submit Repair"}
        </Button>
      </div>
    </div>
  )

  const renderInternalForm = () => (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold">Internal Repair Form</h1>

      <Card>
        <CardHeader>
          <CardTitle>Internal Repair Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
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
              <Label htmlFor="builder">Builder *</Label>
              <Input
                id="builder"
                value={formData.builder}
                onChange={(e) => handleInputChange("builder", e.target.value)}
                placeholder="Who built this unit?"
              />
            </div>
            <div>
              <Label htmlFor="repairNeeded">Repair Needed *</Label>
              <Textarea
                id="repairNeeded"
                value={formData.repairNeeded}
                onChange={(e) => handleInputChange("repairNeeded", e.target.value)}
                placeholder="Describe what repair is needed..."
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="location">Location *</Label>
              <Select value={formData.location} onValueChange={(value) => handleInputChange("location", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Where is the headphone located?" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="repair_wall">Repair Wall</SelectItem>
                  <SelectItem value="repair_shelves">Repair Shelves</SelectItem>
                  <SelectItem value="qc_room">QC Room</SelectItem>
                  <SelectItem value="in_repair">In Repair</SelectItem>
                  <SelectItem value="finishing_area">Finishing Area</SelectItem>
                  <SelectItem value="shipping">Shipping</SelectItem>
                  <SelectItem value="production">Production Floor</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="repairCategory">Repair Category *</Label>
              <Input
                id="repairCategory"
                value={formData.repairCategory}
                onChange={(e) => handleInputChange("repairCategory", e.target.value)}
                placeholder="Select or type repair category for queue assignment"
                list="repair-categories-internal"
              />
              <datalist id="repair-categories-internal">
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
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={() => setCurrentStep("repair-type")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button onClick={handleSubmit} disabled={isLoading}>
          <Send className="mr-2 h-4 w-4" />
          {isLoading ? "Submitting..." : "Submit Internal Repair"}
        </Button>
      </div>
    </div>
  )

  return (
    <div className="p-6">
      {currentStep === "repair-type" && renderRepairTypeSelection()}
      {currentStep === "shopify-lookup" && renderShopifyLookup()}
      {currentStep === "customer-form" && renderCustomerForm()}
      {currentStep === "internal-form" && renderInternalForm()}
      <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Send Email to Customer</DialogTitle>
            <p className="text-muted-foreground">
              Send a message to {formData.customerName} ({formData.customerEmail})
            </p>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="emailSubject">Subject</Label>
              <Input
                id="emailSubject"
                value="Question about your repair - ZMF Headphones"
                readOnly
                className="bg-gray-50"
              />
            </div>
            <div>
              <Label htmlFor="emailMessage">Message</Label>
              <Textarea
                id="emailMessage"
                value={emailMessage}
                onChange={(e) => setEmailMessage(e.target.value)}
                placeholder="Hi [Customer Name], I have a question about your repair..."
                rows={6}
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setEmailDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={sendEmailToCustomer} disabled={!emailMessage.trim()}>
                <Send className="mr-2 h-4 w-4" />
                Send Email
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
