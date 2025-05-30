"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { Package, Truck, Search, Calendar, User } from "lucide-react"

interface ReadyToShipRepair {
  id: string
  repairNumber: string
  model: string
  customerName: string
  customerEmail: string
  woodType?: string
  completedDate: string
  qcPassedDate: string
  trackingNumber?: string
}

export default function ReadyToShipSection({ repairs }: { repairs: ReadyToShipRepair[] }) {
  const { toast } = useToast()
  const [searchTerm, setSearchTerm] = useState("")
  const [trackingNumbers, setTrackingNumbers] = useState<{ [key: string]: string }>({})

  // Mock data for demonstration
  const mockReadyToShipRepairs: ReadyToShipRepair[] = [
    {
      id: "ship-1",
      repairNumber: "REP-2024-0128",
      model: "Verite Closed",
      customerName: "Alice Johnson",
      customerEmail: "alice@example.com",
      woodType: "Cherry",
      completedDate: "2024-01-20T14:30:00Z",
      qcPassedDate: "2024-01-20T16:45:00Z",
    },
    {
      id: "ship-2",
      repairNumber: "REP-2024-0125",
      model: "Atrium Open",
      customerName: "Bob Wilson",
      customerEmail: "bob@example.com",
      woodType: "Sapele",
      completedDate: "2024-01-19T11:20:00Z",
      qcPassedDate: "2024-01-19T15:30:00Z",
      trackingNumber: "1Z999AA1234567890",
    },
  ]

  const allRepairs = [...mockReadyToShipRepairs, ...repairs]

  const filteredRepairs = allRepairs.filter(
    (repair) =>
      searchTerm === "" ||
      repair.repairNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      repair.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      repair.model.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const handleAddTracking = (repairId: string) => {
    const trackingNumber = trackingNumbers[repairId]
    if (!trackingNumber?.trim()) {
      toast({
        title: "Error",
        description: "Please enter a tracking number",
        variant: "destructive",
      })
      return
    }

    toast({
      title: "Tracking Added",
      description: `Tracking number ${trackingNumber} added and customer notified`,
    })

    // In a real app, you would update the repair with tracking info and send email
    setTrackingNumbers((prev) => ({ ...prev, [repairId]: "" }))
  }

  const handleMarkAsShipped = (repairId: string) => {
    toast({
      title: "Marked as Shipped",
      description: "Repair has been marked as shipped and customer notified",
    })
    // In a real app, you would update the repair status to "shipped"
  }

  if (filteredRepairs.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Package className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Repairs Ready to Ship</h3>
          <p className="text-muted-foreground">Repairs that pass QC will appear here ready for shipping.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search repairs ready to ship..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Badge variant="outline" className="px-3 py-1">
          {filteredRepairs.length} Ready to Ship
        </Badge>
      </div>

      {/* Repairs List */}
      <div className="space-y-4">
        {filteredRepairs.map((repair) => (
          <Card key={repair.id} className="border-green-200 bg-green-50">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center space-x-2">
                    <span>{repair.repairNumber}</span>
                    <Badge className="bg-green-100 text-green-800">{repair.model}</Badge>
                    {repair.woodType && <Badge variant="secondary">{repair.woodType}</Badge>}
                  </CardTitle>
                  <div className="flex items-center space-x-4 mt-2 text-sm text-muted-foreground">
                    <div className="flex items-center space-x-1">
                      <User className="h-3 w-3" />
                      <span>{repair.customerName}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Calendar className="h-3 w-3" />
                      <span>QC Passed: {new Date(repair.qcPassedDate).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  {repair.trackingNumber ? (
                    <Badge className="bg-blue-100 text-blue-800">
                      <Truck className="mr-1 h-3 w-3" />
                      Shipped
                    </Badge>
                  ) : (
                    <Badge className="bg-green-100 text-green-800">
                      <Package className="mr-1 h-3 w-3" />
                      Ready to Ship
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <div className="text-sm">
                    <span className="font-medium">Customer Email:</span> {repair.customerEmail}
                  </div>
                  {repair.trackingNumber && (
                    <div className="text-sm">
                      <span className="font-medium">Tracking:</span> {repair.trackingNumber}
                    </div>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  {!repair.trackingNumber && (
                    <>
                      <div className="flex items-center space-x-2">
                        <Label htmlFor={`tracking-${repair.id}`} className="text-sm">
                          Tracking #:
                        </Label>
                        <Input
                          id={`tracking-${repair.id}`}
                          placeholder="Enter tracking number"
                          value={trackingNumbers[repair.id] || ""}
                          onChange={(e) => setTrackingNumbers((prev) => ({ ...prev, [repair.id]: e.target.value }))}
                          className="w-48"
                        />
                      </div>
                      <Button onClick={() => handleAddTracking(repair.id)} className="bg-blue-600 hover:bg-blue-700">
                        <Truck className="mr-2 h-4 w-4" />
                        Add Tracking
                      </Button>
                    </>
                  )}

                  {repair.trackingNumber && (
                    <Button
                      variant="outline"
                      onClick={() => handleMarkAsShipped(repair.id)}
                      className="border-green-300 text-green-700 hover:bg-green-100"
                    >
                      <Package className="mr-2 h-4 w-4" />
                      Mark as Shipped
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
