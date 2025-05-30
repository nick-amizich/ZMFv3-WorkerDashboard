"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { CheckCircle, XCircle, ArrowLeft, Package, AlertTriangle } from "lucide-react"

interface QCItem {
  id: string
  label: string
  description: string
  status: "pending" | "good" | "needs_work"
}

interface QCRepair {
  id: string
  repairNumber: string
  model: string
  customerName: string
  woodType?: string
  qcItems: QCItem[]
}

const defaultQCItems: Omit<QCItem, "status">[] = [
  {
    id: "listening_test",
    label: "Listening Test",
    description: "Compare sound signature to a reference unit",
  },
  {
    id: "cosmetic_review",
    label: "Cosmetic Review",
    description: "Check for blemishes, fingerprints, mismatched grain or finish",
  },
  {
    id: "measurement_test",
    label: "Measurement Test",
    description: "Confirm measurements match acoustic standards",
  },
  {
    id: "listening_confirmation",
    label: "Listening Test Confirmation",
    description: "Ensure no audible buzzes, rattles, or imperfections",
  },
  {
    id: "debris_check",
    label: "Debris Check",
    description: "Confirm headphone is free of debris",
  },
  {
    id: "headband_alignment",
    label: "Headband Alignment",
    description: "Verify headband is properly bent",
  },
  {
    id: "fit_test",
    label: "Fit Test",
    description: "Check headband tension for comfort and security",
  },
  {
    id: "rod_tension",
    label: "Rod Tension",
    description: "Confirm rod tension is correct and consistent",
  },
  {
    id: "surface_cleanliness",
    label: "Surface Cleanliness",
    description: "Ensure no thread locker or touch-up paint is visible",
  },
]

