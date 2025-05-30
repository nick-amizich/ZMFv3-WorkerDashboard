"use client"

import type React from "react"
import { createContext, useState, useContext } from "react"
import { v4 as uuidv4 } from "uuid"

// Define the Repair type
export type Repair = {
  id: string
  dateReported: string
  dateCompleted?: string
  description: string
  serialNumber?: string
  status: "reported" | "in progress" | "completed"
  isFirstTime?: boolean
}

export type Issue = {
  id: string
  repairOrderId: string
  category: string
  specificIssue: string
  severity: string
  photoUrls: string[]
  createdAt: string
}

export type Action = {
  id: string
  repairOrderId: string
  actionType: string
  actionDescription: string
  partsUsed: { partName: string; quantity: number; cost: number }[]
  beforePhotos: string[]
  afterPhotos: string[]
  completedAt: string
}

export type RepairOrder = {
  id: string
  repairNumber: string
  repairSource: string
  orderType: string
  originalOrderNumber?: string
  customerName: string
  customerEmail: string
  customerPhone?: string
  model: string
  serialNumber?: string
  woodType: string
  status: string
  priority: "standard" | "rush"
  repairType: string
  location?: string
  estimatedCost?: number
  customerApproved: boolean
  receivedDate: string
  assignedTo: string
  isFirstTime: boolean
  customerNote?: string
  issues: Issue[]
  actions: Action[]
  timeSpent?: number
  photos: string[]
}

// Define the context type
type RepairContextType = {
  repairs: RepairOrder[]
  addRepair: (repair: Omit<Repair, "id" | "status" | "isFirstTime">) => void
  updateRepair: (repair: RepairOrder) => void
  deleteRepair: (id: string) => void
}

// Create the context
const RepairContext = createContext<RepairContextType | undefined>(undefined)

// Mock data
const mockRepairs: RepairOrder[] = [
  {
    id: "1",
    repairNumber: "REP-2024-0134",
    repairSource: "customer",
    orderType: "warranty",
    originalOrderNumber: "26851",
    customerName: "John Smith",
    customerEmail: "john@example.com",
    customerPhone: "+1-555-0123",
    model: "Verite Closed",
    serialNumber: "VC-2024-001234",
    woodType: "Sapele",
    status: "testing",
    priority: "rush",
    repairType: "finishing",
    location: "Repair Wall",
    estimatedCost: 150,
    customerApproved: true,
    receivedDate: "2024-01-15T10:00:00Z",
    assignedTo: "Jake M.",
    isFirstTime: true,
    customerNote:
      "The left driver started cutting out after about 6 months of use. It happens mostly when listening to bass-heavy music. I've tried different cables and sources, same issue.",
    issues: [
      {
        id: "issue-1",
        repairOrderId: "1",
        category: "driver",
        specificIssue: "Driver cutting out intermittently",
        severity: "functional",
        photoUrls: [],
        createdAt: "2024-01-15T10:00:00Z",
      },
    ],
    actions: [
      {
        id: "action-1",
        repairOrderId: "1",
        actionType: "replace",
        actionDescription: "Replaced left driver due to intermittent connection",
        partsUsed: [{ partName: "50mm Beryllium Driver", quantity: 1, cost: 85 }],
        beforePhotos: [],
        afterPhotos: [],
        completedAt: "2024-01-16T14:30:00Z",
      },
    ],
    timeSpent: 135,
    photos: [],
  },
  {
    id: "2",
    repairNumber: "REP-2024-0133",
    repairSource: "internal",
    orderType: "internal_qc",
    customerName: "Internal QC",
    customerEmail: "qc@zmf.com",
    model: "Atrium Open",
    woodType: "Cherry",
    status: "testing",
    priority: "standard",
    repairType: "production",
    location: "QC Room",
    receivedDate: "2024-01-14T14:30:00Z",
    assignedTo: "Tony S.",
    customerApproved: true,
    isFirstTime: true,
    issues: [
      {
        id: "issue-2",
        repairOrderId: "2",
        category: "wood_finish",
        specificIssue: "Small scratch on right cup",
        severity: "cosmetic",
        photoUrls: [],
        createdAt: "2024-01-14T14:30:00Z",
      },
    ],
    actions: [
      {
        id: "action-2",
        repairOrderId: "2",
        actionType: "refinish",
        actionDescription: "Sanded and refinished right cup to remove scratch",
        partsUsed: [],
        beforePhotos: [],
        afterPhotos: [],
        completedAt: "2024-01-15T16:00:00Z",
      },
    ],
    timeSpent: 85,
    photos: [],
  },
  {
    id: "3",
    repairNumber: "REP-2024-0132",
    repairSource: "customer",
    orderType: "customer_return",
    originalOrderNumber: "26849",
    customerName: "Sarah Johnson",
    customerEmail: "sarah@example.com",
    customerPhone: "+1-555-0456",
    model: "Aeolus",
    serialNumber: "AE-2024-001567",
    woodType: "Stabilized",
    status: "in_progress",
    priority: "rush",
    repairType: "finishing",
    location: "Finishing Area",
    estimatedCost: 85,
    customerApproved: true,
    receivedDate: "2024-01-13T09:15:00Z",
    assignedTo: "Keith B.",
    isFirstTime: false,
    customerNote:
      "Please be very careful with the wood finish - this is a limited edition stabilized wood that can't be replaced. The issue is a small chip on the right cup near the cable entry.",
    issues: [],
    actions: [],
    timeSpent: 45,
    photos: [],
  },
  {
    id: "4",
    repairNumber: "REP-2024-0131",
    repairSource: "customer",
    orderType: "warranty",
    originalOrderNumber: "26847",
    customerName: "David Chen",
    customerEmail: "david@example.com",
    customerPhone: "+1-555-0789",
    model: "Verite Open",
    serialNumber: "VO-2024-001890",
    woodType: "Cherry",
    status: "testing",
    priority: "standard",
    repairType: "sonic",
    location: "In Repair",
    estimatedCost: 75,
    customerApproved: true,
    receivedDate: "2024-01-12T11:00:00Z",
    assignedTo: "Sarah L.",
    isFirstTime: true,
    customerNote:
      "The headphones sound different from when I first got them. The bass seems less present and the highs are a bit harsh. I compared them to my friend's identical pair and there's definitely a difference.",
    issues: [
      {
        id: "issue-4",
        repairOrderId: "4",
        category: "electronics",
        specificIssue: "Frequency response measurement out of spec",
        severity: "functional",
        photoUrls: [],
        createdAt: "2024-01-12T11:00:00Z",
      },
    ],
    actions: [
      {
        id: "action-4",
        repairOrderId: "4",
        actionType: "adjust",
        actionDescription: "Adjusted driver positioning and recalibrated",
        partsUsed: [],
        beforePhotos: [],
        afterPhotos: [],
        completedAt: "2024-01-13T15:30:00Z",
      },
    ],
    timeSpent: 90,
    photos: [],
  },
]

