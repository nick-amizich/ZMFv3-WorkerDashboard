"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { CheckCircle, XCircle, Camera, Clock, User, DollarSign } from "lucide-react"

export default function RepairDetail() {
  const [currentStep, setCurrentStep] = useState(2)
  const [repairActions, setRepairActions] = useState([
    { id: 1, category: "Driver Inspection", status: "good", notes: "Driver cone intact, no visible damage" },
    { id: 2, category: "Cable Testing", status: "needs_work", notes: "Intermittent connection at cup junction" },
    { id: 3, category: "Solder Joints", status: "needs_work", notes: "Oxidation visible on left driver terminal" },
    { id: 4, category: "Wood Finish", status: "good", notes: "No scratches or damage to wood surface" },
  ])

  const steps = [
    { number: 1, title: "Intake", active: false, completed: true },
    { number: 2, title: "Diagnosis", active: true, completed: false },
    { number: 3, title: "Repair", active: false, completed: false },
    { number: 4, title: "Testing", active: false, completed: false },
    { number: 5, title: "Complete", active: false, completed: false },
  ]

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">Repair Detail</h1>
            <div className="flex items-center space-x-4 mt-2">
              <span className="text-gray-400">Current Repair</span>
              <Badge className="bg-red-600 text-white">REP-2024-0134</Badge>
              <span className="text-gray-400">Order #26851 - Verite Closed - Sapele</span>
            </div>
          </div>
          <Button className="bg-red-600 hover:bg-red-700">Rush Priority</Button>
        </div>
      </div>

      <div className="p-6">
        {/* Progress Steps */}
        <Card className="bg-gray-800 border-gray-700 mb-6">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              {steps.map((step, index) => (
                <div key={step.number} className="flex items-center">
                  <div
                    className={`
                    w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium
                    ${
                      step.completed
                        ? "bg-green-600 text-white"
                        : step.active
                          ? "bg-purple-600 text-white"
                          : "bg-gray-600 text-gray-300"
                    }
                  `}
                  >
                    {step.completed ? <CheckCircle className="h-5 w-5" /> : step.number}
                  </div>
                  <div className="ml-2 text-sm">
                    <div className={step.active ? "text-white font-medium" : "text-gray-400"}>{step.title}</div>
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`w-16 h-0.5 mx-4 ${step.completed ? "bg-green-600" : "bg-gray-600"}`} />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-3 gap-6">
          {/* Main Diagnosis Panel */}
          <div className="col-span-2 space-y-6">
            {/* Customer Info */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <User className="mr-2 h-5 w-5" />
                  Customer Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-gray-400">Name:</span>
                    <span className="ml-2 text-white">John Smith</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Email:</span>
                    <span className="ml-2 text-white">john@example.com</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Order Date:</span>
                    <span className="ml-2 text-white">Dec 15, 2024</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Warranty:</span>
                    <Badge className="ml-2 bg-green-600">Active</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Diagnosis Checklist */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Diagnosis Checklist</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {repairActions.map((action) => (
                  <div key={action.id} className="border border-gray-700 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium text-white">{action.category}</h3>
                      <div className="flex items-center space-x-2">
                        <Badge className={action.status === "good" ? "bg-green-600" : "bg-red-600"}>
                          {action.status === "good" ? (
                            <>
                              <CheckCircle className="mr-1 h-3 w-3" />
                              Good
                            </>
                          ) : (
                            <>
                              <XCircle className="mr-1 h-3 w-3" />
                              Needs Work
                            </>
                          )}
                        </Badge>
                      </div>
                    </div>
                    <p className="text-gray-300 text-sm">{action.notes}</p>
                    <div className="flex space-x-2 mt-3">
                      <Button size="sm" variant="outline" className="border-gray-600 text-gray-300">
                        <Camera className="mr-1 h-3 w-3" />
                        Add Photo
                      </Button>
                      <Button size="sm" variant="outline" className="border-gray-600 text-gray-300">
                        Update Status
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Repair Notes */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Repair Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                  placeholder="Add detailed repair notes..."
                  rows={4}
                />
                <div className="flex justify-between items-center mt-4">
                  <div className="flex space-x-2">
                    <Button size="sm" variant="outline" className="border-gray-600 text-gray-300">
                      Save Draft
                    </Button>
                    <Button size="sm" variant="outline" className="border-gray-600 text-gray-300">
                      Request Parts
                    </Button>
                  </div>
                  <Button className="bg-purple-600 hover:bg-purple-700">Complete Diagnosis</Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-6">
            {/* Time Tracking */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <Clock className="mr-2 h-5 w-5" />
                  Time Tracking
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Time Elapsed:</span>
                    <span className="text-white font-medium">2h 15m</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Assigned To:</span>
                    <span className="text-white">Jake M.</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Started:</span>
                    <span className="text-white">Today 9:30 AM</span>
                  </div>
                  <Button size="sm" className="w-full bg-yellow-600 hover:bg-yellow-700">
                    Pause Timer
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Cost Estimate */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <DollarSign className="mr-2 h-5 w-5" />
                  Cost Estimate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Labor:</span>
                    <span className="text-white">$75.00</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Parts:</span>
                    <span className="text-white">$45.00</span>
                  </div>
                  <div className="border-t border-gray-700 pt-2 flex justify-between font-medium">
                    <span className="text-white">Total:</span>
                    <span className="text-white">$120.00</span>
                  </div>
                  <Button size="sm" className="w-full bg-green-600 hover:bg-green-700">
                    Send Quote to Customer
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Button size="sm" variant="outline" className="w-full border-gray-600 text-gray-300">
                    View Order History
                  </Button>
                  <Button size="sm" variant="outline" className="w-full border-gray-600 text-gray-300">
                    Contact Customer
                  </Button>
                  <Button size="sm" variant="outline" className="w-full border-gray-600 text-gray-300">
                    Escalate to Manager
                  </Button>
                  <Button size="sm" variant="outline" className="w-full border-gray-600 text-gray-300">
                    Print Work Order
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