export default function QCSection({ repairs }: { repairs: any[] }) {
  const { toast } = useToast()
  const [qcRepairs, setQcRepairs] = useState<QCRepair[]>(
    repairs.map((repair) => ({
      id: repair.id,
      repairNumber: repair.repairNumber,
      model: repair.model,
      customerName: repair.customerName,
      woodType: repair.woodType,
      qcItems: defaultQCItems.map((item) => ({ ...item, status: "pending" as const })),
    })),
  )

  const updateQCItem = (repairId: string, itemId: string, status: "good" | "needs_work") => {
    setQcRepairs((prev) =>
      prev.map((repair) =>
        repair.id === repairId
          ? {
              ...repair,
              qcItems: repair.qcItems.map((item) => (item.id === itemId ? { ...item, status } : item)),
            }
          : repair,
      ),
    )
  }

  const getQCStatus = (repair: QCRepair) => {
    const completedItems = repair.qcItems.filter((item) => item.status !== "pending")
    const failedItems = repair.qcItems.filter((item) => item.status === "needs_work")
    const allCompleted = completedItems.length === repair.qcItems.length

    return {
      completed: completedItems.length,
      total: repair.qcItems.length,
      failed: failedItems.length,
      allCompleted,
      hasFailures: failedItems.length > 0,
    }
  }

  const handleReturnToRepairs = (repairId: string) => {
    toast({
      title: "Returned to Repairs",
      description: "Headphone has been returned to the repair queue",
    })
    // In a real app, you would update the repair status
    setQcRepairs((prev) => prev.filter((repair) => repair.id !== repairId))
  }

  const handleMarkAsRepaired = (repairId: string) => {
    // Reset all failed items to pending for re-check
    setQcRepairs((prev) =>
      prev.map((repair) =>
        repair.id === repairId
          ? {
              ...repair,
              qcItems: repair.qcItems.map((item) =>
                item.status === "needs_work" ? { ...item, status: "pending" as const } : item,
              ),
            }
          : repair,
      ),
    )

    toast({
      title: "Issues Repaired",
      description: "Please re-check the previously failed items",
    })
  }

  const handlePushToShipping = (repairId: string) => {
    toast({
      title: "Pushed to Shipping",
      description: "Headphone is ready to ship",
    })
    // In a real app, you would update the repair status to "shipped"
    setQcRepairs((prev) => prev.filter((repair) => repair.id !== repairId))
  }

  if (qcRepairs.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <CheckCircle className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Repairs Ready for QC</h3>
          <p className="text-muted-foreground">Completed repairs will appear here for quality control review.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {qcRepairs.map((repair) => {
        const status = getQCStatus(repair)
        return (
          <Card key={repair.id} className="border-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center space-x-2">
                    <span>{repair.repairNumber}</span>
                    <Badge variant="outline">{repair.model}</Badge>
                    {repair.woodType && <Badge variant="secondary">{repair.woodType}</Badge>}
                  </CardTitle>
                  <p className="text-muted-foreground">Customer: {repair.customerName}</p>
                </div>
                <div className="text-right">
                  <div className="text-sm text-muted-foreground">
                    Progress: {status.completed}/{status.total}
                  </div>
                  {status.hasFailures && (
                    <Badge variant="destructive" className="mt-1">
                      <AlertTriangle className="mr-1 h-3 w-3" />
                      {status.failed} Issues
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* QC Checklist */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {repair.qcItems.map((item) => (
                  <Card key={item.id} className="p-4">
                    <div className="space-y-3">
                      <div>
                        <h4 className="font-medium">{item.label}</h4>
                        <p className="text-sm text-muted-foreground">{item.description}</p>
                      </div>

                      <div className="flex space-x-4">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id={`${repair.id}-${item.id}-good`}
                            checked={item.status === "good"}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                updateQCItem(repair.id, item.id, "good")
                              }
                            }}
                          />
                          <Label
                            htmlFor={`${repair.id}-${item.id}-good`}
                            className="text-sm flex items-center space-x-1"
                          >
                            <CheckCircle className="h-3 w-3 text-green-600" />
                            <span>Good</span>
                          </Label>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id={`${repair.id}-${item.id}-needs-work`}
                            checked={item.status === "needs_work"}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                updateQCItem(repair.id, item.id, "needs_work")
                              }
                            }}
                          />
                          <Label
                            htmlFor={`${repair.id}-${item.id}-needs-work`}
                            className="text-sm flex items-center space-x-1"
                          >
                            <XCircle className="h-3 w-3 text-red-600" />
                            <span>Needs Work</span>
                          </Label>
                        </div>
                      </div>

                      {/* Status indicator */}
                      <div className="pt-2">
                        {item.status === "pending" && (
                          <Badge variant="outline" className="text-xs">
                            Pending
                          </Badge>
                        )}
                        {item.status === "good" && (
                          <Badge className="text-xs bg-green-100 text-green-800">
                            <CheckCircle className="mr-1 h-3 w-3" />
                            Passed
                          </Badge>
                        )}
                        {item.status === "needs_work" && (
                          <Badge variant="destructive" className="text-xs">
                            <XCircle className="mr-1 h-3 w-3" />
                            Failed
                          </Badge>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-2 pt-4 border-t">
                {!status.allCompleted && (
                  <div className="text-sm text-muted-foreground flex items-center">
                    Complete all QC checks to proceed
                  </div>
                )}

                {status.allCompleted && status.hasFailures && (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => handleReturnToRepairs(repair.id)}
                      className="bg-red-50 hover:bg-red-100 border-red-200"
                    >
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Put Headphone Back to Repairs
                    </Button>
                    <Button onClick={() => handleMarkAsRepaired(repair.id)} className="bg-blue-600 hover:bg-blue-700">
                      <CheckCircle className="mr-2 h-4 w-4" />I Repaired All Issues
                    </Button>
                  </>
                )}

                {status.allCompleted && !status.hasFailures && (
                  <Button onClick={() => handlePushToShipping(repair.id)} className="bg-green-600 hover:bg-green-700">
                    <Package className="mr-2 h-4 w-4" />
                    Push Headphone to Shipping
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