// Add isFirstTime property to each repair based on serial number frequency
// const serialCounts = {}
// mockRepairs.forEach((repair) => {
//   if (repair.serialNumber) {
//     serialCounts[repair.serialNumber] = (serialCounts[repair.serialNumber] || 0) + 1
//   }
// })

// // Update each repair with isFirstTime flag
// const repairsWithFirstTime = mockRepairs.map((repair) => ({
//   ...repair,
//   isFirstTime: repair.serialNumber ? serialCounts[repair.serialNumber] === 1 : true,
// }))

// Create the provider
export const RepairProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [repairs, setRepairs] = useState<RepairOrder[]>(mockRepairs)

  const addRepair = (repair: Omit<Repair, "id" | "status" | "isFirstTime">) => {
    const newRepair: Repair = {
      id: uuidv4(),
      dateReported: repair.dateReported,
      description: repair.description,
      serialNumber: repair.serialNumber,
      status: "reported",
      isFirstTime: true, // Default to true, can be updated later
    }
    // setRepairs([...repairs, newRepair])
    setRepairs((prevRepairs) => [...prevRepairs, newRepair as any])
  }

  const updateRepair = (repair: RepairOrder) => {
    setRepairs(repairs.map((r) => (r.id === repair.id ? repair : r)))
  }

  const deleteRepair = (id: string) => {
    setRepairs(repairs.filter((repair) => repair.id !== id))
  }

  const value: RepairContextType = {
    repairs,
    addRepair,
    updateRepair,
    deleteRepair,
  }

  return <RepairContext.Provider value={value}>{children}</RepairContext.Provider>
}

// Create a custom hook to use the context
export const useRepairContext = () => {
  const context = useContext(RepairContext)
  if (!context) {
    throw new Error("useRepairContext must be used within a RepairProvider")
  }
  return context
}
