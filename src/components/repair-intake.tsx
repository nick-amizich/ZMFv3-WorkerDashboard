"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Upload } from "lucide-react"
import { MagnifyingGlassIcon } from "@radix-ui/react-icons"

export default function RepairIntake() {
  const [selectedModel, setSelectedModel] = useState("")
  const [repairCategory, setRepairCategory] = useState("")
  const [searchTerm, setSearchTerm] = useState("")

  const modelGroups = [
    { name: "Aeolus", count: 5, color: "bg-purple-600" },
    { name: "Aeolus Ash", count: 6, color: "bg-blue-600" },
    { name: "Aeolus LTD Ash", count: 1, color: "bg-green-600" },
    { name: "Aeolus Stabilized", count: 3, color: "bg-orange-600" },
    { name: "Atrium", count: 311, color: "bg-purple-600" },
    { name: "Atrium Closed", count: 1, color: "bg-green-600" },
    { name: "Atrium Open", count: 8, color: "bg-blue-600" },
  ]

  const repairCategories = [
    "Driver Issue",
    "Cable Problem",
    "Wood Damage",
    "Metal Finish",
    "Gimbal Issue",
    "Headband Problem",
    "Electronics",
    "Other",
  ]

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 p-4">
        <h1 className="text-xl font-semibold">Repair Needed Form</h1>
      </div>

      <div className="flex">
        {/* Main Form */}
        <div className="flex-1 p-6">
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-6 space-y-6">
              {/* Order and Build Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="orderNumber" className="text-gray-300">
                    Order Number *
                  </Label>
                  <Input
                    id="orderNumber"
                    className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                    placeholder="Enter order number"
                  />
                </div>
                <div>
                  <Label htmlFor="buildId" className="text-gray-300">
                    Build ID
                  </Label>
                  <Input
                    id="buildId"
                    className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                    placeholder="Enter build ID"
                  />
                </div>
              </div>

              {/* Model and Name */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="model" className="text-gray-300">
                    Model *
                  </Label>
                  <Select value={selectedModel} onValueChange={setSelectedModel}>
                    <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                      <SelectValue placeholder="Select model" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-600">
                      <SelectItem value="verite-closed">Verite Closed</SelectItem>
                      <SelectItem value="verite-open">Verite Open</SelectItem>
                      <SelectItem value="atrium-closed">Atrium Closed</SelectItem>
                      <SelectItem value="atrium-open">Atrium Open</SelectItem>
                      <SelectItem value="aeolus">Aeolus</SelectItem>
                      <SelectItem value="eikon">Eikon</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="customerName" className="text-gray-300">
                    Name *
                  </Label>
                  <Input
                    id="customerName"
                    className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                    placeholder="Customer name"
                  />
                </div>
              </div>

              {/* Repair Category */}
              <div>
                <Label htmlFor="repairCategory" className="text-gray-300">
                  Repair Category *
                </Label>
                <Select value={repairCategory} onValueChange={setRepairCategory}>
                  <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                    <SelectValue placeholder="Select an option" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-600">
                    {repairCategories.map((category) => (
                      <SelectItem key={category} value={category.toLowerCase().replace(" ", "_")}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Photo Upload */}
              <div>
                <Label className="text-gray-300">Photos</Label>
                <div className="mt-2 border-2 border-dashed border-gray-600 rounded-lg p-8 text-center hover:border-gray-500 cursor-pointer">
                  <Upload className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="mt-4">
                    <p className="text-gray-400">Select or drag and drop</p>
                  </div>
                </div>
              </div>

              {/* What's Wrong */}
              <div>
                <Label htmlFor="whatsWrong" className="text-gray-300">
                  What's Wrong? *
                </Label>
                <Textarea
                  id="whatsWrong"
                  className="bg-gray-700 border-gray-600 text-white placeholder-gray-400 mt-2"
                  placeholder="Enter Note"
                  rows={4}
                />
              </div>

              {/* Location and Date */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="location" className="text-gray-300">
                    Location *
                  </Label>
                  <Select>
                    <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                      <SelectValue placeholder="Select Location" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-600">
                      <SelectItem value="workshop">Workshop</SelectItem>
                      <SelectItem value="qc">Quality Control</SelectItem>
                      <SelectItem value="shipping">Shipping</SelectItem>
                      <SelectItem value="customer">Customer Return</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="reportedOn" className="text-gray-300">
                    Reported on
                  </Label>
                  <Input
                    id="reportedOn"
                    type="date"
                    className="bg-gray-700 border-gray-600 text-white"
                    defaultValue="2025-05-28"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex justify-end">
                <Button className="bg-purple-600 hover:bg-purple-700 text-white px-8">Submit Repair</Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Sidebar - Model Groups */}
        <div className="w-80 p-6 border-l border-gray-700">
          <div className="space-y-4">
            <div className="flex space-x-2">
              <Button size="sm" className="bg-purple-600 hover:bg-purple-700 text-white">
                Group By Model
              </Button>
              <Button size="sm" variant="outline" className="border-gray-600 text-gray-300">
                List Oldest
              </Button>
            </div>

            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search Order ID"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-gray-700 border-gray-600 text-white placeholder-gray-400"
              />
            </div>

            <div className="space-y-2">
              <div className="grid grid-cols-5 gap-2 text-xs text-gray-400 font-medium">
                <div>Model</div>
                <div>Order Numb...</div>
                <div>Build ID</div>
                <div>Build status</div>
                <div>Wood type</div>
              </div>

              {modelGroups.map((group, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between py-2 px-3 bg-gray-800 rounded border border-gray-700"
                >
                  <div className="flex items-center space-x-2">
                    <span className="text-white">▶</span>
                    <Badge className={`${group.color} text-white`}>{group.name}</Badge>
                    <span className="text-gray-400">({group.count})</span>
                  </div>
                </div>
              ))}

              <div className="text-center text-gray-400 text-sm mt-4">462 results</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
