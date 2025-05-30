export interface RepairOrder {
  id: string
  repairNumber: string
  repairSource: "customer" | "internal"
  orderType: "customer_return" | "warranty" | "internal_qc"
  originalOrderNumber?: string
  customerName: string
  customerEmail: string
  customerPhone?: string
  model: string
  serialNumber?: string
  woodType?: string
  status: "intake" | "diagnosed" | "approved" | "in_progress" | "testing" | "completed" | "shipped"
  priority: "standard" | "rush"
  repairType: "production" | "finishing" | "sonic"
  estimatedCost?: number
  customerApproved?: boolean
  receivedDate: string
  completedDate?: string
  assignedTo?: string
  isFirstTime?: boolean
  customerNote?: string
  issues: RepairIssue[]
  actions: RepairAction[]
  timeSpent: number
  photos: string[]
  notifications?: RepairNotification[]
}

export interface RepairIssue {
  id: string
  description: string
}

export interface RepairAction {
  id: string
  description: string
}

export interface RepairNotification {
  id: string
  message: string
}
